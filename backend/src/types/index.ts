export type SessionStatus = 'active' | 'waiting' | 'matched' | 'ended';
export type QueueStatus = 'waiting' | 'matched' | 'left' | 'expired';
export type MatchEndReason = 'next' | 'leave' | 'disconnect' | 'report' | 'timeout' | 'error';
export type ReportReason = 'spam' | 'nudity' | 'abuse' | 'harassment' | 'other';
export type ConnectionEvent =
  | 'session_start'
  | 'session_end'
  | 'queue_join'
  | 'queue_leave'
  | 'match_start'
  | 'match_end'
  | 'disconnect'
  | 'reconnect'
  | 'next'
  | 'report'
  | 'error'
  | 'reserved'
  | 'ready';

export interface VisitorSession {
  id: string;
  session_token: string;
  country: string | null;
  browser: string | null;
  device: string | null;
  platform: string | null;
  created_at: string;
  ended_at: string | null;
  status: SessionStatus;
}

export interface WaitingQueueEntry {
  id: string;
  session_id: string;
  joined_at: string;
  status: QueueStatus;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  ended_reason: MatchEndReason | null;
}

export interface Report {
  id: string;
  reporter_session: string;
  reported_session: string;
  reason: ReportReason;
  notes: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  session_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface ServerMetrics {
  id: string;
  active_users: number;
  waiting_users: number;
  matches_today: number;
  timestamp: string;
}

export interface ConnectionLog {
  id: string;
  session_id: string | null;
  event: ConnectionEvent;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface StartSessionRequest {
  country?: string;
  browser?: string;
  device?: string;
  platform?: string;
}

export interface ReportRequest {
  reporterSessionId: string;
  reportedSessionId: string;
  reason: ReportReason;
  notes?: string;
}

export interface FeedbackRequest {
  sessionId: string;
  rating: number;
  feedback?: string;
}

export interface StatsResponse {
  activeUsers: number;
  waitingUsers: number;
  matchesToday: number;
  onlineNow: number;
}

export interface ConnectedUser {
  socketId: string;
  sessionId: string;
  sessionToken: string;
  joinedQueueAt?: Date;
  currentMatchId?: string;
  partnerSessionId?: string;
  lastPartnerSessionId?: string;
  gender?: string;
  lookingFor?: string[];
  languages?: string[];
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  interestTags?: string[];
  queueEnteredAt?: Date;
}

export interface MatchPair {
  matchId: string;
  userA: ConnectedUser;
  userB: ConnectedUser;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// =============================================
// V2 ENGINE TYPES
// =============================================

/** User lifecycle states */
export type UserState = 'created' | 'active' | 'searching' | 'reserved' | 'matched' | 'negotiating' | 'connected' | 'ended';

/** Match lifecycle states */
export type MatchLifecycle = 'creating' | 'reserved' | 'ready' | 'negotiating' | 'connected' | 'disconnected' | 'ended' | 'archived' | 'cancelled' | 'failed';

/** Queue entry states (expanded) */
export type QueueEntryState = 'waiting' | 'reserved' | 'matched' | 'left' | 'expired';

/** Scoring factor interface for extensible scoring */
export interface ScoringFactor {
  name: string;
  weight: number;
  calculate(self: CandidateProfile, candidate: CandidateProfile, context: ScoringContext): FactorResult;
}

/** Result from a single scoring factor */
export interface FactorResult {
  factor: string;
  raw: number;
  weighted: number;
  reason: string;
}

/** Complete scoring result with confidence level */
export interface ScoringResult {
  totalScore: number;
  confidence: MatchConfidence;
  breakdown: FactorResult[];
  candidateSessionId: string;
}

/** Match confidence levels */
export type MatchConfidence = 'instant' | 'very_good' | 'good' | 'acceptable' | 'fallback';

/** Candidate profile data used for scoring */
export interface CandidateProfile {
  sessionId: string;
  gender?: string;
  lookingFor?: string[];
  languages?: string[];
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  interestTags?: string[];
  queueEnteredAt?: string;
  lastPartner?: string;
  reportCount?: number;
  successfulMatches?: number;
}

/** Context data provided to scoring factors */
export interface ScoringContext {
  recentPartnerIds: string[];
  reportedUserIds: string[];
  waitingSeconds: number;
}

/** Database row for reservations table */
export interface Reservation {
  id: string;
  user_a: string;
  user_b: string;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  match_id?: string;
  created_at: string;
  expires_at: string;
}

/** Signaling message with ACK support */
export interface SignalingMessage {
  id: string;
  matchId: string;
  type: 'match_found' | 'ready' | 'start_negotiation' | 'offer' | 'answer' | 'ice_candidate' | 'partner_left';
  payload: unknown;
  requiresAck: boolean;
  sentAt: number;
  retryCount: number;
}

/** Ready state tracking for a match */
export interface ReadyState {
  matchId: string;
  userAReady: boolean;
  userBReady: boolean;
  userAReadyAt?: string;
  userBReadyAt?: string;
}

/** Expanded WaitingQueueEntry with reservation fields */
export interface WaitingQueueEntryV2 extends WaitingQueueEntry {
  reserved_by?: string | null;
  reserved_at?: string | null;
}

/** Expanded Match with lifecycle fields */
export interface MatchV2 extends Match {
  lifecycle?: MatchLifecycle;
  ready_a?: boolean;
  ready_b?: boolean;
  ready_at?: string | null;
  liked_by_a?: boolean;
  liked_by_b?: boolean;
}

/** Expanded VisitorSession with user state */
export interface VisitorSessionV2 extends VisitorSession {
  user_state?: UserState;
}
