import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatControls } from '../components/ChatControls.js';
import { ConnectionStatusBadge } from '../components/ConnectionStatusBadge.js';
import { FeedbackModal } from '../components/FeedbackModal.js';
import { LoadingScreen } from '../components/LoadingScreen.js';
import { ReportModal } from '../components/ReportModal.js';
import { SearchingAnimation } from '../components/SearchingAnimation.js';
import { VideoPlayer } from '../components/VideoPlayer.js';
import { DraggableLocalVideo } from '../components/DraggableLocalVideo.js';
import { PreferenceModal } from '../components/PreferenceModal.js';
import { TemporaryChat } from '../components/TemporaryChat.js';
import { useSession } from '../contexts/SessionContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { useVideoChat } from '../hooks/useVideoChat.js';
import { apiService } from '../services/api.js';
import type { ReportReason } from '../types/index.js';
import { formatDuration } from '../utils/index.js';
import { cn } from '../utils/index.js';

export function ChatPage() {
  const navigate = useNavigate();
  const { session, endSession, startSession, isLoading } = useSession();
  const { showToast } = useToast();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [initializing, setInitializing] = useState(false);
  const chatStartedRef = useRef(false);
  const pendingLeaveRef = useRef(false);

  const {
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
  } = useVideoChat(session?.sessionId ?? null, session?.sessionToken ?? null);

  useEffect(() => {
    if (session) return;

    let cancelled = false;
    setInitializing(true);

    startSession()
      .catch((error) => {
        if (!cancelled) {
          showToast('error', error instanceof Error ? error.message : 'Failed to start session');
          navigate('/');
        }
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, startSession, showToast, navigate]);

  useEffect(() => {
    if (!session) return;

    if (chatStartedRef.current) return;
    chatStartedRef.current = true;
    startChat();
  }, [session, startChat]);

  useEffect(() => {
    if (!chatState.matchStartTime || chatState.status !== 'connected') {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - chatState.matchStartTime!) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [chatState.matchStartTime, chatState.status]);

  const handleLeave = async () => {
    pendingLeaveRef.current = true;
    stopChat();
    setShowFeedbackModal(true);
  };

  const finishLeave = async () => {
    try {
      await endSession();
    } catch {
      // Session end is best-effort
    }
    navigate('/');
    showToast('info', 'You left the chat');
    pendingLeaveRef.current = false;
  };

  const handleFeedbackSubmit = async (rating: number, feedback: string) => {
    if (session) {
      try {
        await apiService.submitFeedback(session.sessionId, rating, feedback || undefined);
        showToast('success', 'Thanks for your feedback!');
      } catch {
        // Feedback is optional
      }
    }
    setShowFeedbackModal(false);
    await finishLeave();
  };

  const handleFeedbackClose = async () => {
    setShowFeedbackModal(false);
    if (pendingLeaveRef.current) {
      await finishLeave();
    }
  };

  const handleReport = async (reason: ReportReason, notes: string) => {
    if (!session || !chatState.partnerSessionId) {
      showToast('error', 'No partner to report');
      return;
    }

    try {
      await apiService.submitReport(
        session.sessionId,
        chatState.partnerSessionId,
        reason,
        notes || undefined
      );
      showToast('success', 'Report submitted. Thank you for keeping the community safe.');
      handleNext();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to submit report');
    }
  };

  if (!session || initializing || isLoading) {
    return <LoadingScreen message="Setting up your chat..." />;
  }

  const isSearching = chatState.status === 'waiting' || chatState.status === 'starting';
  const isConnected = chatState.status === 'connected';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col sm:flex-row bg-slate-950">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-slate-900/40">
          <ConnectionStatusBadge status={chatState.connectionStatus} />
          <div className="flex items-center gap-4">
            {isConnected && (
              <span className="text-sm text-white/50 font-mono">{formatDuration(elapsedSeconds)}</span>
            )}
            <span className="text-xs text-white/40 hidden sm:inline">
              Session: {session.sessionId.slice(0, 8)}...
            </span>
          </div>
        </div>

        <div className="flex-1 relative p-2 sm:p-4 flex flex-col items-center justify-center min-h-[50vh]">
          <div
            className={cn(
              'relative w-full h-full rounded-2xl overflow-hidden glass max-w-6xl shadow-2xl flex flex-col',
              chatState.isFullscreen ? 'fixed inset-0 z-40 rounded-none max-w-none' : ''
            )}
          >
            <VideoPlayer
              stream={remoteStream}
              className="w-full h-full object-cover"
              placeholder={isSearching ? 'Looking for a partner...' : 'Partner video will appear here'}
            />

            {isSearching && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <SearchingAnimation queuePosition={chatState.queuePosition} />
              </div>
            )}

            <DraggableLocalVideo stream={localStream} />
          </div>
        </div>

        <div className="px-4 py-6 border-t border-white/5 bg-slate-900/20">
          <ChatControls
            isMuted={chatState.isMuted}
            isCameraOff={chatState.isCameraOff}
            isFullscreen={chatState.isFullscreen}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onNext={handleNext}
            onReport={() => setShowReportModal(true)}
            onLeave={handleLeave}
            onToggleFullscreen={toggleFullscreen}
            disabled={isSearching}
            isChatOpen={chatState.isChatOpen}
            onToggleChat={() => setChatOpen(!chatState.isChatOpen)}
            liked={chatState.liked}
            onLike={likePartner}
            onOpenPreferences={() => setShowPreferenceModal(true)}
            unreadCount={chatState.unreadCount}
          />
        </div>
      </div>

      {chatState.isChatOpen && (
        <TemporaryChat
          isOpen={chatState.isChatOpen}
          onClose={() => setChatOpen(false)}
          messages={chatState.messages || []}
          onSendMessage={sendChatMessage}
          selfSessionId={session.sessionId}
          partnerTyping={chatState.partnerTyping || false}
          onTyping={setTypingStatus}
        />
      )}

      <PreferenceModal
        isOpen={showPreferenceModal}
        onClose={() => setShowPreferenceModal(false)}
        onSave={updatePreferences}
        currentPreferences={{
          gender: chatState.gender,
          looking_for: chatState.lookingFor,
          languages: chatState.languages,
          country: chatState.country,
          state: chatState.state,
          district: chatState.district,
          city: chatState.city,
          interest_tags: chatState.interestTags,
        }}
      />

      {chatState.mutualLike && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg overflow-hidden">
          {/* Confetti & Hearts background elements */}
          <div className="absolute inset-0 pointer-events-none flex justify-around opacity-50">
            <span className="text-6xl animate-slide-up" style={{ animationDuration: '2s' }}>❤️</span>
            <span className="text-5xl animate-pulse-slow">✨</span>
            <span className="text-7xl animate-slide-up" style={{ animationDuration: '3s' }}>🎉</span>
            <span className="text-5xl animate-pulse-slow">❤️</span>
            <span className="text-6xl animate-slide-up" style={{ animationDuration: '2.5s' }}>🎊</span>
          </div>

          <div className="p-8 md:p-12 bg-slate-900 border border-white/20 rounded-3xl text-center shadow-[0_0_100px_rgba(99,102,241,0.3)] max-w-lg w-[90%] animate-scale-up glass relative z-10">
            <div className="flex justify-center gap-4 mb-6">
              <span className="text-7xl animate-bounce block">🎉</span>
              <span className="text-7xl animate-pulse block">❤️</span>
            </div>
            
            <h3 className="text-4xl font-black text-white mt-4 bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Mutual Match!
            </h3>
            
            <p className="text-lg text-white/90 mt-4 font-medium">
              You and your partner both liked each other!
            </p>

            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-white/60">
                🔒 <span className="font-semibold text-white/80">Anonymous Connection</span>
                <br />
                Your conversation remains completely anonymous until you choose to reveal your identity.
              </p>
            </div>

            <button
              onClick={() => {
                setChatOpen(true);
                dismissMutualLike(); // Hide overlay after opening chat
              }}
              className="mt-8 px-8 py-4 bg-gradient-to-r from-accent to-purple-650 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(99,102,241,0.5)] w-full"
            >
              Start Chatting Now
            </button>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}
