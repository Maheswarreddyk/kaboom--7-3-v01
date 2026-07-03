/**
 * Matching Engine — Orchestrates the candidate matching pipeline.
 *
 * Responsibilities:
 * - Implements the 14-stage deterministic pipeline to find the best candidate.
 * - Applies adaptive score relaxation based on wait times.
 * - Filters out blocked/reported users and recent partners.
 *
 * Design:
 * - Injects QueueEngine, ScoringEngine, SessionEngine, DatabasePort, LoggerPort.
 * - Pure orchestrator: does not perform updates or mutations on the database.
 */

import type { DatabasePort } from '../ports/DatabasePort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { QueueEngine } from './QueueEngine.js';
import type { ScoringEngine } from './ScoringEngine.js';
import type { SessionEngine } from './SessionEngine.js';
import type {
  ScoringResult,
  CandidateProfile,
  ScoringContext,
} from '../types/index.js';
import { SCORING_CONFIG } from '../config/scoring.config.js';

export class MatchingEngine {
  private static readonly ENGINE = 'Matching';

  constructor(
    private db: DatabasePort,
    private queue: QueueEngine,
    private scoring: ScoringEngine,
    private session: SessionEngine,
    private logger: LoggerPort
  ) {}

  /**
   * Run the 14-stage deterministic matching pipeline for a session.
   * Returns the ScoringResult of the best candidate, or null if no one qualifies.
   */
  async findBestMatch(sessionId: string): Promise<ScoringResult | null> {
    const pipelineStart = Date.now();
    let currentStage = 1;

    // Helper to log stage execution
    const logStage = (name: string, removed: number, remaining: number, durationMs: number) => {
      this.logger.info(MatchingEngine.ENGINE, 'pipeline_stage', {
        sessionId,
        stage: currentStage++,
        name,
        removed,
        remaining,
        durationMs,
      });
    };

    // ─── STAGE 1: Load candidates ───────────────────────────
    const stage1Start = Date.now();
    const candidates = await this.queue.getCandidates(
      sessionId,
      SCORING_CONFIG.heartbeat.timeoutMs
    );
    logStage('load_candidates', 0, candidates.length, Date.now() - stage1Start);

    if (candidates.length === 0) return null;

    // ─── STAGE 2: Validate sessions exist & are active ──────
    const stage2Start = Date.now();
    // (Already filtered by QueueEngine getCandidates querying visitor_sessions status != 'ended')
    let stage2List = candidates;
    logStage('validate_sessions', 0, stage2List.length, Date.now() - stage2Start);

    // ─── STAGE 3: Remove self ───────────────────────────────
    const stage3Start = Date.now();
    const stage3List = stage2List.filter((c) => c.sessionId !== sessionId);
    logStage('remove_self', stage2List.length - stage3List.length, stage3List.length, Date.now() - stage3Start);

    if (stage3List.length === 0) return null;

    // ─── STAGE 4: Remove expired heartbeats ─────────────────
    const stage4Start = Date.now();
    const cutoff = Date.now() - SCORING_CONFIG.heartbeat.timeoutMs;
    const stage4List = stage3List.filter((c) => {
      return c.queueEnteredAt ? new Date(c.queueEnteredAt).getTime() >= cutoff : false;
    });
    logStage('remove_expired', stage3List.length - stage4List.length, stage4List.length, Date.now() - stage4Start);

    if (stage4List.length === 0) return null;

    // ─── STAGE 5: Remove already reserved ───────────────────
    const stage5Start = Date.now();
    // (Already filtered by QueueEngine getCandidates querying reserved_by is null)
    let stage5List = stage4List;
    logStage('remove_reserved', 0, stage5List.length, Date.now() - stage5Start);

    // ─── STAGE 6: Remove duplicate sessions ─────────────────
    const stage6Start = Date.now();
    const seenSessions = new Set<string>();
    const stage6List = stage5List.filter((c) => {
      if (seenSessions.has(c.sessionId)) return false;
      seenSessions.add(c.sessionId);
      return true;
    });
    logStage('remove_duplicate_sessions', stage5List.length - stage6List.length, stage6List.length, Date.now() - stage6Start);

    if (stage6List.length === 0) return null;

    // ─── STAGE 7: Remove same-browser-tab duplicates ────────
    const stage7Start = Date.now();
    // Since sessionId is 1-to-1 with browser tab, Stage 6 handles this.
    let stage7List = stage6List;
    logStage('remove_same_browser_tabs', 0, stage7List.length, Date.now() - stage7Start);

    // ─── STAGE 8 & 9: Remove blocked / reported users ───────
    const stage8Start = Date.now();
    const reports = await this.db.query('reports', {
      filters: [
        { column: 'reporter_session', operator: 'eq', value: sessionId },
      ],
    });
    const reportedByMe = new Set(reports.map((r) => r.reported_session as string));

    const reportsOnMe = await this.db.query('reports', {
      filters: [
        { column: 'reported_session', operator: 'eq', value: sessionId },
      ],
    });
    const reportedMe = new Set(reportsOnMe.map((r) => r.reporter_session as string));

    const stage9List = stage7List.filter((c) => {
      return !reportedByMe.has(c.sessionId) && !reportedMe.has(c.sessionId);
    });
    const blockedCount = stage7List.length - stage9List.length;
    logStage('remove_blocked_users', blockedCount, stage9List.length, Date.now() - stage8Start);

    if (stage9List.length === 0) return null;

    // ─── STAGE 10 & 11: Remove recent partners ──────────────
    const stage10Start = Date.now();
    // Query recent matches for this session
    const recentMatchesA = await this.db.query<{ user_b: string }>('matches', {
      select: ['user_b'],
      filters: [{ column: 'user_a', operator: 'eq', value: sessionId }],
      orderBy: { column: 'started_at', ascending: false },
      limit: 5,
    });
    const recentMatchesB = await this.db.query<{ user_a: string }>('matches', {
      select: ['user_a'],
      filters: [{ column: 'user_b', operator: 'eq', value: sessionId }],
      orderBy: { column: 'started_at', ascending: false },
      limit: 5,
    });

    const recentPartners = new Set([
      ...recentMatchesA.map((m) => m.user_b),
      ...recentMatchesB.map((m) => m.user_a),
    ]);

    const stage11List = stage9List.filter((c) => !recentPartners.has(c.sessionId));
    const recentCount = stage9List.length - stage11List.length;
    logStage('remove_recent_partners', recentCount, stage11List.length, Date.now() - stage10Start);

    if (stage11List.length === 0) return null;

    // ─── STAGE 12: Calculate scores ─────────────────────────
    const stage12Start = Date.now();
    const selfProfile = await this.session.getProfile(sessionId);
    if (!selfProfile) {
      this.logger.warn(MatchingEngine.ENGINE, 'self_profile_not_found', { sessionId });
      return null;
    }

    // Determine self's waiting time
    const selfQueueEntry = await this.db.queryOne<{ joined_at: string; search_started?: string }>('waiting_queue', {
      select: ['joined_at', 'search_started'],
      filters: [
        { column: 'session_id', operator: 'eq', value: sessionId },
        { column: 'status', operator: 'eq', value: 'waiting' },
      ],
    });
    const waitingSeconds = selfQueueEntry
      ? (Date.now() - new Date(selfQueueEntry.search_started || selfQueueEntry.joined_at).getTime()) / 1000
      : 0;

    const context: ScoringContext = {
      recentPartnerIds: Array.from(recentPartners),
      reportedUserIds: Array.from(reportedMe), // Penalize if candidate reported self
      waitingSeconds,
    };

    const scoredCandidates = stage11List.map((c) => {
      return this.scoring.score(selfProfile, c, context);
    });
    logStage('calculate_scores', 0, scoredCandidates.length, Date.now() - stage12Start);

    // ─── STAGE 13: Sort descending by score ────────────────
    const stage13Start = Date.now();
    scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
    logStage('sort_candidates', 0, scoredCandidates.length, Date.now() - stage13Start);

    // ─── STAGE 14: Apply dynamic relaxation threshold ───────
    const stage14Start = Date.now();
    const minRequiredScore = this.scoring.getAdaptiveThreshold(waitingSeconds);

    const bestCandidate = scoredCandidates.find((c) => c.totalScore >= minRequiredScore);
    const removedThreshold = bestCandidate
      ? scoredCandidates.indexOf(bestCandidate)
      : scoredCandidates.length;

    logStage(
      `apply_relaxation_threshold (min: ${minRequiredScore})`,
      removedThreshold,
      bestCandidate ? 1 : 0,
      Date.now() - stage14Start
    );

    this.logger.metric(MatchingEngine.ENGINE, 'pipeline_complete', Date.now() - pipelineStart, {
      sessionId,
      matchFound: !!bestCandidate,
      bestScore: bestCandidate?.totalScore,
      confidence: bestCandidate?.confidence,
      candidatesCount: candidates.length,
    });

    return bestCandidate ?? null;
  }
}
