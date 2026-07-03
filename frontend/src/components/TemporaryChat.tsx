import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../utils/index.js';

interface Message {
  id: string;
  senderSessionId: string;
  message: string;
  createdAt: number;
}

interface TemporaryChatProps {
  variant: 'sidebar' | 'sheet';
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (msg: string) => void;
  selfSessionId: string;
  partnerTyping: boolean;
  onTyping: (typing: boolean) => void;
}

const EMOJIS = ['👋', '😊', '😂', '🔥', '❤️', '👍', '🙏', '🎉'];

function ChatContent({
  messages,
  onSendMessage,
  selfSessionId,
  partnerTyping,
  onTyping,
  onClose,
}: {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  selfSessionId: string;
  partnerTyping: boolean;
  onTyping: (typing: boolean) => void;
  onClose: () => void;
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-edge flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse-soft" aria-hidden="true" />
          <h3 className="text-caption font-semibold text-content-primary">Match Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center text-content-tertiary hover:text-content-primary transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[120px]">
            <div className="w-12 h-12 rounded-2xl bg-brand-muted flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-caption text-content-tertiary max-w-[200px] leading-relaxed">
              Say hello! Messages disappear when the call ends.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderSessionId === selfSessionId;
            return (
              <div
                key={msg.id}
                className={cn('flex flex-col max-w-[82%] animate-slide-up', isSelf ? 'self-end ml-auto' : 'self-start')}
              >
                <div className={isSelf ? 'chat-bubble-self' : 'chat-bubble-partner'}>
                  <p className="break-words">{msg.message}</p>
                </div>
                <span className={cn('text-micro text-content-tertiary mt-1 px-1', isSelf && 'text-right')}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}

        {partnerTyping && (
          <div className="chat-bubble-partner self-start flex items-center gap-2 py-3">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-content-tertiary animate-search-dot"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            <span className="text-micro text-content-tertiary">Typing…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-edge flex items-center gap-2 flex-shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-xl hover:bg-white/8 flex items-center justify-center text-lg transition-colors"
            aria-label="Emoji picker"
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 p-2 surface-elevated rounded-xl grid grid-cols-4 gap-1 shadow-soft-lg z-20 animate-scale-up">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setInputText((p) => p + e); setShowEmojiPicker(false); }}
                  className="w-9 h-9 text-lg hover:bg-white/8 rounded-lg flex items-center justify-center transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          placeholder="Type a message…"
          value={inputText}
          onChange={handleInputChange}
          maxLength={500}
          className="input-field flex-1 min-w-0 py-2.5"
          aria-label="Message input"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center disabled:opacity-35 hover:bg-brand-hover active:scale-95 transition-all flex-shrink-0"
          aria-label="Send message"
        >
          <svg className="w-4 h-4 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </>
  );
}

export function TemporaryChat({
  variant,
  isOpen,
  onClose,
  messages,
  onSendMessage,
  selfSessionId,
  partnerTyping,
  onTyping,
}: TemporaryChatProps) {
  if (!isOpen) return null;

  if (variant === 'sidebar') {
    return (
      <div className="hidden md:flex flex-col w-80 lg:w-96 border-l border-edge bg-surface flex-shrink-0 animate-slide-in">
        <ChatContent
          messages={messages}
          onSendMessage={onSendMessage}
          selfSessionId={selfSessionId}
          partnerTyping={partnerTyping}
          onTyping={onTyping}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col bg-surface border-t border-edge rounded-t-3xl shadow-soft-xl animate-slide-up max-h-[68dvh]"
      role="dialog"
      aria-label="Chat"
    >
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
        <div className="w-9 h-1 rounded-full bg-white/20" />
      </div>
      <ChatContent
        messages={messages}
        onSendMessage={onSendMessage}
        selfSessionId={selfSessionId}
        partnerTyping={partnerTyping}
        onTyping={onTyping}
        onClose={onClose}
      />
    </div>
  );
}
