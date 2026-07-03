import { SignalingPort } from '../ports/SignalingPort.js';
import { getSupabase } from '../database/client.js';

/**
 * Supabase Realtime Signaling Adapter — Implements SignalingPort using
 * Supabase Realtime broadcast channels.
 *
 * Messages are sent via broadcast to session-specific or match-specific channels.
 * Clients subscribe to their session channel on connect.
 */
export class SupabaseRealtimeAdapter implements SignalingPort {
  private activeSessions = new Set<string>();

  /** Register a session as connected */
  registerSession(sessionId: string, _transportId: string): void {
    this.activeSessions.add(sessionId);
  }

  /** Unregister a session */
  unregisterSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /** Check if session is known to be connected */
  isSessionConnected(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  /** Send a message to a session via its dedicated broadcast channel */
  async sendToSession(sessionId: string, event: string, payload: unknown): Promise<boolean> {
    if (!this.activeSessions.has(sessionId)) return false;
    try {
      const client = getSupabase();
      const channel = client.channel(`session:${sessionId}`);
      await channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event, payload });
          // Cleanup after short delay to ensure message is sent
          setTimeout(() => client.removeChannel(channel), 2000);
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send with ACK — Supabase Realtime doesn't support native ACK.
   * ACK is handled at the application level via the READY handshake.
   * Falls back to fire-and-forget send.
   */
  async sendToSessionWithAck(sessionId: string, event: string, payload: unknown, _timeoutMs: number): Promise<boolean> {
    return this.sendToSession(sessionId, event, payload);
  }

  /** Broadcast a message to all participants in a match channel */
  async broadcastToMatch(matchId: string, event: string, payload: unknown): Promise<void> {
    try {
      const client = getSupabase();
      const channel = client.channel(`match:${matchId}`);
      await channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event, payload });
          setTimeout(() => client.removeChannel(channel), 2000);
        }
      });
    } catch (err) {
      console.error(`[SupabaseRealtimeAdapter] broadcastToMatch error:`, err);
    }
  }
}
