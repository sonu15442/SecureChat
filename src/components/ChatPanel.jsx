import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Phone, Video, MoreVertical, ShieldCheck, ShieldAlert, Check, CheckCheck, Clock, Lock, X, Users } from 'lucide-react';
import { extractUrls, analyzeUrl } from '../utils/linkDetector';
import { EMOJI_CATEGORIES } from '../utils/initialData';
import { broadcastTyping, on } from '../utils/realtimeChannel';

export default function ChatPanel({
  messages,
  onSendMessage,
  onOpenLinkModal,
  onOpenVoiceCall,
  onOpenVideoCall,
  currentUser,
  onlineUsers,
  onToggleMobileSidebar
}) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for typing indicators from other users
  useEffect(() => {
    const unsub = on('typing', ({ userId, userName, timestamp }) => {
      setTypingUsers(prev => {
        const existing = prev.filter(t => t.userId !== userId);
        return [...existing, { userId, userName, timestamp }];
      });
    });

    // Clear stale typing indicators
    const timer = setInterval(() => {
      setTypingUsers(prev => prev.filter(t => Date.now() - t.timestamp < 3000));
    }, 1000);

    return () => { unsub(); clearInterval(timer); };
  }, []);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedImage(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text && !selectedImage) return;

    onSendMessage({
      text: text || '',
      imageUrl: selectedImage || null
    });

    setInputText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    // Broadcast typing indicator
    if (currentUser) {
      broadcastTyping(currentUser.id, currentUser.name);
    }
  };

  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || inputText.length;
      const newText = inputText.slice(0, start) + emoji + inputText.slice(start);
      setInputText(newText);
      setTimeout(() => {
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
      }, 10);
    } else {
      setInputText(prev => prev + emoji);
    }
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    const urls = extractUrls(text);
    if (urls.length === 0) return <span>{text}</span>;

    let result = [];
    let lastIdx = 0;

    urls.forEach((url, i) => {
      const urlIdx = text.indexOf(url, lastIdx);
      const rawIdx = urlIdx >= 0 ? urlIdx : text.indexOf(url.replace('https://', ''), lastIdx);
      const startIdx = Math.max(0, rawIdx >= 0 ? rawIdx : lastIdx);

      if (startIdx > lastIdx) {
        result.push(<span key={`t-${i}`}>{text.substring(lastIdx, startIdx)}</span>);
      }

      const analysis = analyzeUrl(url);
      result.push(
        <button
          key={`l-${i}`}
          onClick={() => onOpenLinkModal(analysis)}
          className="msg-link inline-flex items-center gap-1"
          title="Click to scan link"
        >
          {analysis.status === 'dangerous' ? (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 inline" />
          ) : analysis.status === 'suspicious' ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 inline" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
          )}
          <span>{url}</span>
        </button>
      );

      const urlInText = text.indexOf(url, lastIdx);
      if (urlInText >= 0) {
        lastIdx = urlInText + url.length;
      } else {
        const rawUrl = url.replace(/^https?:\/\//, '');
        const rawInText = text.indexOf(rawUrl, lastIdx);
        if (rawInText >= 0) {
          lastIdx = rawInText + rawUrl.length;
        } else {
          lastIdx = startIdx + url.length;
        }
      }
    });

    if (lastIdx < text.length) {
      result.push(<span key="end">{text.substring(lastIdx)}</span>);
    }

    return <>{result}</>;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-4 h-4 text-sky-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-[var(--text-secondary)]" />;
      case 'sent':
        return <Check className="w-4 h-4 text-[var(--text-secondary)]" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />;
    }
  };

  const totalOnline = onlineUsers.length + 1;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]">

      {/* ── Chat Header ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          {/* Mobile drawer toggle button */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition"
            title="Open Online Users"
          >
            <Users className="w-5 h-5 text-[var(--bg-accent)]" />
          </button>

          <div className="p-2 rounded-xl bg-[var(--bg-accent)]/10">
            <ShieldCheck className="w-6 h-6 text-[var(--bg-accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              SecureChat Room
              <Lock className="w-3.5 h-3.5 text-[var(--bg-accent)]" />
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalOnline} {totalOnline === 1 ? 'user' : 'users'} online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="voice-call-btn"
            onClick={onOpenVoiceCall}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            id="video-call-btn"
            onClick={onOpenVideoCall}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition" 
            title="HD Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 chat-bg-pattern">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[11px] text-amber-300/70">
            <Lock className="w-3 h-3" />
            Messages are end-to-end encrypted. All links are auto-scanned for threats.
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((msg, idx) => {
            // System messages (user joined, etc.)
            if (msg.type === 'system') {
              return (
                <div key={msg.id || idx} className="flex justify-center animate-message">
                  <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderId === currentUser?.id;
            return (
              <div
                key={msg.id || idx}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message`}
                style={{ animationDelay: `${Math.min(idx * 0.02, 0.2)}s` }}
              >
                {/* Other user's avatar */}
                {!isMe && (
                  <img
                    src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full object-cover mr-2 mt-1 shrink-0"
                  />
                )}

                <div
                  className={`relative max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-[var(--msg-out-bg)] text-[var(--text-primary)] rounded-br-md'
                      : 'bg-[var(--msg-in-bg)] text-[var(--text-primary)] rounded-bl-md'
                  }`}
                >
                  {/* Sender name for group chat */}
                  {!isMe && msg.senderName && (
                    <p className="text-[11px] font-bold text-[var(--bg-accent)] mb-1">{msg.senderName}</p>
                  )}

                  {/* Photo Attachment */}
                  {msg.imageUrl && (
                    <div 
                      className="mb-2 overflow-hidden rounded-xl cursor-pointer transition-transform hover:scale-[1.02]"
                      onClick={() => setPreviewImageModal(msg.imageUrl)}
                    >
                      <img 
                        src={msg.imageUrl} 
                        alt="Shared media" 
                        className="max-h-60 rounded-xl object-cover border border-white/10"
                      />
                    </div>
                  )}

                  {/* Text Message */}
                  {msg.text && (
                    <div className="break-words whitespace-pre-wrap">{renderMessageText(msg.text)}</div>
                  )}

                  <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                    {isMe && getStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start animate-message">
              <div className="bg-[var(--msg-in-bg)] px-4 py-3 rounded-2xl rounded-bl-md">
                <p className="text-[10px] text-[var(--bg-accent)] mb-1 font-medium">
                  {typingUsers.map(t => t.userName).join(', ')}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Image Upload Preview */}
      {selectedImage && (
        <div className="px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center gap-3">
          <div className="relative">
            <img src={selectedImage} alt="Attachment preview" className="w-14 h-14 object-cover rounded-xl border border-emerald-500/40" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-emerald-400 font-medium">Image attached ready to send</p>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] relative">

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-full left-4 mb-2 w-[340px] max-h-[360px] glass-modal rounded-2xl border border-[var(--border-color)] shadow-2xl animate-slide-up overflow-hidden flex flex-col z-50"
          >
            {/* Category tabs */}
            <div className="flex items-center gap-0.5 px-2 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 overflow-x-auto shrink-0">
              {EMOJI_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveEmojiCategory(i)}
                  className={`px-2.5 py-1.5 text-base rounded-lg transition-all shrink-0 ${
                    activeEmojiCategory === i
                      ? 'bg-[var(--bg-accent)]/20 scale-110'
                      : 'hover:bg-[var(--bg-tertiary)]'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              ))}
            </div>

            {/* Category label */}
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                {EMOJI_CATEGORIES[activeEmojiCategory]?.name}
              </p>
            </div>

            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJI_CATEGORIES[activeEmojiCategory]?.emojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    onClick={() => insertEmoji(emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-[var(--bg-tertiary)] transition-all hover:scale-125 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition shrink-0 ${
              showEmojiPicker
                ? 'text-[var(--bg-accent)] bg-[var(--bg-accent)]/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          {/* File Upload Trigger */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition shrink-0" 
            title="Attach Photo / File"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              id="message-input"
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[var(--bg-accent)]/30 focus:outline-none resize-none max-h-32 transition-colors"
              style={{ minHeight: '42px' }}
            />
          </div>

          <button
            id="send-btn"
            onClick={handleSend}
            disabled={!inputText.trim() && !selectedImage}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              inputText.trim() || selectedImage
                ? 'bg-[var(--bg-accent)] text-white hover:bg-[var(--bg-accent-hover)] shadow-lg shadow-[var(--bg-accent)]/25 active:scale-95'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
            }`}
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-[var(--text-secondary)] opacity-50">
          <ShieldCheck className="w-3 h-3" />
          <span>Protected by SecureChat Guard™ — Links auto-scanned</span>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImageModal} alt="Expanded preview" className="max-w-full max-h-[85vh] rounded-2xl border border-gray-700 shadow-2xl" />
            <button 
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-4 -right-4 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
