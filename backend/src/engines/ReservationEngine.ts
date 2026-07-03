/**
 * Reservation Engine — Manages atomic matching reservations.
 *
 * Responsibilities:
 * - Atomic double-reservations in the waiting queue (race-condition free)
 * - Reservation database record lifecycle (pending -> confirmed/expired/cancelled)
 * - Expiry cleanup of timed-out reservations (automatic self-healing)
 *
 * Events published:
 * - match:reserved
 * - match:confirmed
 * - match:failed
 */

import { v4 as uuid } from 'uuid';
import type { DatabasePort } from '../ports/DatabasePort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { EventBus } from '../events/EventBus.js';
import type { QueueEngine } from './QueueEngine.js';
import type { SessionEngine } from './SessionEngine.js';
import type {
  Reservation,
  MatchV2,
  UserState,
  FactorResult,
} from '../types/index.js';
import { SCORING_CONFIG } from '../config/scoring.config.js';

export class ReservationEngine {
  private static readonly ENGINE = 'Reservation';

  constructor(
    private db: DatabasePort,
    private queue: QueueEngine,
    private session: SessionEngine,
    private logger: LoggerPort,
    private eventBus: EventBus
  ) {}

  /**
   * Attempt to atomically reserve and match two users.
   * If either user is already reserved, rolls back and returns success: false.
   */
  async reserveAndConfirm(
    userA: string,
    userB: string,
    score: number,
    breakdown: FactorResult[]
  ): Promise<{ success: boolean; matchId?: string; reservationId?: string; reason?: string }> {
    const start = Date.now();
    const reservationId = uuid();

    // 1. Atomically reserve User A
    const reservedA = await this.queue.reserve(userA, reservationId);
    if (!reservedA) {
      this.logger.warn(ReservationEngine.ENGINE, 'reserve_failed_user_a', {
        reservationId,
        userA,
        reason: 'User A already reserved by another match',
      });
      return { success: false, reason: 'user_a_already_reserved' };
    }

    // 2. Atomically reserve User B
    const reservedB = await this.queue.reserve(userB, reservationId);
    if (!reservedB) {
      // Rollback User A
      await this.queue.releaseReservation(userA);
      this.logger.warn(ReservationEngine.ENGINE, 'reserve_failed_user_b', {
        reservationId,
        userB,
        reason: 'User B already reserved by another match, rolling back User A',
      });
      return { success: false, reason: 'user_b_already_reserved' };
    }

    try {
      // 3. Create reservation database record
      const expiresAt = new Date(Date.now() + SCORING_CONFIG.reservation.timeoutMs).toISOString();
      const resRecord = await this.db.insert<Reservation>('reservations', {
        id: reservationId,
        user_a: userA,
        user_b: userB,
        status: 'pending',
        expires_at: expiresAt,
      });

      // 4. Create match record in 'creating' state
      const match = await this.db.insert<MatchV2>('matches', {
        user_a: userA,
        user_b: userB,
        lifecycle: 'reserved',
        ready_a: false,
        ready_b: false,
        started_at: new Date().toISOString(),
      });

      // 5. Update reservation record to link to match
      await this.db.update(
        'reservations',
        [{ column: 'id', operator: 'eq', value: reservationId }],
        { match_id: match.id }
      );

      // 6. Transition queue statuses to 'matched' (keeps them in queue table but marks matched)
      await this.queue.markMatched(userA);
      await this.queue.markMatched(userB);

      // 7. Transition session states to 'reserved'
      await this.session.transitionState(userA, 'reserved' as UserState);
      await this.session.transitionState(userB, 'reserved' as UserState);

      this.logger.metric(ReservationEngine.ENGINE, 'reservation_created', Date.now() - start, {
        reservationId,
        matchId: match.id,
        userA,
        userB,
        score,
      });

      this.eventBus.emit('match:reserved', {
        reservationId,
        matchId: match.id,
        userA,
        userB,
        score,
      });

      return { success: true, matchId: match.id, reservationId };
    } catch (err: any) {
      // Heavy rollback on any failure
      this.logger.error(ReservationEngine.ENGINE, 'reservation_error_rollback', {
        reservationId,
        userA,
        userB,
        reason: err.message,
      });

      await this.queue.releaseReservation(userA);
      await this.queue.releaseReservation(userB);
      await this.db.delete('reservations', [{ column: 'id', operator: 'eq', value: reservationId }]);

      return { success: false, reason: 'internal_error' };
    }
  }

  /**
   * Confirm a reservation once the ready handshake begins.
   */
  async confirm(reservationId: string): Promise<void> {
    const start = Date.now();

    const reservation = await this.db.queryOne<Reservation>('reservations', {
      filters: [{ column: 'id', operator: 'eq', value: reservationId }],
    });
    if (!reservation) return;

    await this.db.update(
      'reservations',
      [{ column: 'id', operator: 'eq', value: reservationId }],
      { status: 'confirmed' }
    );

    if (reservation.match_id) {
      await this.db.update(
        'matches',
        [{ column: 'id', operator: 'eq', value: reservation.match_id }],
        { lifecycle: 'ready' }
      );

      this.logger.metric(ReservationEngine.ENGINE, 'reservation_confirmed', Date.now() - start, {
        reservationId,
        matchId: reservation.match_id,
      });

      this.eventBus.emit('match:confirmed', {
        matchId: reservation.match_id,
        userA: reservation.user_a,
        userB: reservation.user_b,
      });
    }
  }

  /**
   * Expire a pending reservation because one or both users failed to send ready.
   */
  async expire(reservationId: string): Promise<void> {
    const start = Date.now();

    const reservation = await this.db.queryOne<Reservation>('reservations', {
      filters: [
        { column: 'id', operator: 'eq', value: reservationId },
        { column: 'status', operator: 'eq', value: 'pending' },
      ],
    });
    if (!reservation) return;

    // 1. Mark reservation as expired
    await this.db.update(
      'reservations',
      [{ column: 'id', operator: 'eq', value: reservationId }],
      { status: 'expired' }
    );

    // 2. Release both users in the queue so they return to searching
    await this.queue.releaseReservation(reservation.user_a);
    await this.queue.releaseReservation(reservation.user_b);

    // 3. Return session states back to active/searching
    await this.session.transitionState(reservation.user_a, 'active' as UserState);
    await this.session.transitionState(reservation.user_b, 'active' as UserState);

    // 4. Update match lifecycle to cancelled
    if (reservation.match_id) {
      await this.db.update(
        'matches',
        [{ column: 'id', operator: 'eq', value: reservation.match_id }],
        { lifecycle: 'cancelled', ended_at: new Date().toISOString() }
      );
    }

    this.logger.metric(ReservationEngine.ENGINE, 'reservation_expired', Date.now() - start, {
      reservationId,
      matchId: reservation.match_id,
      userA: reservation.user_a,
      userB: reservation.user_b,
    });

    this.eventBus.emit('match:failed', {
      reservationId,
      matchId: reservation.match_id,
      reason: 'reservation_expired',
    });
  }

  /**
   * Scan for expired reservations and clean them up.
   */
  async cleanupExpired(): Promise<void> {
    const now = new Date().toISOString();
    const expired = await this.db.query<Reservation>('reservations', {
      filters: [
        { column: 'status', operator: 'eq', value: 'pending' },
        { column: 'expires_at', operator: 'lt', value: now },
      ],
    });

    for (const res of expired) {
      await this.expire(res.id);
    }
  }
}
