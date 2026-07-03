/**
 * Session Engine — Owns the visitor_sessions table.
 *
 * Responsibilities:
 * - Session creation with UUID token generation
 * - Session validation and restoration
 * - User state machine transitions
 * - Preference/profile management
 * - Heartbeat tracking
 * - Session ending
 *
 * Events published:
 * - session:created
 * - session:ended
 * - session:heartbeat
 */

import { v4 as uuid } from 'uuid';
import type { DatabasePort } from '../ports/DatabasePort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { EventBus } from '../events/EventBus.js';
import { USER_STATE_MACHINE } from './StateMachine.js';
import type {
  UserState,
  VisitorSessionV2,
  StartSessionRequest,
  CandidateProfile,
} from '../types/index.js';

export class SessionEngine {
  private static readonly ENGINE = 'Session';

  constructor(
    public db: DatabasePort,
    private logger: LoggerPort,
    public eventBus: EventBus
  ) {}

  /**
   * Create a new visitor session with a UUID token.
   * Returns sessionId and sessionToken for the client to store.
   */
  async create(data: StartSessionRequest): Promise<{ sessionId: string; sessionToken: string }> {
    const start = Date.now();
    const sessionToken = uuid();

    const session = await this.db.insert<VisitorSessionV2>('visitor_sessions', {
      session_token: sessionToken,
      country: data.country || null,
      browser: data.browser || null,
      device: data.device || null,
      platform: data.platform || null,
      status: 'active',
      user_state: 'active' as UserState,
    });

    this.logger.metric(SessionEngine.ENGINE, 'session_created', Date.now() - start, {
      sessionId: session.id,
    });
    this.eventBus.emit('session:created', { sessionId: session.id });

    return { sessionId: session.id, sessionToken };
  }

  /**
   * Validate a session exists, is not ended, and token matches (if provided).
   * Returns the session if valid, null otherwise.
   */
  async validate(sessionId: string, token?: string): Promise<VisitorSessionV2 | null> {
    const session = await this.db.queryOne<VisitorSessionV2>('visitor_sessions', {
      filters: [{ column: 'id', operator: 'eq', value: sessionId }],
    });

    if (!session) {
      this.logger.warn(SessionEngine.ENGINE, 'validate_not_found', { sessionId });
      return null;
    }

    if (session.status === 'ended') {
      this.logger.warn(SessionEngine.ENGINE, 'validate_ended', { sessionId });
      return null;
    }

    if (token && session.session_token !== token) {
      this.logger.warn(SessionEngine.ENGINE, 'validate_token_mismatch', { sessionId });
      return null;
    }

    return session;
  }

  /**
   * Restore an existing session by ID and token.
   * Alias for validate with token required.
   */
  async restore(sessionId: string, token: string): Promise<VisitorSessionV2 | null> {
    return this.validate(sessionId, token);
  }

  /**
   * Record a heartbeat for the session.
   * Emits session:heartbeat event for analytics.
   */
  async heartbeat(sessionId: string): Promise<void> {
    this.eventBus.emit('session:heartbeat', { sessionId });
  }

  /**
   * Transition user state with state machine validation.
   * Invalid transitions are logged as warnings but do not throw.
   */
  async transitionState(sessionId: string, to: UserState): Promise<boolean> {
    const session = await this.db.queryOne<VisitorSessionV2>('visitor_sessions', {
      filters: [{ column: 'id', operator: 'eq', value: sessionId }],
    });

    if (!session) {
      this.logger.warn(SessionEngine.ENGINE, 'transition_session_not_found', { sessionId });
      return false;
    }

    const currentState = (session.user_state || 'active') as UserState;

    if (!USER_STATE_MACHINE.canTransition(currentState, to)) {
      this.logger.warn(SessionEngine.ENGINE, 'invalid_transition', {
        sessionId,
        reason: `Cannot transition from '${currentState}' to '${to}'`,
      });
      return false;
    }

    await this.db.update(
      'visitor_sessions',
      [{ column: 'id', operator: 'eq', value: sessionId }],
      { user_state: to }
    );

    this.logger.info(SessionEngine.ENGINE, 'state_transition', {
      sessionId,
      reason: `${currentState} → ${to}`,
    });

    return true;
  }

  /**
   * Update user preferences/profile.
   * Only allows known preference columns to prevent injection.
   */
  async updatePreferences(sessionId: string, prefs: Record<string, unknown>): Promise<void> {
    const allowed = [
      'gender', 'looking_for', 'languages', 'country',
      'state', 'district', 'city', 'interest_tags',
    ];
    const filtered: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in prefs) filtered[key] = prefs[key];
    }

    if (Object.keys(filtered).length === 0) return;

    await this.db.update(
      'visitor_sessions',
      [{ column: 'id', operator: 'eq', value: sessionId }],
      filtered
    );

    this.logger.info(SessionEngine.ENGINE, 'preferences_updated', {
      sessionId,
      reason: `Updated: ${Object.keys(filtered).join(', ')}`,
    });
  }

  /**
   * End a session. Sets status to 'ended' and records end timestamp.
   */
  async end(sessionId: string): Promise<void> {
    const start = Date.now();

    await this.db.update(
      'visitor_sessions',
      [{ column: 'id', operator: 'eq', value: sessionId }],
      {
        status: 'ended',
        ended_at: new Date().toISOString(),
        user_state: 'ended' as UserState,
      }
    );

    this.logger.metric(SessionEngine.ENGINE, 'session_ended', Date.now() - start, { sessionId });
    this.eventBus.emit('session:ended', { sessionId });
  }

  /**
   * Get a candidate profile for scoring.
   * Extracts preference fields from the session record.
   */
  async getProfile(sessionId: string): Promise<CandidateProfile | null> {
    const session = await this.db.queryOne<Record<string, unknown>>('visitor_sessions', {
      filters: [{ column: 'id', operator: 'eq', value: sessionId }],
    });

    if (!session) return null;

    return {
      sessionId: session.id as string,
      gender: session.gender as string | undefined,
      lookingFor: session.looking_for as string[] | undefined,
      languages: session.languages as string[] | undefined,
      country: session.country as string | undefined,
      state: session.state as string | undefined,
      district: session.district as string | undefined,
      city: session.city as string | undefined,
      interestTags: session.interest_tags as string[] | undefined,
    };
  }

  /**
   * Get the current user state for a session.
   */
  async getUserState(sessionId: string): Promise<UserState | null> {
    const session = await this.db.queryOne<VisitorSessionV2>('visitor_sessions', {
      filters: [{ column: 'id', operator: 'eq', value: sessionId }],
    });
    return session ? (session.user_state || 'active') as UserState : null;
  }
}
