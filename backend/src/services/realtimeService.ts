/**
 * Realtime Service — Thin wrapper for backward compatibility.
 * Delegates signaling broadcasts to the V2 engines signaling adapter.
 */

import { engines } from '../index.js';

export async function broadcastToSession(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  await engines.signaling.signaling.sendToSession(sessionId, event, payload);
}
