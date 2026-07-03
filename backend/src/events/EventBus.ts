/**
 * Internal Event Bus — Decouples engines via typed pub/sub.
 * Engines publish domain events; other engines subscribe to react.
 * Handler errors are isolated — one failing handler doesn't break others.
 */

export interface EventMap {
  'queue:joined':        { sessionId: string; timestamp: Date };
  'queue:left':          { sessionId: string; reason: string };
  'queue:heartbeat':     { sessionId: string };
  'match:reserved':      { reservationId: string; matchId: string; userA: string; userB: string; score: number };
  'match:confirmed':     { matchId: string; userA: string; userB: string };
  'match:ready':         { matchId: string; sessionId: string; bothReady: boolean };
  'match:negotiating':   { matchId: string; initiator: string; receiver: string };
  'match:connected':     { matchId: string };
  'match:ended':         { matchId: string; reason: string };
  'match:failed':        { reservationId: string; matchId?: string; reason: string };
  'signal:offer_sent':   { matchId: string; from: string };
  'signal:offer_acked':  { matchId: string; from: string };
  'signal:answer_sent':  { matchId: string; from: string };
  'signal:answer_acked': { matchId: string; from: string };
  'signal:ice_sent':     { matchId: string; from: string };
  'signal:ice_acked':    { matchId: string; from: string };
  'like:submitted':      { matchId: string; sessionId: string };
  'like:mutual':         { matchId: string; userA: string; userB: string };
  'chat:message':        { matchId: string; senderSessionId: string };
  'session:created':     { sessionId: string };
  'session:ended':       { sessionId: string };
  'session:heartbeat':   { sessionId: string };
  'report:submitted':    { reporterSessionId: string; reportedSessionId: string };
}

export type EventHandler<K extends keyof EventMap> = (data: EventMap[K]) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<Function>>();

  /** Subscribe to an event */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /** Unsubscribe from an event */
  off<K extends keyof EventMap>(event: K, handler: Function): void {
    this.handlers.get(event)?.delete(handler);
  }

  /** Emit an event to all subscribers. Handler errors are isolated. */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;
    for (const handler of eventHandlers) {
      try {
        const result = handler(data);
        // Handle async handlers — catch and log errors
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(`[EventBus] Error in async handler for '${event}':`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Error in handler for '${event}':`, err);
      }
    }
  }

  /** Remove all handlers for an event */
  clear(event?: keyof EventMap): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /** Get count of handlers for an event */
  listenerCount(event: keyof EventMap): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
