/**
 * Signaling Port — Provider-independent signaling abstraction.
 * Handles real-time message delivery between server and clients.
 */
export interface SignalingPort {
  /** Send a message to a specific session (fire-and-forget) */
  sendToSession(sessionId: string, event: string, payload: unknown): Promise<boolean>;
  /** Send a message to a session and wait for ACK within timeout */
  sendToSessionWithAck(sessionId: string, event: string, payload: unknown, timeoutMs: number): Promise<boolean>;
  /** Broadcast a message to all participants of a match */
  broadcastToMatch(matchId: string, event: string, payload: unknown): Promise<void>;
  /** Register a session's transport ID (socketId, connectionId, etc.) */
  registerSession(sessionId: string, transportId: string): void;
  /** Unregister a session */
  unregisterSession(sessionId: string): void;
  /** Check if a session is currently connected */
  isSessionConnected(sessionId: string): boolean;
}
