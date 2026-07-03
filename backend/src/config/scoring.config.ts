/**
 * Scoring Configuration — All matchmaking parameters in one place.
 * No hardcoded values in engine code. Every weight, threshold, and timing
 * is defined here and can be adjusted without code changes.
 */

export const SCORING_CONFIG = {
  /** Factor weights — must sum to 1.0 */
  weights: {
    lookingFor: 0.25,
    gender:     0.05,
    language:   0.20,
    location:   0.15,
    interests:  0.20,
    waitingTime:0.10,
    diversity:  0.05,
  },

  /** Location scoring table */
  location: {
    sameCity: 100,
    sameDistrict: 90,
    sameState: 75,
    sameCountry: 60,
    differentCountry: 20,
    unknown: 10,
  },

  /** Language scoring table */
  language: {
    primaryMatch: 100,
    secondaryMatch: 80,
    oneShared: 60,
    noMatch: 20,
  },

  /** Interest scoring by shared count (index = count, value = score, 5+ capped) */
  interests: [0, 20, 40, 60, 80, 100],

  /** Waiting time bonus tiers */
  waitingBonus: [
    { maxSec: 10,       bonus: 0 },
    { maxSec: 20,       bonus: 10 },
    { maxSec: 40,       bonus: 20 },
    { maxSec: 60,       bonus: 30 },
    { maxSec: 120,      bonus: 45 },
    { maxSec: Infinity,  bonus: 60 },
  ],

  /** Score penalties */
  penalties: {
    recentPartner: -30,
    reportedUser: -80,
  },

  /** Confidence level thresholds */
  confidence: {
    instant:    { min: 90, label: 'Instant Match' },
    very_good:  { min: 80, label: 'Very Good' },
    good:       { min: 70, label: 'Good' },
    acceptable: { min: 50, label: 'Acceptable' },
    fallback:   { min: 0,  label: 'Fallback' },
  },

  /** Adaptive relaxation — threshold decreases as wait time increases */
  relaxation: [
    { maxSec: 15,       minScore: 70 },
    { maxSec: 30,       minScore: 50 },
    { maxSec: 60,       minScore: 30 },
    { maxSec: 120,      minScore: 15 },
    { maxSec: Infinity,  minScore: 0 },
  ],

  /** Reservation settings */
  reservation: {
    timeoutMs: 5000,
    maxRetries: 2,
  },

  /** Heartbeat settings */
  heartbeat: {
    intervalMs: 5000,
    timeoutMs: 15000,
  },

  /** READY handshake settings */
  ready: {
    timeoutMs: 10000,
  },

  /** Signaling ACK settings */
  signaling: {
    ackTimeoutMs: 3000,
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

export type ScoringConfig = typeof SCORING_CONFIG;
