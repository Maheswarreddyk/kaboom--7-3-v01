/**
 * Queue Engine — Owns the waiting_queue table.
 *
 * Responsibilities:
 * - Queue joins (idempotent) and leaves
 * - Queue entry heartbeat updates
 * - Atomic queue reservations for matching
 * - Stale entry cleanup (self-healing)
 * - Waiting candidate queries
 *
 * Events published:
 * - queue:joined
 * - queue:left
 * - queue:heartbeat
 */

import type { DatabasePort } from '../ports/DatabasePort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { EventBus } from '../events/EventBus.js';
import type {
  WaitingQueueEntryV2,
  CandidateProfile,
} from '../types/index.js';

export class QueueEngine {
  private static readonly ENGINE = 'Queue';

  constructor(
    private db: DatabasePort,
    private logger: LoggerPort,
    private eventBus: EventBus
  ) {}

  /**
   * Idempotently join the queue.
   * Keeps existing waiting entry alive to accumulate wait time age.
   */
  async join(sessionId: string): Promise<WaitingQueueEntryV2> {
    const start = Date.now();

    // 1. Check if an active waiting entry already exists
    const existing = await this.db.queryOne<any>('waiting_queue', {
      filters: [
        { column: 'session_id', operator: 'eq', value: sessionId },
        { column: 'status', operator: 'eq', value: 'waiting' },
      ],
    });

    if (existing) {
      const nowStr = new Date().toISOString();
      await this.db.update(
        'waiting_queue',
        [{ column: 'id', operator: 'eq', value: existing.id }],
        {
          joined_at: nowStr,
          reserved_by: null,
          reserved_at: null,
        }
      );
      this.logger.metric(QueueEngine.ENGINE, 'queue_join_idempotent', Date.now() - start, { sessionId });
      return {
        ...existing,
        joined_at: nowStr,
      };
    }

    // 2. Clean up any other old entries for this session
    await this.db.delete('waiting_queue', [
      { column: 'session_id', operator: 'eq', value: sessionId },
    ]);

    // 3. Insert new waiting entry with search_started tracking
    const now = new Date().toISOString();
    const entry = await this.db.insert<WaitingQueueEntryV2>('waiting_queue', {
      session_id: sessionId,
      status: 'waiting',
      joined_at: now,
      search_started: now as any,
    });

    this.logger.metric(QueueEngine.ENGINE, 'queue_join_new', Date.now() - start, { sessionId });
    this.eventBus.emit('queue:joined', { sessionId, timestamp: new Date(entry.joined_at) });

    return entry;
  }

  /**
   * Leave the queue by marking status as 'left'.
   */
  async leave(sessionId: string, reason = 'client_left'): Promise<void> {
    const start = Date.now();

    const affected = await this.db.update(
      'waiting_queue',
      [
        { column: 'session_id', operator: 'eq', value: sessionId },
        { column: 'status', operator: 'eq', value: 'waiting' },
      ],
      { status: 'left' }
    );

    if (affected > 0) {
      this.logger.metric(QueueEngine.ENGINE, 'queue_leave', Date.now() - start, { sessionId, reason });
      this.eventBus.emit('queue:left', { sessionId, reason });
    }
  }

  /**
   * Update queue heartbeat by resetting the joined_at timestamp to prevent expiration.
   */
  async heartbeat(sessionId: string): Promise<void> {
    const affected = await this.db.update(
      'waiting_queue',
      [
        { column: 'session_id', operator: 'eq', value: sessionId },
        { column: 'status', operator: 'eq', value: 'waiting' },
      ],
      { joined_at: new Date().toISOString() }
    );

    if (affected > 0) {
      this.eventBus.emit('queue:heartbeat', { sessionId });
    }
  }

  /**
   * Atomically reserve a waiting queue entry.
   * Uses conditional update (status must be 'waiting' and reserved_by must be null).
   * Returns true if reservation was successful, false if another process reserved them first.
   */
  async reserve(sessionId: string, reservedBy: string): Promise<boolean> {
    const start = Date.now();

    const success = await this.db.conditionalUpdate(
      'waiting_queue',
      [
        { column: 'session_id', operator: 'eq', value: sessionId },
        { column: 'status', operator: 'eq', value: 'waiting' },
        { column: 'reserved_by', operator: 'is', value: null },
      ],
      {
        reserved_by: reservedBy,
        reserved_at: new Date().toISOString(),
      }
    );

    this.logger.metric(QueueEngine.ENGINE, 'queue_reserve', Date.now() - start, {
      sessionId,
      reservedBy,
      success,
    });

    return success;
  }

  /**
   * Release a reservation, returning the user to the waiting pool.
   */
  async releaseReservation(sessionId: string): Promise<void> {
    await this.db.update(
      'waiting_queue',
      [{ column: 'session_id', operator: 'eq', value: sessionId }],
      {
        status: 'waiting' as any,
        reserved_by: null,
        reserved_at: null,
      }
    );

    this.logger.info(QueueEngine.ENGINE, 'reservation_released', { sessionId });
  }

  /**
   * Mark a queue entry as matched.
   */
  async markMatched(sessionId: string): Promise<void> {
    await this.db.update(
      'waiting_queue',
      [
        { column: 'session_id', operator: 'eq', value: sessionId },
        { column: 'status', operator: 'eq', value: 'waiting' },
      ],
      { status: 'matched' }
    );
  }

  /**
   * Retrieve waiting candidate profiles that are:
   * 1. Status is 'waiting'
   * 2. Not reserved by anyone
   * 3. Heartbeat (joined_at) is recent
   *
   * Resolves profiles in two steps to maintain provider-independence (no DB joins).
   */
  async getCandidates(excludeSessionId: string, heartbeatTimeoutMs: number): Promise<CandidateProfile[]> {
    const cutoff = new Date(Date.now() - heartbeatTimeoutMs).toISOString();

    // 1. Query waiting, unreserved queue entries with recent heartbeats
    const entries = await this.db.query<{ session_id: string; joined_at: string }>('waiting_queue', {
      select: ['session_id', 'joined_at'],
      filters: [
        { column: 'status', operator: 'eq', value: 'waiting' },
        { column: 'reserved_by', operator: 'is', value: null },
        { column: 'joined_at', operator: 'gte', value: cutoff },
      ],
      orderBy: { column: 'joined_at', ascending: true },
    });

    if (entries.length === 0) return [];

    const sessionIds = entries
      .map((e) => e.session_id)
      .filter((id) => id !== excludeSessionId);

    if (sessionIds.length === 0) return [];

    // 2. Query visitor_sessions profiles for the found session IDs
    const sessions = await this.db.query<Record<string, unknown>>('visitor_sessions', {
      filters: [
        { column: 'id', operator: 'in', value: sessionIds },
        { column: 'status', operator: 'neq', value: 'ended' },
      ],
    });

    const queueTimes = new Map(entries.map((e) => [e.session_id, e.joined_at]));

    return sessions.map((s) => ({
      sessionId: s.id as string,
      gender: s.gender as string | undefined,
      lookingFor: s.looking_for as string[] | undefined,
      languages: s.languages as string[] | undefined,
      country: s.country as string | undefined,
      state: s.state as string | undefined,
      district: s.district as string | undefined,
      city: s.city as string | undefined,
      interestTags: s.interest_tags as string[] | undefined,
      queueEnteredAt: queueTimes.get(s.id as string),
    }));
  }

  /**
   * Self-healing queue cleanup.
   * Removes duplicate queue entries, entries with expired heartbeats, or stuck reservations.
   */
  async cleanupStale(staleQueueMs: number, reservationTimeoutMs: number): Promise<void> {
    const start = Date.now();
    const queueCutoff = new Date(Date.now() - staleQueueMs).toISOString();
    const reservationCutoff = new Date(Date.now() - reservationTimeoutMs).toISOString();

    // 1. Expire waiting entries older than stale threshold
    const expiredWaiting = await this.db.update(
      'waiting_queue',
      [
        { column: 'status', operator: 'eq', value: 'waiting' },
        { column: 'joined_at', operator: 'lt', value: queueCutoff },
      ],
      { status: 'expired' }
    );

    // 2. Clean up stuck reservations (reserved but never fully matched/ready)
    const expiredReservations = await this.db.update(
      'waiting_queue',
      [
        { column: 'status', operator: 'eq', value: 'waiting' },
        { column: 'reserved_by', operator: 'neq', value: null },
        { column: 'reserved_at', operator: 'lt', value: reservationCutoff },
      ],
      {
        reserved_by: null,
        reserved_at: null,
      }
    );

    if (expiredWaiting > 0 || expiredReservations > 0) {
      this.logger.metric(QueueEngine.ENGINE, 'queue_cleanup', Date.now() - start, {
        expiredWaiting,
        expiredReservations,
      });
    }
  }

  /**
   * Get the current length of the waiting queue.
   */
  async getLength(): Promise<number> {
    return this.db.count('waiting_queue', [
      { column: 'status', operator: 'eq', value: 'waiting' },
      { column: 'reserved_by', operator: 'is', value: null },
    ]);
  }

  /**
   * Check if a session is currently in the queue.
   */
  async isQueued(sessionId: string): Promise<boolean> {
    const entry = await this.db.queryOne('waiting_queue', {
      select: ['id'],
      filters: [
        { column: 'session_id', operator: 'eq', value: sessionId },
        { column: 'status', operator: 'eq', value: 'waiting' },
      ],
    });
    return !!entry;
  }
}
