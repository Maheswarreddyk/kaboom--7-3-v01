import { SignalingPort } from '../ports/SignalingPort.js';
import type { Server } from 'socket.io';

/**
 * Socket.IO Signaling Adapter — Implements SignalingPort using Socket.IO.
 * Maps session IDs to socket IDs for message routing.
 */
export class SocketIOSignalingAdapter implements SignalingPort {
  private sessionToSocket = new Map<string, string>();

  constructor(private io: Server) {}

  /** Register a session with its Socket.IO socket ID */
  registerSession(sessionId: string, socketId: string): void {
    this.sessionToSocket.set(sessionId, socketId);
  }

  /** Unregister a session */
  unregisterSession(sessionId: string): void {
    this.sessionToSocket.delete(sessionId);
  }

  /** Check if a session has an active socket connection */
  isSessionConnected(sessionId: string): boolean {
    const socketId = this.sessionToSocket.get(sessionId);
    if (!socketId) return false;
    const socket = this.io.sockets.sockets.get(socketId);
    return !!socket?.connected;
  }

  /** Send event to session (fire-and-forget) */
  async sendToSession(sessionId: string, event: string, payload: unknown): Promise<boolean> {
    const socketId = this.sessionToSocket.get(sessionId);
    if (!socketId) return false;
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket?.connected) return false;
    socket.emit(event, payload);
    return true;
  }

  /** Send event and wait for ACK within timeout */
  async sendToSessionWithAck(sessionId: string, event: string, payload: unknown, timeoutMs: number): Promise<boolean> {
    const socketId = this.sessionToSocket.get(sessionId);
    if (!socketId) return false;
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket?.connected) return false;
    try {
      await socket.timeout(timeoutMs).emitWithAck(event, payload);
      return true;
    } catch {
      return false;
    }
  }

  /** Broadcast to all sockets in a match room */
  async broadcastToMatch(matchId: string, event: string, payload: unknown): Promise<void> {
    this.io.to(`match:${matchId}`).emit(event, payload);
  }

  /** Get the socket ID for a session (useful for room operations) */
  getSocketId(sessionId: string): string | undefined {
    return this.sessionToSocket.get(sessionId);
  }

  /** Join a socket to a room */
  joinRoom(sessionId: string, room: string): boolean {
    const socketId = this.sessionToSocket.get(sessionId);
    if (!socketId) return false;
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return false;
    socket.join(room);
    return true;
  }

  /** Remove a socket from a room */
  leaveRoom(sessionId: string, room: string): boolean {
    const socketId = this.sessionToSocket.get(sessionId);
    if (!socketId) return false;
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return false;
    socket.leave(room);
    return true;
  }
}
