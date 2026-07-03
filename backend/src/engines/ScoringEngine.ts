/**
 * Scoring Engine — Pure computation engine for match quality scoring.
 *
 * Responsibilities:
 * - Calculate weighted scores between two candidate profiles
 * - Determine match confidence levels
 * - Produce detailed scoring breakdowns for debugging
 *
 * Design:
 * - Zero side effects — no database, no I/O
 * - All weights and thresholds from ScoringConfig
 * - Every factor returns raw (0-100), weighted, and human-readable reason
 * - Extensible — add new factors by adding to the config weights
 */

import type {
  CandidateProfile,
  ScoringContext,
  ScoringResult,
  FactorResult,
  MatchConfidence,
} from '../types/index.js';
import type { ScoringConfig } from '../config/scoring.config.js';

export class ScoringEngine {
  private static readonly ENGINE = 'Scoring';

  constructor(private config: ScoringConfig) {}

  /**
   * Score a candidate against the current user.
   * Returns a ScoringResult with total score, confidence level, and full breakdown.
   */
  score(
    self: CandidateProfile,
    candidate: CandidateProfile,
    context: ScoringContext
  ): ScoringResult {
    const breakdown: FactorResult[] = [];
    const weights = this.config.weights;

    // Run all scoring factors
    breakdown.push(this.scoreLookingFor(self, candidate, weights.lookingFor));
    breakdown.push(this.scoreGender(self, candidate, weights.gender));
    breakdown.push(this.scoreLanguage(self, candidate, weights.language));
    breakdown.push(this.scoreLocation(self, candidate, weights.location));
    breakdown.push(this.scoreInterests(self, candidate, weights.interests));
    breakdown.push(this.scoreWaitingTime(candidate, context.waitingSeconds, weights.waitingTime));
    breakdown.push(this.scoreDiversity(weights.diversity));

    // Sum weighted scores
    let totalScore = breakdown.reduce((sum, f) => sum + f.weighted, 0);

    // Apply penalties
    const penalties = this.applyPenalties(self, candidate, context);
    for (const penalty of penalties) {
      breakdown.push(penalty);
      totalScore += penalty.weighted;
    }

    // Clamp to 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      confidence: this.getConfidence(totalScore),
      breakdown,
      candidateSessionId: candidate.sessionId,
    };
  }

  /**
   * Map a numeric score to a confidence level.
   */
  getConfidence(totalScore: number): MatchConfidence {
    const { confidence } = this.config;
    if (totalScore >= confidence.instant.min) return 'instant';
    if (totalScore >= confidence.very_good.min) return 'very_good';
    if (totalScore >= confidence.good.min) return 'good';
    if (totalScore >= confidence.acceptable.min) return 'acceptable';
    return 'fallback';
  }

  /**
   * Get the minimum acceptable score based on how long the user has been waiting.
   * As wait time increases, the threshold decreases (adaptive relaxation).
   */
  getAdaptiveThreshold(waitingSeconds: number): number {
    for (const tier of this.config.relaxation) {
      if (waitingSeconds <= tier.maxSec) {
        return tier.minScore;
      }
    }
    return 0;
  }

  // ─── Scoring Factors ─────────────────────────────────────

  /**
   * Score based on mutual "looking for" preferences.
   * Both want each other → 100, one-way match → 50, incompatible → 0, no preference → 70
   */
  private scoreLookingFor(
    self: CandidateProfile,
    candidate: CandidateProfile,
    weight: number
  ): FactorResult {
    const selfLooking = self.lookingFor || [];
    const candidateLooking = candidate.lookingFor || [];

    // If neither has a preference, neutral score
    if (selfLooking.length === 0 && candidateLooking.length === 0) {
      return this.result('lookingFor', 70, weight, 'Neither has preference — neutral');
    }

    const selfWantsCandidate =
      selfLooking.length === 0 ||
      (candidate.gender ? selfLooking.includes(candidate.gender) : true);
    const candidateWantsSelf =
      candidateLooking.length === 0 ||
      (self.gender ? candidateLooking.includes(self.gender) : true);

    if (selfWantsCandidate && candidateWantsSelf) {
      return this.result('lookingFor', 100, weight, 'Mutual preference match');
    }
    if (selfWantsCandidate || candidateWantsSelf) {
      return this.result('lookingFor', 50, weight, 'One-way preference match');
    }
    return this.result('lookingFor', 0, weight, 'Incompatible preferences');
  }

  /**
   * Score based on gender match with looking-for preferences.
   */
  private scoreGender(
    self: CandidateProfile,
    candidate: CandidateProfile,
    weight: number
  ): FactorResult {
    if (!self.gender || !candidate.gender) {
      return this.result('gender', 50, weight, 'Gender not specified');
    }

    const selfLooking = self.lookingFor || [];
    const candidateLooking = candidate.lookingFor || [];

    const selfMatch =
      selfLooking.length === 0 || selfLooking.includes(candidate.gender);
    const candidateMatch =
      candidateLooking.length === 0 || candidateLooking.includes(self.gender);

    if (selfMatch && candidateMatch) {
      return this.result('gender', 100, weight, `Both genders match preferences`);
    }
    if (selfMatch || candidateMatch) {
      return this.result('gender', 40, weight, 'Partial gender match');
    }
    return this.result('gender', 0, weight, 'Gender mismatch');
  }

  /**
   * Score based on shared languages.
   * Primary match (first language shared) → 100, any shared → 60, none → 20
   */
  private scoreLanguage(
    self: CandidateProfile,
    candidate: CandidateProfile,
    weight: number
  ): FactorResult {
    const selfLangs = self.languages || [];
    const candidateLangs = candidate.languages || [];
    const { language } = this.config;

    if (selfLangs.length === 0 || candidateLangs.length === 0) {
      return this.result('language', language.oneShared, weight, 'Language not specified');
    }

    // Check primary (first language) match
    if (selfLangs[0] && candidateLangs[0] && selfLangs[0] === candidateLangs[0]) {
      return this.result('language', language.primaryMatch, weight, `Primary language match: ${selfLangs[0]}`);
    }

    // Check secondary match (first language of one matches any of other)
    const selfPrimary = selfLangs[0];
    const candidatePrimary = candidateLangs[0];
    if (
      (selfPrimary && candidateLangs.includes(selfPrimary)) ||
      (candidatePrimary && selfLangs.includes(candidatePrimary))
    ) {
      return this.result('language', language.secondaryMatch, weight, 'Secondary language match');
    }

    // Check any shared language
    const shared = selfLangs.filter((l) => candidateLangs.includes(l));
    if (shared.length > 0) {
      return this.result('language', language.oneShared, weight, `Shared language: ${shared[0]}`);
    }

    return this.result('language', language.noMatch, weight, 'No shared languages');
  }

  /**
   * Score based on geographic proximity.
   * Same city → 100, same district → 90, same state → 75, same country → 60
   */
  private scoreLocation(
    self: CandidateProfile,
    candidate: CandidateProfile,
    weight: number
  ): FactorResult {
    const { location } = this.config;

    // If location data is missing for either
    if (!self.country && !candidate.country) {
      return this.result('location', location.unknown, weight, 'Location unknown for both');
    }

    if (self.city && candidate.city && self.city === candidate.city) {
      return this.result('location', location.sameCity, weight, `Same city: ${self.city}`);
    }

    if (self.district && candidate.district && self.district === candidate.district) {
      return this.result('location', location.sameDistrict, weight, `Same district: ${self.district}`);
    }

    if (self.state && candidate.state && self.state === candidate.state) {
      return this.result('location', location.sameState, weight, `Same state: ${self.state}`);
    }

    if (self.country && candidate.country && self.country === candidate.country) {
      return this.result('location', location.sameCountry, weight, `Same country: ${self.country}`);
    }

    if (self.country && candidate.country) {
      return this.result('location', location.differentCountry, weight, 'Different countries');
    }

    return this.result('location', location.unknown, weight, 'Incomplete location data');
  }

  /**
   * Score based on shared interest tags.
   * More shared interests → higher score, capped at 5+.
   */
  private scoreInterests(
    self: CandidateProfile,
    candidate: CandidateProfile,
    weight: number
  ): FactorResult {
    const selfTags = self.interestTags || [];
    const candidateTags = candidate.interestTags || [];

    if (selfTags.length === 0 || candidateTags.length === 0) {
      return this.result('interests', 30, weight, 'No interests specified');
    }

    const selfSet = new Set(selfTags.map((t) => t.toLowerCase()));
    const shared = candidateTags.filter((t) => selfSet.has(t.toLowerCase()));
    const count = Math.min(shared.length, this.config.interests.length - 1);
    const raw = this.config.interests[count];

    return this.result(
      'interests',
      raw,
      weight,
      shared.length > 0
        ? `${shared.length} shared interest(s): ${shared.slice(0, 3).join(', ')}`
        : 'No shared interests'
    );
  }

  /**
   * Score bonus based on how long the candidate has been waiting.
   * Longer waiting → higher bonus to ensure fair queue times.
   */
  private scoreWaitingTime(
    candidate: CandidateProfile,
    _selfWaitingSeconds: number,
    weight: number
  ): FactorResult {
    if (!candidate.queueEnteredAt) {
      return this.result('waitingTime', 0, weight, 'No queue entry time');
    }

    const waitingSec = (Date.now() - new Date(candidate.queueEnteredAt).getTime()) / 1000;

    for (const tier of this.config.waitingBonus) {
      if (waitingSec <= tier.maxSec) {
        return this.result(
          'waitingTime',
          tier.bonus,
          weight,
          `Waiting ${Math.round(waitingSec)}s — tier bonus ${tier.bonus}`
        );
      }
    }

    // Should not reach here due to Infinity in last tier
    return this.result('waitingTime', 60, weight, `Long wait: ${Math.round(waitingSec)}s`);
  }

  /**
   * Small random diversity factor to break ties and ensure variety.
   */
  private scoreDiversity(weight: number): FactorResult {
    const raw = Math.round(Math.random() * 100);
    return this.result('diversity', raw, weight, 'Random diversity factor');
  }

  // ─── Penalties ────────────────────────────────────────────

  /**
   * Apply penalties for recent partners and reported users.
   */
  private applyPenalties(
    _self: CandidateProfile,
    candidate: CandidateProfile,
    context: ScoringContext
  ): FactorResult[] {
    const penalties: FactorResult[] = [];

    // Penalty for recent partner (avoid immediate re-match)
    if (context.recentPartnerIds.includes(candidate.sessionId)) {
      penalties.push({
        factor: 'penalty:recentPartner',
        raw: this.config.penalties.recentPartner,
        weighted: this.config.penalties.recentPartner,
        reason: 'Recently matched — avoid re-match',
      });
    }

    // Penalty for reported users
    if (context.reportedUserIds.includes(candidate.sessionId)) {
      penalties.push({
        factor: 'penalty:reportedUser',
        raw: this.config.penalties.reportedUser,
        weighted: this.config.penalties.reportedUser,
        reason: 'User has been reported',
      });
    }

    return penalties;
  }

  // ─── Helpers ──────────────────────────────────────────────

  /** Create a FactorResult with automatic weighted calculation */
  private result(factor: string, raw: number, weight: number, reason: string): FactorResult {
    return {
      factor,
      raw,
      weighted: Math.round(raw * weight * 100) / 100,
      reason,
    };
  }
}
