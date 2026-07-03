/**
 * Chat Engine — Manages ephemeral in-match messaging.
 *
 * Responsibilities:
 * - Persisting temporary message records (auto-expires in 1 hour)
 * - Relaying new messages to partners
 * - Relaying typing indicators
 * - Cleaning up messages once matches end
 */

import type { DatabasePort } from '../ports/DatabasePort.js';
import type { SignalingPort } from '../ports/SignalingPort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { EventBus } from '../events/EventBus.js';

export class ChatEngine {
  private static readonly ENGINE = 'Chat';

  constructor(
    private db: DatabasePort,
    private signaling: SignalingPort,
    private logger: LoggerPort,
    private eventBus: EventBus
  ) {}

  /**
   * Save a temporary message to the database and relay it to the match partner.
   */
  async sendMessage(
    matchId: string,
    senderSessionId: string,
    partnerSessionId: string,
    message: string
  ): Promise<boolean> {
    const start = Date.now();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    try {
      const msg = await this.db.insert<Record<string, unknown>>('temporary_messages', {
        match_id: matchId,
        sender_session: senderSessionId,
        message,
        expires_at: expiresAt,
      });

      // Relay message to partner session
      const sent = await this.signaling.sendToSession(partnerSessionId, 'new_message', {
        matchId,
        senderSessionId,
        message,
        createdAt: msg.created_at || new Date().toISOString(),
      });

      this.logger.metric(ChatEngine.ENGINE, 'message_sent', Date.now() - start, {
        matchId,
        senderSessionId,
        partnerSessionId,
        relayed: sent,
      });

      this.eventBus.emit('chat:message', { matchId, senderSessionId });
      return true;
    } catch (err: any) {
      this.logger.error(ChatEngine.ENGINE, 'send_message_error', {
        matchId,
        senderSessionId,
        reason: err.message,
      });
      return false;
    }
  }

  /**
   * Relay typing indicator state.
   */
  async handleTyping(
    senderSessionId: string,
    partnerSessionId: string,
    typing: boolean
  ): Promise<void> {
    await this.signaling.sendToSession(partnerSessionId, 'partner_typing', { typing });
  }

  /**
   * Delete all temporary messages for a specific match.
   */
  async deleteMatchMessages(matchId: string): Promise<void> {
    const start = Date.now();
    const count = await this.db.delete('temporary_messages', [
      { column: 'match_id', operator: 'eq', value: matchId },
    ]);

    if (count > 0) {
      this.logger.metric(ChatEngine.ENGINE, 'match_messages_cleared', Date.now() - start, {
        matchId,
        count,
      });
    }
  }

  /**
   * Delete expired messages from the database.
   */
  async purgeExpired(): Promise<void> {
    const start = Date.now();
    const count = await this.db.delete('temporary_messages', [
      { column: 'expires_at', operator: 'lt', value: new Date().toISOString() },
    ]);

    if (count > 0) {
      this.logger.metric(ChatEngine.ENGINE, 'expired_messages_purged', Date.now() - start, { count });
    }
  }
}
