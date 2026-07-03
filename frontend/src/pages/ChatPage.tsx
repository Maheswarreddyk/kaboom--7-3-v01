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
import { MutualLikeOverlay } from '../components/MutualLikeOverlay.js';
import { useSession } from '../contexts/SessionContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { useVideoChat } from '../hooks/useVideoChat.js';
import { apiService } from '../services/api.js';
import type { ReportReason } from '../types/index.js';
import { formatDuration, cn } from '../utils/index.js';

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
      .finally(() => { if (!cancelled) setInitializing(false); });
    return () => { cancelled = true; };
  }, [session, startSession, showToast, navigate]);

  useEffect(() => {
    if (!session || chatStartedRef.current) return;
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
    try { await endSession(); } catch { /* best-effort */ }
    navigate('/');
    showToast('info', 'You left the chat');
    pendingLeaveRef.current = false;
  };

  const handleFeedbackSubmit = async (rating: number, feedback: string) => {
    if (session) {
      try {
        await apiService.submitFeedback(session.sessionId, rating, feedback || undefined);
        showToast('success', 'Thanks for your feedback!');
      } catch { /* optional */ }
    }
    setShowFeedbackModal(false);
    await finishLeave();
  };

  const handleFeedbackClose = async () => {
    setShowFeedbackModal(false);
    if (pendingLeaveRef.current) await finishLeave();
  };

  const handleReport = async (reason: ReportReason, notes: string) => {
    if (!session || !chatState.partnerSessionId) {
      showToast('error', 'No partner to report');
      return;
    }
    try {
      await apiService.submitReport(session.sessionId, chatState.partnerSessionId, reason, notes || undefined);
      showToast('success', 'Report submitted. Thank you for keeping the community safe.');
      handleNext();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to submit report');
    }
  };

  if (!session || initializing || isLoading) {
    return <LoadingScreen message="Setting up your chat…" />;
  }

  const isSearching = chatState.status === 'waiting' || chatState.status === 'starting';
  const isConnected = chatState.status === 'connected';

  return (
    <div
      className={cn(
        'flex flex-col bg-canvas',
        'fixed inset-0 z-30 h-[100dvh] w-full',
        'sm:relative sm:inset-auto sm:z-auto sm:h-[calc(100dvh-4rem)]',
        chatState.isFullscreen && 'sm:fixed sm:inset-0 sm:z-50 sm:h-[100dvh]'
      )}
    >
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Video area */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          {/* Status bar */}
          <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-edge bg-surface/80 backdrop-blur-glass pt-[max(0.5rem,env(safe-area-inset-top))]">
            <ConnectionStatusBadge status={chatState.connectionStatus} />
            <div className="flex items-center gap-3">
              {isConnected && (
                <span className="text-caption text-content-tertiary font-mono tabular-nums">
                  {formatDuration(elapsedSeconds)}
                </span>
              )}
            </div>
          </div>

          {/* Partner video — immersive */}
          <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
            <VideoPlayer
              stream={remoteStream}
              className="absolute inset-0 w-full h-full object-cover"
              placeholder={isSearching ? 'Finding someone to chat with…' : 'Partner video will appear here'}
            />

            {isSearching && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
                <SearchingAnimation queuePosition={chatState.queuePosition} />
              </div>
            )}

            <DraggableLocalVideo stream={localStream} />
          </div>

          {/* Controls toolbar */}
          <div className="flex-shrink-0 px-3 sm:px-4 py-4 border-t border-edge bg-surface/90 backdrop-blur-glass pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
              likeAnimating={chatState.likeAnimating}
              onLike={likePartner}
              onOpenPreferences={() => setShowPreferenceModal(true)}
              unreadCount={chatState.unreadCount}
            />
          </div>
        </div>

        {/* Desktop chat sidebar */}
        <TemporaryChat
          variant="sidebar"
          isOpen={chatState.isChatOpen ?? false}
          onClose={() => setChatOpen(false)}
          messages={chatState.messages || []}
          onSendMessage={sendChatMessage}
          selfSessionId={session.sessionId}
          partnerTyping={chatState.partnerTyping || false}
          onTyping={setTypingStatus}
        />
      </div>

      {/* Mobile chat sheet */}
      <TemporaryChat
        variant="sheet"
        isOpen={chatState.isChatOpen ?? false}
        onClose={() => setChatOpen(false)}
        messages={chatState.messages || []}
        onSendMessage={sendChatMessage}
        selfSessionId={session.sessionId}
        partnerTyping={chatState.partnerTyping || false}
        onTyping={setTypingStatus}
      />

      {chatState.mutualLike && <MutualLikeOverlay onDismiss={dismissMutualLike} />}

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

      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onSubmit={handleReport} />
      <FeedbackModal isOpen={showFeedbackModal} onClose={handleFeedbackClose} onSubmit={handleFeedbackSubmit} />
    </div>
  );
}
