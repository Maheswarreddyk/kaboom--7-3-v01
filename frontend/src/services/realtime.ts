import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.js';
import type { IceServerConfig } from '../types/index.js';
import { io, Socket } from 'socket.io-client';
import { config } from '../config.js';

export interface RealtimeCallbacks {
  onWaiting?: (data: { queuePosition: number; message: string }) => void;
  onMatched?: (data: {
    matchId: string;
    partnerSessionId: string;
    isInitiator: boolean;
    iceServers: IceServerConfig[];
  }) => void;
  onPartnerLeft?: (data: { reason: string }) => void;
  onSearching?: (data: { message: string }) => void;
  onError?: (data: { message: string }) => void;
  onOffer?: (data: { fromSessionId: string; offer: RTCSessionDescriptionInit }) => void;
  onAnswer?: (data: { fromSessionId: string; answer: RTCSessionDescriptionInit }) => void;
  onIceCandidate?: (data: { fromSessionId: string; candidate: RTCIceCandidateInit }) => void;
  onPartnerLiked?: (data: { matchId: string }) => void;
  onMutualLike?: (data: { matchId: string; partnerSessionId: string }) => void;
  onNewMessage?: (data: { matchId: string; senderSessionId: string; message: string; createdAt: string }) => void;
  onPartnerTyping?: (data: { typing: boolean }) => void;
}

let socket: Socket | null = null;
let sessionChannel: RealtimeChannel | null = null;
let matchChannel: RealtimeChannel | null = null;
let currentMatchId: string | null = null;
let partnerSessionId: string | null = null;

const API_BASE = config.apiUrl;

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function cleanupMatchChannel() {
  const supabase = getSupabaseClient();
  if (matchChannel && supabase) {
    supabase.removeChannel(matchChannel);
    matchChannel = null;
  }
  currentMatchId = null;
  partnerSessionId = null;
}

function subscribeToMatchChannel(matchId: string, callbacks: RealtimeCallbacks) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    callbacks.onError?.({ message: 'Realtime not configured. Check Supabase settings.' });
    return;
  }

  cleanupMatchChannel();
  currentMatchId = matchId;

  matchChannel = supabase
    .channel(`match:${matchId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'offer' }, ({ payload }) => {
      callbacks.onOffer?.(payload as { fromSessionId: string; offer: RTCSessionDescriptionInit });
    })
    .on('broadcast', { event: 'answer' }, ({ payload }) => {
      callbacks.onAnswer?.(payload as { fromSessionId: string; answer: RTCSessionDescriptionInit });
    })
    .on('broadcast', { event: 'ice_candidate' }, ({ payload }) => {
      callbacks.onIceCandidate?.(payload as { fromSessionId: string; candidate: RTCIceCandidateInit });
    })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      callbacks.onPartnerTyping?.(payload as { typing: boolean });
    })
    .subscribe();
}

export function connectRealtime(
  sessionId: string,
  sessionToken: string,
  callbacks: RealtimeCallbacks
): void {
  if (config.signalingProvider === 'socketio') {
    disconnectRealtime();
    
    const socketUrl = config.apiUrl || window.location.origin;
    socket = io(socketUrl, {
      auth: { sessionId, sessionToken },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('matched', (data: { matchId: string; partnerSessionId: string; isInitiator: boolean; iceServers: IceServerConfig[] }) => {
      currentMatchId = data.matchId;
      partnerSessionId = data.partnerSessionId;
      callbacks.onMatched?.(data);
    });

    socket.on('partner_left', (data: { reason: string }) => {
      currentMatchId = null;
      partnerSessionId = null;
      callbacks.onPartnerLeft?.(data);
    });

    socket.on('searching', (data: { message: string }) => {
      callbacks.onSearching?.(data);
    });

    socket.on('partner_liked', (data: { matchId: string }) => {
      callbacks.onPartnerLiked?.(data);
    });

    socket.on('mutual_like', (data: { matchId: string; partnerSessionId: string }) => {
      callbacks.onMutualLike?.(data);
    });

    socket.on('new_message', (data: { matchId: string; senderSessionId: string; message: string; createdAt: string }) => {
      callbacks.onNewMessage?.(data);
    });

    socket.on('partner_typing', (data: { typing: boolean }) => {
      callbacks.onPartnerTyping?.(data);
    });

    socket.on('offer', (data: { fromSessionId: string; offer: RTCSessionDescriptionInit }) => {
      callbacks.onOffer?.(data);
    });

    socket.on('answer', (data: { fromSessionId: string; answer: RTCSessionDescriptionInit }) => {
      callbacks.onAnswer?.(data);
    });

    socket.on('ice_candidate', (data: { fromSessionId: string; candidate: RTCIceCandidateInit }) => {
      callbacks.onIceCandidate?.(data);
    });

    socket.on('waiting', (data: { queuePosition: number; message: string }) => {
      callbacks.onWaiting?.(data);
    });

    socket.on('error', (data: { message: string }) => {
      callbacks.onError?.(data);
    });

    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    callbacks.onError?.({ message: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.' });
    return;
  }

  disconnectRealtime();

  sessionChannel = supabase
    .channel(`session:${sessionId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'matched' }, ({ payload }) => {
      const data = payload as {
        matchId: string;
        partnerSessionId: string;
        isInitiator: boolean;
        iceServers: IceServerConfig[];
      };
      partnerSessionId = data.partnerSessionId;
      subscribeToMatchChannel(data.matchId, callbacks);
      callbacks.onMatched?.(data);
    })
    .on('broadcast', { event: 'partner_left' }, ({ payload }) => {
      cleanupMatchChannel();
      callbacks.onPartnerLeft?.(payload as { reason: string });
    })
    .on('broadcast', { event: 'searching' }, ({ payload }) => {
      callbacks.onSearching?.(payload as { message: string });
    })
    .on('broadcast', { event: 'partner_liked' }, ({ payload }) => {
      callbacks.onPartnerLiked?.(payload as { matchId: string });
    })
    .on('broadcast', { event: 'mutual_like' }, ({ payload }) => {
      callbacks.onMutualLike?.(payload as { matchId: string; partnerSessionId: string });
    })
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      callbacks.onNewMessage?.(payload as { matchId: string; senderSessionId: string; message: string; createdAt: string });
    })
    .on('broadcast', { event: 'partner_typing' }, ({ payload }) => {
      callbacks.onPartnerTyping?.(payload as { typing: boolean });
    })
    .subscribe();
}

export function disconnectRealtime(): void {
  if (config.signalingProvider === 'socketio') {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    currentMatchId = null;
    partnerSessionId = null;
    return;
  }

  const supabase = getSupabaseClient();
  cleanupMatchChannel();

  if (sessionChannel && supabase) {
    supabase.removeChannel(sessionChannel);
    sessionChannel = null;
  }
}

export async function joinQueue(sessionId: string, sessionToken: string, callbacks: RealtimeCallbacks) {
  if (config.signalingProvider === 'socketio') {
    socket?.emit('join_queue');
    return;
  }

  const result = await apiPost<{ success: boolean; data: Record<string, unknown> }>('/match/join', {
    sessionId,
    sessionToken,
  });

  const data = result.data;

  if (data.status === 'waiting') {
    callbacks.onWaiting?.({
      queuePosition: (data.queuePosition as number) ?? 1,
      message: (data.message as string) ?? 'Waiting for a partner...',
    });
    return;
  }

  if (data.status === 'matched') {
    const matchId = data.matchId as string;
    partnerSessionId = data.partnerSessionId as string;
    subscribeToMatchChannel(matchId, callbacks);
    callbacks.onMatched?.({
      matchId,
      partnerSessionId: data.partnerSessionId as string,
      isInitiator: data.isInitiator as boolean,
      iceServers: data.iceServers as IceServerConfig[],
    });
  }
}

export async function leaveQueue(sessionId: string, sessionToken: string) {
  if (config.signalingProvider === 'socketio') {
    socket?.emit('leave_queue');
    return;
  }

  await apiPost('/match/leave', { sessionId, sessionToken });
}

export async function nextPartner(sessionId: string, sessionToken: string, callbacks: RealtimeCallbacks) {
  if (config.signalingProvider === 'socketio') {
    currentMatchId = null;
    partnerSessionId = null;
    socket?.emit('next');
    return;
  }

  cleanupMatchChannel();

  const result = await apiPost<{ success: boolean; data: Record<string, unknown> }>('/match/next', {
    sessionId,
    sessionToken,
  });

  const data = result.data;

  if (data.status === 'waiting') {
    callbacks.onWaiting?.({
      queuePosition: (data.queuePosition as number) ?? 1,
      message: 'Finding a new partner...',
    });
    return;
  }

  if (data.status === 'matched') {
    const matchId = data.matchId as string;
    partnerSessionId = data.partnerSessionId as string;
    subscribeToMatchChannel(matchId, callbacks);
    callbacks.onMatched?.({
      matchId,
      partnerSessionId: data.partnerSessionId as string,
      isInitiator: data.isInitiator as boolean,
      iceServers: data.iceServers as IceServerConfig[],
    });
  }
}

export async function notifyDisconnect(sessionId: string, sessionToken: string, reason: string) {
  if (config.signalingProvider === 'socketio') {
    // Socket.io handles disconnect natively on connection loss
    return;
  }

  try {
    await apiPost('/match/disconnect', { sessionId, sessionToken, reason });
  } catch {
    // Best-effort on page unload
  }
}

export function sendOffer(fromSessionId: string, offer: RTCSessionDescriptionInit): void {
  if (config.signalingProvider === 'socketio') {
    if (partnerSessionId) {
      socket?.emit('offer', { targetSessionId: partnerSessionId, offer });
    }
    return;
  }

  matchChannel?.send({
    type: 'broadcast',
    event: 'offer',
    payload: { fromSessionId, offer },
  });
}

export function sendAnswer(fromSessionId: string, answer: RTCSessionDescriptionInit): void {
  if (config.signalingProvider === 'socketio') {
    if (partnerSessionId) {
      socket?.emit('answer', { targetSessionId: partnerSessionId, answer });
    }
    return;
  }

  matchChannel?.send({
    type: 'broadcast',
    event: 'answer',
    payload: { fromSessionId, answer },
  });
}

export function sendIceCandidate(fromSessionId: string, candidate: RTCIceCandidateInit): void {
  if (config.signalingProvider === 'socketio') {
    if (partnerSessionId) {
      socket?.emit('ice_candidate', { targetSessionId: partnerSessionId, candidate });
    }
    return;
  }

  matchChannel?.send({
    type: 'broadcast',
    event: 'ice_candidate',
    payload: { fromSessionId, candidate },
  });
}

export function getCurrentMatchId(): string | null {
  return currentMatchId;
}

export function sendTyping(typing: boolean): void {
  if (config.signalingProvider === 'socketio') {
    socket?.emit('typing', { typing });
    return;
  }

  matchChannel?.send({
    type: 'broadcast',
    event: 'typing',
    payload: { typing },
  });
}

export function emitLikePartner(matchId: string): void {
  socket?.emit('like_partner', { matchId });
}

export function emitChatMessage(matchId: string, message: string): void {
  socket?.emit('chat_message', { matchId, message });
}
