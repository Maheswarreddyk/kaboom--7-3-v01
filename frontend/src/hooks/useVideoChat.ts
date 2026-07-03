import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext.js';
import { apiService } from '../services/api.js';
import {
  connectRealtime,
  disconnectRealtime,
  joinQueue,
  leaveQueue,
  nextPartner,
  notifyDisconnect,
  sendAnswer,
  sendIceCandidate,
  sendOffer,
  sendTyping,
  emitLikePartner,
  emitChatMessage,
  emitHeartbeat,
} from '../services/realtime.js';
import { config } from '../config.js';
import { webrtcManager } from '../webrtc/index.js';
import type { ChatState, ConnectionStatus } from '../types/index.js';

const initialChatState: ChatState = {
  status: 'idle',
  connectionStatus: 'disconnected',
  partnerSessionId: null,
  matchId: null,
  isInitiator: false,
  isMuted: false,
  isCameraOff: false,
  isFullscreen: false,
  matchStartTime: null,
  queuePosition: 0,
};

export function useVideoChat(sessionId: string | null, sessionToken: string | null) {
  const { showToast } = useToast();
  const [chatState, setChatState] = useState<ChatState>(initialChatState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const partnerSessionIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const callbacksRef = useRef<ReturnType<typeof buildCallbacks> | null>(null);

  sessionIdRef.current = sessionId;
  sessionTokenRef.current = sessionToken;

  const updateChatState = useCallback((updates: Partial<ChatState>) => {
    setChatState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setupWebRTC = useCallback(async () => {
    webrtcManager.setCallbacks({
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        updateChatState({ connectionStatus: 'connected', status: 'connected' });
      },
      onConnectionStateChange: (state) => {
        const statusMap: Record<RTCPeerConnectionState, ConnectionStatus> = {
          new: 'connecting',
          connecting: 'connecting',
          connected: 'connected',
          disconnected: 'reconnecting',
          failed: 'failed',
          closed: 'disconnected',
        };
        updateChatState({ connectionStatus: statusMap[state] });

        if (state === 'failed') {
          showToast('error', 'Connection failed. Trying again...');
        }
      },
      onIceCandidate: (candidate) => {
        const partnerId = partnerSessionIdRef.current;
        const fromSessionId = sessionIdRef.current;
        if (partnerId && fromSessionId) {
          sendIceCandidate(fromSessionId, candidate);
        }
      },
    });
  }, [showToast, updateChatState]);

  const handleMatched = useCallback(
    async (data: {
      matchId: string;
      partnerSessionId: string;
      isInitiator: boolean;
      iceServers: { urls: string | string[] }[];
    }) => {
      partnerSessionIdRef.current = data.partnerSessionId;

      webrtcManager.setIceServers(data.iceServers);
      webrtcManager.createPeerConnection();

      updateChatState({
        status: 'matched',
        connectionStatus: 'connecting',
        partnerSessionId: data.partnerSessionId,
        matchId: data.matchId,
        isInitiator: data.isInitiator,
        matchStartTime: Date.now(),
        liked: false,
        partnerLiked: false,
        mutualLike: false,
        messages: [],
        unreadCount: 0,
        partnerTyping: false,
      });

      if (data.isInitiator) {
        try {
          const offer = await webrtcManager.createOffer();
          if (sessionIdRef.current) {
            sendOffer(sessionIdRef.current, offer);
          }
        } catch (error) {
          showToast('error', 'Failed to create connection offer');
          console.error(error);
        }
      }
    },
    [showToast, updateChatState]
  );

  function buildCallbacks() {
    return {
      onWaiting: (data: { queuePosition: number; message: string }) => {
        updateChatState({
          status: 'waiting',
          queuePosition: data.queuePosition,
          connectionStatus: 'connecting',
        });
      },
      onMatchFound: (data: { matchId: string; partnerSessionId: string }) => {
        partnerSessionIdRef.current = data.partnerSessionId;
        updateChatState({
          status: 'reserved',
          partnerSessionId: data.partnerSessionId,
          matchId: data.matchId,
          connectionStatus: 'connecting',
        });
      },
      onMatched: handleMatched,
      onPartnerLeft: () => {
        setRemoteStream(null);
        webrtcManager.resetConnection();
        updateChatState({
          status: 'waiting',
          connectionStatus: 'connecting',
          partnerSessionId: null,
          matchId: null,
          matchStartTime: null,
          liked: false,
          partnerLiked: false,
          mutualLike: false,
          messages: [],
          unreadCount: 0,
          partnerTyping: false,
        });
        showToast('info', 'Partner left. Finding someone new...');
      },
      onSearching: (data: { message: string }) => {
        updateChatState({ status: 'waiting', connectionStatus: 'connecting' });
        showToast('info', data.message);
      },
      onError: (data: { message: string }) => {
        showToast('error', data.message);
      },
      onMutualLike: () => {
        updateChatState({ mutualLike: true });
      },
      onNewMessage: (data: { matchId: string; senderSessionId: string; message: string; createdAt: string }) => {
        setChatState((prev) => {
          const newMessages = prev.messages ? [...prev.messages] : [];
          newMessages.push({
            id: Math.random().toString(),
            senderSessionId: data.senderSessionId,
            message: data.message,
            createdAt: new Date(data.createdAt).getTime(),
          });
          const unread = prev.isChatOpen ? 0 : (prev.unreadCount || 0) + 1;
          return {
            ...prev,
            messages: newMessages,
            unreadCount: unread,
          };
        });
      },
      onPartnerTyping: (data: { typing: boolean }) => {
        updateChatState({ partnerTyping: data.typing });
      },
      onOffer: async (data: { fromSessionId: string; offer: RTCSessionDescriptionInit }) => {
        try {
          const answer = await webrtcManager.handleOffer(data.offer);
          if (sessionIdRef.current) {
            sendAnswer(sessionIdRef.current, answer);
          }
        } catch (error) {
          showToast('error', 'Failed to handle connection offer');
          console.error(error);
        }
      },
      onAnswer: async (data: { answer: RTCSessionDescriptionInit }) => {
        try {
          await webrtcManager.handleAnswer(data.answer);
        } catch (error) {
          showToast('error', 'Failed to handle connection answer');
          console.error(error);
        }
      },
      onIceCandidate: async (data: { candidate: RTCIceCandidateInit }) => {
        await webrtcManager.addIceCandidate(data.candidate);
      },
    };
  }

  const startChat = useCallback(async () => {
    if (!sessionId || !sessionToken) {
      showToast('error', 'Session not initialized');
      return;
    }

    try {
      updateChatState({ status: 'starting', connectionStatus: 'connecting' });

      const stream = await webrtcManager.getLocalMedia();
      setLocalStream(stream);
      await setupWebRTC();

      const callbacks = buildCallbacks();
      callbacksRef.current = callbacks;
      connectRealtime(sessionId, sessionToken, callbacks);

      await joinQueue(sessionId, sessionToken, callbacks);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera and microphone permissions are required'
          : error instanceof Error
            ? error.message
            : 'Failed to start chat. Please check your camera and microphone.';
      showToast('error', message);
      updateChatState({ status: 'idle', connectionStatus: 'disconnected' });
    }
  }, [sessionId, sessionToken, showToast, setupWebRTC, handleMatched, updateChatState]);

  const stopChat = useCallback(async () => {
    if (sessionIdRef.current && sessionTokenRef.current) {
      await notifyDisconnect(sessionIdRef.current, sessionTokenRef.current, 'leave');
    }
    await leaveQueue(sessionIdRef.current ?? '', sessionTokenRef.current ?? '').catch(() => {});
    disconnectRealtime();
    webrtcManager.cleanup();
    setLocalStream(null);
    setRemoteStream(null);
    setChatState(initialChatState);
    partnerSessionIdRef.current = null;
  }, []);

  const handleNext = useCallback(async () => {
    if (!sessionIdRef.current || !sessionTokenRef.current || !callbacksRef.current) return;

    setRemoteStream(null);
    webrtcManager.resetConnection();
    webrtcManager.createPeerConnection();
    updateChatState({
      status: 'waiting',
      connectionStatus: 'connecting',
      partnerSessionId: null,
      matchId: null,
      matchStartTime: null,
    });

    await nextPartner(sessionIdRef.current, sessionTokenRef.current, callbacksRef.current);
  }, [updateChatState]);

  const toggleMute = useCallback(() => {
    setChatState((prev) => {
      const newMuted = !prev.isMuted;
      webrtcManager.toggleMute(newMuted);
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setChatState((prev) => {
      const cameraOn = prev.isCameraOff;
      webrtcManager.toggleCamera(cameraOn);
      return { ...prev, isCameraOff: !prev.isCameraOff };
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setChatState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  useEffect(() => {
    if (chatState.status === 'idle' || !sessionId || !sessionToken || !callbacksRef.current) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        if (config.signalingProvider === 'socketio') {
          emitHeartbeat();
        } else {
          if (chatState.status === 'waiting') {
            await joinQueue(sessionId, sessionToken, callbacksRef.current!);
          }
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, config.signalingProvider === 'socketio' ? 5000 : 8000);

    return () => clearInterval(interval);
  }, [chatState.status, sessionId, sessionToken]);

  useEffect(() => {
    const handleUnload = () => {
      if (sessionIdRef.current && sessionTokenRef.current) {
        notifyDisconnect(sessionIdRef.current, sessionTokenRef.current, 'disconnect');
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      webrtcManager.cleanup();
      disconnectRealtime();
    };
  }, []);

  const updatePreferences = useCallback(async (prefs: any) => {
    if (!sessionId || !sessionToken) return;
    try {
      await apiService.submitPreferences(sessionId, sessionToken, prefs);
      setChatState((prev) => ({
        ...prev,
        gender: prefs.gender,
        lookingFor: prefs.looking_for,
        languages: prefs.languages,
        country: prefs.country,
        state: prefs.state,
        district: prefs.district,
        city: prefs.city,
        interestTags: prefs.interest_tags,
      }));
    } catch (error) {
      showToast('error', 'Failed to update preferences');
    }
  }, [sessionId, sessionToken, showToast]);

  const likePartner = useCallback(async () => {
    if (!sessionId || !sessionToken || !chatState.matchId || chatState.liked) return;

    // Optimistic UI: animate immediately, do not notify partner
    setChatState((prev) => ({ ...prev, liked: true, likeAnimating: true }));
    if ('vibrate' in navigator) navigator.vibrate(50);

    setTimeout(() => {
      setChatState((prev) => ({ ...prev, likeAnimating: false }));
    }, 600);

    try {
      if (config.signalingProvider === 'socketio') {
        emitLikePartner(chatState.matchId);
      } else {
        const result = await apiService.submitLike(sessionId, sessionToken, chatState.matchId);
        if (result.mutual) {
          setChatState((prev) => ({ ...prev, mutualLike: true }));
        }
      }
    } catch (error) {
      setChatState((prev) => ({ ...prev, liked: false, likeAnimating: false }));
      showToast('error', 'Failed to like partner');
    }
  }, [sessionId, sessionToken, chatState.matchId, chatState.liked, showToast]);

  const sendChatMessage = useCallback(async (message: string) => {
    if (!sessionId || !sessionToken || !chatState.matchId) return;
    try {
      if (config.signalingProvider === 'socketio') {
        emitChatMessage(chatState.matchId, message);
        setChatState((prev) => {
          const newMessages = prev.messages ? [...prev.messages] : [];
          newMessages.push({
            id: Math.random().toString(),
            senderSessionId: sessionId,
            message,
            createdAt: Date.now(),
          });
          return { ...prev, messages: newMessages };
        });
      } else {
        const msg = await apiService.submitChatMessage(sessionId, sessionToken, chatState.matchId, message);
        setChatState((prev) => {
          const newMessages = prev.messages ? [...prev.messages] : [];
          newMessages.push({
            id: Math.random().toString(),
            senderSessionId: sessionId,
            message,
            createdAt: new Date(msg.created_at).getTime(),
          });
          return { ...prev, messages: newMessages };
        });
      }
    } catch (error) {
      showToast('error', 'Failed to send message');
    }
  }, [sessionId, sessionToken, chatState.matchId, showToast]);

  const setTypingStatus = useCallback((typing: boolean) => {
    sendTyping(typing);
  }, []);

  const setChatOpen = useCallback((open: boolean) => {
    setChatState((prev) => ({
      ...prev,
      isChatOpen: open,
      unreadCount: open ? 0 : prev.unreadCount,
    }));
  }, []);

  const dismissMutualLike = useCallback(() => {
    setChatState((prev) => ({ ...prev, mutualLike: false }));
  }, []);

  return {
    chatState,
    localStream,
    remoteStream,
    startChat,
    stopChat,
    handleNext,
    toggleMute,
    toggleCamera,
    toggleFullscreen,
    updatePreferences,
    likePartner,
    sendChatMessage,
    setTypingStatus,
    setChatOpen,
    dismissMutualLike,
  };
}
