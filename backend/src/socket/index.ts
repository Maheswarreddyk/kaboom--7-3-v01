/**
 * Socket Handlers Factory — Binds Socket.IO events to V2 engines.
 *
 * All business logic is delegated to the engines. The socket layer only
 * serves as a transport/network adapter. Uses the EventBus to reactively
 * update socket state (e.g. joining rooms, cleaning up mappings).
 */

import type { Server, Socket } from 'socket.io';
import type { Engines } from '../engines/index.js';
import type { ConnectedUser } from '../types/index.js';
import { SocketIOSignalingAdapter } from '../adapters/SocketIOSignalingAdapter.js';

interface SocketAuth {
  sessionId: string;
  sessionToken: string;
}

function parseAuth(socket: Socket): SocketAuth | null {
  const sessionId = socket.handshake.auth?.sessionId as string | undefined;
  const sessionToken = socket.handshake.auth?.sessionToken as string | undefined;

  if (!sessionId || !sessionToken) return null;
  return { sessionId, sessionToken };
}

export function setupSocketHandlers(io: Server, engines: Engines): void {
  // In-memory mapping of active matches for fast signaling routing without database queries
  const activeMatches = new Map<string, { partnerId: string; matchId: string }>();

  // Use the event bus to keep our in-memory mappings and rooms synchronized
  engines.session.eventBus.on('match:reserved', (data) => {
    activeMatches.set(data.userA, { partnerId: data.userB, matchId: data.matchId });
    activeMatches.set(data.userB, { partnerId: data.userA, matchId: data.matchId });

    // Join sockets to match room if they are Socket.IO connections
    if (engines.signaling instanceof SocketIOSignalingAdapter) {
      engines.signaling.joinRoom(data.userA, `match:${data.matchId}`);
      engines.signaling.joinRoom(data.userB, `match:${data.matchId}`);
    }
  });

  engines.session.eventBus.on('match:failed', (data) => {
    // Release active match mapping
    const matchId = data.matchId;
    if (matchId) {
      for (const [sessId, info] of activeMatches.entries()) {
        if (info.matchId === matchId) {
          activeMatches.delete(sessId);
          if (engines.signaling instanceof SocketIOSignalingAdapter) {
            engines.signaling.leaveRoom(sessId, `match:${matchId}`);
          }
        }
      }
    }
  });

  engines.session.eventBus.on('match:ended', (data) => {
    const matchId = data.matchId;
    for (const [sessId, info] of activeMatches.entries()) {
      if (info.matchId === matchId) {
        activeMatches.delete(sessId);
        if (engines.signaling instanceof SocketIOSignalingAdapter) {
          engines.signaling.leaveRoom(sessId, `match:${matchId}`);
        }
      }
    }
  });

  io.on('connection', (socket: Socket) => {
    const auth = parseAuth(socket);

    if (!auth) {
      socket.emit('error', { message: 'Authentication required. Start a session first.' });
      socket.disconnect(true);
      return;
    }

    const sessionId = auth.sessionId;
    const sessionToken = auth.sessionToken;

    // Register session in our signaling adapter
    engines.signaling.signaling.registerSession(sessionId, socket.id);

    console.log(`[Socket] Connected: ${sessionId.slice(0, 8)}... (${socket.id})`);

    // Check if session has an active match and notify reconnection
    const matchInfo = activeMatches.get(sessionId);
    if (matchInfo) {
      // Re-join match room
      socket.join(`match:${matchInfo.matchId}`);
      socket.emit('reconnect', {
        message: 'Reconnected successfully',
        inMatch: true,
        matchId: matchInfo.matchId,
        partnerSessionId: matchInfo.partnerId,
      });
    }

    // Helper: end current match
    const endMatchHelper = async (reason: 'next' | 'leave' | 'disconnect' | 'report') => {
      const match = activeMatches.get(sessionId);
      if (!match) return;

      const partnerId = match.partnerId;
      const matchId = match.matchId;

      await engines.db.update('matches', [{ column: 'id', operator: 'eq', value: matchId }], {
        lifecycle: 'ended',
        ended_at: new Date().toISOString(),
        ended_reason: reason,
      });

      // Clear DB queue entries
      await engines.queue.leave(sessionId);
      await engines.queue.leave(partnerId);

      // Transition session statuses
      await engines.session.transitionState(sessionId, 'active');
      await engines.session.transitionState(partnerId, 'active');

      // Publish event
      engines.session.eventBus.emit('match:ended', { matchId, reason });

      // Notify partner
      await engines.signaling.signaling.sendToSession(partnerId, 'partner_left', { reason });
    };

    // Helper: queue join handler
    const joinQueueHelper = async () => {
      try {
        await engines.session.transitionState(sessionId, 'searching');
        await engines.queue.join(sessionId);

        // Run matchmaking pipeline
        const matchResult = await engines.matching.findBestMatch(sessionId);
        if (matchResult) {
          const resResult = await engines.reservation.reserveAndConfirm(
            sessionId,
            matchResult.candidateSessionId,
            matchResult.totalScore,
            matchResult.breakdown
          );
          if (resResult.success) {
            // Notifications are automatically handled via match:reserved event emitter in SignalingEngine
            return;
          }
        }

        // Emit waiting status if no match paired
        socket.emit('waiting', {
          queuePosition: await engines.queue.getLength(),
          message: 'Waiting for a partner...',
        });
      } catch (error) {
        console.error('[Socket] join_queue error:', error);
        socket.emit('error', { message: 'Failed to join queue. Please try again.' });
      }
    };

    // --- Core socket event bindings ---

    socket.on('join_queue', async () => {
      await joinQueueHelper();
    });

    socket.on('leave_queue', async () => {
      try {
        await engines.queue.leave(sessionId);
        await engines.session.transitionState(sessionId, 'active');
        socket.emit('searching', { message: 'Left queue' });
      } catch (error) {
        console.error('[Socket] leave_queue error:', error);
        socket.emit('error', { message: 'Failed to leave queue' });
      }
    });

    socket.on('preferences_updated', async (data: { preferences: any }) => {
      if (data.preferences) {
        await engines.session.updatePreferences(sessionId, {
          gender: data.preferences.gender,
          looking_for: data.preferences.looking_for,
          languages: data.preferences.languages,
          country: data.preferences.country,
          state: data.preferences.state,
          district: data.preferences.district,
          city: data.preferences.city,
          interest_tags: data.preferences.interest_tags,
        });
      }
    });

    socket.on('like_partner', async (data: { matchId: string }) => {
      await engines.like.submitLike(data.matchId, sessionId);
    });

    socket.on('chat_message', async (data: { matchId: string; message: string }) => {
      const match = activeMatches.get(sessionId);
      if (!match) return;
      await engines.chat.sendMessage(data.matchId, sessionId, match.partnerId, data.message);
    });

    socket.on('typing', (data: { typing: boolean }) => {
      const match = activeMatches.get(sessionId);
      if (!match) return;
      engines.chat.handleTyping(sessionId, match.partnerId, data.typing);
    });

    socket.on('ready', async (data: { matchId: string }) => {
      await engines.signaling.handleReady(sessionId, data.matchId);
    });

    socket.on('heartbeat', async () => {
      await engines.queue.heartbeat(sessionId);
      await engines.session.heartbeat(sessionId);

      // Trigger matchmaking loop on heartbeat
      const matchResult = await engines.matching.findBestMatch(sessionId);
      if (matchResult) {
        await engines.reservation.reserveAndConfirm(
          sessionId,
          matchResult.candidateSessionId,
          matchResult.totalScore,
          matchResult.breakdown
        );
      }
    });

    socket.on('next', async () => {
      try {
        const match = activeMatches.get(sessionId);
        await endMatchHelper('next');
        socket.emit('searching', { message: 'Finding a new partner...' });

        // Add cooldown/avoid partner logic
        if (match) {
          // Temporarily store last partner on connection state if needed
        }

        await joinQueueHelper();
      } catch (error) {
        console.error('[Socket] next error:', error);
        socket.emit('error', { message: 'Failed to find next partner' });
      }
    });

    // WebRTC Signaling relays

    socket.on('offer', async (data: { targetSessionId: string; offer: unknown }) => {
      const match = activeMatches.get(sessionId);
      if (!match || match.partnerId !== data.targetSessionId) return;
      await engines.signaling.relaySignal(sessionId, match.matchId, 'offer', data.offer);
    });

    socket.on('answer', async (data: { targetSessionId: string; answer: unknown }) => {
      const match = activeMatches.get(sessionId);
      if (!match || match.partnerId !== data.targetSessionId) return;
      await engines.signaling.relaySignal(sessionId, match.matchId, 'answer', data.answer);
    });

    socket.on('ice_candidate', async (data: { targetSessionId: string; candidate: unknown }) => {
      const match = activeMatches.get(sessionId);
      if (!match || match.partnerId !== data.targetSessionId) return;
      await engines.signaling.relaySignal(sessionId, match.matchId, 'ice_candidate', data.candidate);
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${sessionId.slice(0, 8)}... (${socket.id})`);

      try {
        const match = activeMatches.get(sessionId);
        if (match) {
          await endMatchHelper('disconnect');
        } else {
          await engines.queue.leave(sessionId, 'disconnect');
        }
      } catch (error) {
        console.error('[Socket] disconnect error:', error);
      } finally {
        engines.signaling.signaling.unregisterSession(sessionId);
      }
    });
  });
}
