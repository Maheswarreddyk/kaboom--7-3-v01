/**
 * Signaling Engine — Orchestrates reliable WebRTC signaling.
 *
 * Responsibilities:
 * - Implements the client-server READY handshake protocol.
 * - Relays WebRTC signaling (offers, answers, ICE candidates) between peers.
 * - Handles signaling message delivery confirmation (ACKs) and retries.
 * - Retrieves dynamic ICE configuration for negotiations.
 *
 * Subscribes to:
 * - match:reserved (to trigger match_found notification)
 */

import type { DatabasePort } from '../ports/DatabasePort.js';
import type { SignalingPort } from '../ports/SignalingPort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { EventBus } from '../events/EventBus.js';
import type { MatchV2, UserState } from '../types/index.js';
import { SCORING_CONFIG } from '../config/scoring.config.js';
import { getIceServers } from '../config/index.js';

export class SignalingEngine {
  private static readonly ENGINE = 'Signaling';

  constructor(
    public signaling: SignalingPort,
    private db: DatabasePort,
    private logger: LoggerPort,
    private eventBus: EventBus
  ) {}

  /**
   * Listen for when a match is reserved by ReservationEngine.
   * Notifies both clients they have found a match and should prepare/subscribe.
   */
  async onMatchReserved(data: { reservationId: string; matchId: string; userA: string; userB: string }): Promise<void> {
    const payload = { matchId: data.matchId, reservationId: data.reservationId };

    // Send match_found to both sessions with retry support
    const sentA = await this.sendWithRetry(data.userA, 'match_found', payload);
    const sentB = await this.sendWithRetry(data.userB, 'match_found', payload);

    if (!sentA || !sentB) {
      this.logger.warn(SignalingEngine.ENGINE, 'match_notification_failed', {
        matchId: data.matchId,
        sentA,
        sentB,
      });
      // The reservation expiry background loop will clean this up shortly if it fails.
    }
  }

  /**
   * Handlers for reservation expiry or failure.
   */
  async onMatchFailed(data: { matchId?: string; reason: string }): Promise<void> {
    if (!data.matchId) return;

    // Load match details
    const match = await this.db.queryOne<MatchV2>('matches', {
      filters: [{ column: 'id', operator: 'eq', value: data.matchId }],
    });

    if (match) {
      const payload = { matchId: data.matchId, reason: data.reason };
      await this.sendToPeer(match.user_a, 'match_failed', payload);
      await this.sendToPeer(match.user_b, 'match_failed', payload);
    }
  }

  /**
   * Notify match partners when mutual like is achieved.
   */
  async onMutualLike(data: { matchId: string; userA: string; userB: string }): Promise<void> {
    const payload = { matchId: data.matchId, mutual: true };
    await this.sendToPeer(data.userA, 'mutual_like', payload);
    await this.sendToPeer(data.userB, 'mutual_like', payload);
  }

  /**
   * Handle the 'ready' signal from a client indicating they are subscribed to the match channel.
   * When both users are ready, starts WebRTC negotiation.
   */
  async handleReady(sessionId: string, matchId: string): Promise<void> {
    const start = Date.now();

    const match = await this.db.queryOne<MatchV2>('matches', {
      filters: [{ column: 'id', operator: 'eq', value: matchId }],
    });

    if (!match) {
      this.logger.warn(SignalingEngine.ENGINE, 'ready_match_not_found', { sessionId, matchId });
      return;
    }

    if (match.lifecycle === 'ended' || match.lifecycle === 'cancelled') {
      this.logger.warn(SignalingEngine.ENGINE, 'ready_match_inactive', { sessionId, matchId, lifecycle: match.lifecycle });
      return;
    }

    let isUserA = false;
    let isUserB = false;

    if (match.user_a === sessionId) isUserA = true;
    else if (match.user_b === sessionId) isUserB = true;
    else {
      this.logger.warn(SignalingEngine.ENGINE, 'ready_unauthorized_user', { sessionId, matchId });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (isUserA) updates.ready_a = true;
    if (isUserB) updates.ready_b = true;

    await this.db.update(
      'matches',
      [{ column: 'id', operator: 'eq', value: matchId }],
      updates
    );

    const isReadyA = isUserA ? true : match.ready_a;
    const isReadyB = isUserB ? true : match.ready_b;

    this.logger.info(SignalingEngine.ENGINE, 'user_ready', {
      matchId,
      sessionId,
      isReadyA,
      isReadyB,
    });

    this.eventBus.emit('match:ready', {
      matchId,
      sessionId,
      bothReady: !!(isReadyA && isReadyB),
    });

    // If both ready, start WebRTC negotiation
    if (isReadyA && isReadyB) {
      await this.startNegotiation(match);
    }
  }

  /**
   * Trigger WebRTC negotiation between both matched peers.
   */
  private async startNegotiation(match: MatchV2): Promise<void> {
    const start = Date.now();

    // 1. Update match state in DB
    await this.db.update(
      'matches',
      [{ column: 'id', operator: 'eq', value: match.id }],
      {
        lifecycle: 'negotiating',
        ready_at: new Date().toISOString(),
      }
    );

    // 2. Update session states to 'negotiating'
    await this.db.update(
      'visitor_sessions',
      [{ column: 'id', operator: 'in', value: [match.user_a, match.user_b] }],
      { user_state: 'negotiating' as UserState }
    );

    // 3. Load ICE servers
    const iceServers = getIceServers();

    // 4. Send start_negotiation triggers (User A is initiator)
    const payloadA = { matchId: match.id, isInitiator: true, iceServers };
    const payloadB = { matchId: match.id, isInitiator: false, iceServers };

    const sentA = await this.sendWithRetry(match.user_a, 'start_negotiation', payloadA);
    const sentB = await this.sendWithRetry(match.user_b, 'start_negotiation', payloadB);

    if (sentA && sentB) {
      this.logger.metric(SignalingEngine.ENGINE, 'negotiation_started', Date.now() - start, {
        matchId: match.id,
        userA: match.user_a,
        userB: match.user_b,
      });

      this.eventBus.emit('match:negotiating', {
        matchId: match.id,
        initiator: match.user_a,
        receiver: match.user_b,
      });
    } else {
      this.logger.error(SignalingEngine.ENGINE, 'negotiation_trigger_failed', {
        matchId: match.id,
        sentA,
        sentB,
      });
    }
  }

  /**
   * Relays a signaling payload (offer, answer, ice_candidate) to the partner peer.
   * Verifies the sender and recipient are matching partners.
   */
  async relaySignal(
    fromSessionId: string,
    matchId: string,
    type: 'offer' | 'answer' | 'ice_candidate',
    payload: unknown
  ): Promise<boolean> {
    const match = await this.db.queryOne<MatchV2>('matches', {
      filters: [{ column: 'id', operator: 'eq', value: matchId }],
    });

    if (!match) return false;
    if (match.lifecycle === 'ended' || match.lifecycle === 'cancelled') return false;

    // Verify participants
    let recipientSessionId = '';
    if (match.user_a === fromSessionId) recipientSessionId = match.user_b;
    else if (match.user_b === fromSessionId) recipientSessionId = match.user_a;
    else return false;

    // Emit event for analytics
    const eventName = `signal:${type}_sent` as any;
    this.eventBus.emit(eventName, { matchId, from: fromSessionId });

    // Send with retry to recipient
    const success = await this.sendWithRetry(recipientSessionId, type, {
      matchId,
      senderSessionId: fromSessionId,
      payload,
    });

    if (success) {
      const ackEventName = `signal:${type}_acked` as any;
      this.eventBus.emit(ackEventName, { matchId, from: fromSessionId });
    }

    return success;
  }

  /**
   * Fire-and-forget message delivery helper.
   */
  private async sendToPeer(sessionId: string, event: string, payload: unknown): Promise<void> {
    await this.signaling.sendToSession(sessionId, event, payload);
  }

  /**
   * Helper to send signaling events with ACK retries.
   */
  private async sendWithRetry(
    sessionId: string,
    event: string,
    payload: unknown
  ): Promise<boolean> {
    const cfg = SCORING_CONFIG.signaling;
    let attempt = 0;

    while (attempt < cfg.maxRetries) {
      const success = await this.signaling.sendToSessionWithAck(
        sessionId,
        event,
        payload,
        cfg.ackTimeoutMs
      );

      if (success) return true;

      attempt++;
      this.logger.warn(SignalingEngine.ENGINE, 'ack_timeout_retry', {
        sessionId,
        event,
        attempt,
        maxRetries: cfg.maxRetries,
      });

      // Exponential backoff or constant delay
      await new Promise((resolve) => setTimeout(resolve, cfg.retryDelayMs));
    }

    this.logger.error(SignalingEngine.ENGINE, 'reliable_delivery_failed', {
      sessionId,
      event,
    });

    return false;
  }
}
