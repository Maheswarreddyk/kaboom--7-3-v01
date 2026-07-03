/**
 * Like Engine — Manages match likes and mutual connections.
 *
 * Responsibilities:
 * - Recording user likes on their match partners
 * - Detecting mutual likes (double-match likes)
 * - Emitting events to trigger celebrations/notifications
 */

import type { DatabasePort } from '../ports/DatabasePort.js';
import type { SignalingPort } from '../ports/SignalingPort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { EventBus } from '../events/EventBus.js';
import type { MatchV2 } from '../types/index.js';

export class LikeEngine {
  private static readonly ENGINE = 'Like';

  constructor(
    private db: DatabasePort,
    private signaling: SignalingPort,
    private logger: LoggerPort,
    private eventBus: EventBus
  ) {}

  /**
   * Submit a like for a match.
   * If both partners like each other, triggers a mutual like event.
   */
  async submitLike(matchId: string, sessionId: string): Promise<{ success: boolean; mutual: boolean }> {
    const start = Date.now();

    try {
      // 1. Log the like in likes table (idempotently check first)
      const existing = await this.db.queryOne('likes', {
        filters: [
          { column: 'match_id', operator: 'eq', value: matchId },
          { column: 'session_id', operator: 'eq', value: sessionId },
        ],
      });

      if (!existing) {
        await this.db.insert('likes', {
          match_id: matchId,
          session_id: sessionId,
        });
      }

      // 2. Load and update the match record
      const match = await this.db.queryOne<MatchV2>('matches', {
        filters: [{ column: 'id', operator: 'eq', value: matchId }],
      });

      if (!match) {
        this.logger.warn(LikeEngine.ENGINE, 'like_match_not_found', { matchId, sessionId });
        return { success: false, mutual: false };
      }

      let isUserA = match.user_a === sessionId;
      let isUserB = match.user_b === sessionId;

      if (!isUserA && !isUserB) {
        this.logger.warn(LikeEngine.ENGINE, 'like_unauthorized_user', { matchId, sessionId });
        return { success: false, mutual: false };
      }

      const updates: Record<string, boolean> = {};
      if (isUserA) updates.liked_by_a = true;
      if (isUserB) updates.liked_by_b = true;

      await this.db.update(
        'matches',
        [{ column: 'id', operator: 'eq', value: matchId }],
        updates
      );

      const hasLikedA = isUserA ? true : !!match.liked_by_a;
      const hasLikedB = isUserB ? true : !!match.liked_by_b;
      const mutual = hasLikedA && hasLikedB;

      this.logger.metric(LikeEngine.ENGINE, 'like_submitted', Date.now() - start, {
        matchId,
        sessionId,
        mutual,
      });

      this.eventBus.emit('like:submitted', { matchId, sessionId });

      if (mutual) {
        this.eventBus.emit('like:mutual', {
          matchId,
          userA: match.user_a,
          userB: match.user_b,
        });
      }

      return { success: true, mutual };
    } catch (err: any) {
      this.logger.error(LikeEngine.ENGINE, 'like_error', {
        matchId,
        sessionId,
        reason: err.message,
      });
      return { success: false, mutual: false };
    }
  }
}
