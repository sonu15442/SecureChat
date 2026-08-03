import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Phone, Video, MoreVertical, ShieldCheck, ShieldAlert, ArrowLeft, Check, CheckCheck, Clock, Lock, X } from 'lucide-react';
import { extractUrls, analyzeUrl } from '../utils/linkDetector';

export default function ChatPanel({
  contact,
  messages,
  onSendMessage,
  onOpenLinkModal,
  onOpenVoiceCall,
  onOpenVideoCall,
  onBack,
  currentUserId
}) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (contact) {
      inputRef.current?.focus();
    }
  }, [contact]);

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

    // Simulate bot typing response for bot chat
    if (contact?.isBot) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  // Empty state
  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] chat-bg-pattern">
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--bg-accent)]/10 flex items-center justify-center border border-[var(--bg-accent)]/20">
            <Lock className="w-10 h-10 text-[var(--bg-accent)] opacity-60" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">SecureChat</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Send and receive messages with end-to-end encryption. Your conversations are protected by real-time fraud detection.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--bg-accent)]">
            <Lock className="w-3.5 h-3.5" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]">

      {/* ── Chat Header ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="lg:hidden p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-11 h-11 rounded-full object-cover"
            />
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--bg-secondary)] ${
              contact.status === 'online' ? 'status-online' : 'status-offline'
            }`} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              {contact.name}
              {contact.isBot && <ShieldCheck className="w-4 h-4 text-[var(--bg-accent)]" />}
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {contact.status === 'online' ? (
                <span className="text-[var(--bg-accent)]">Online</span>
              ) : (
                contact.lastSeen || 'Offline'
              )}
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
          <button className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition" title="More Options">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 chat-bg-pattern">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[11px] text-amber-300/70">
            <Lock className="w-3 h-3" />
            Messages are end-to-end encrypted. No one outside of this chat can read them.
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id || idx}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message`}
                style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}
              >
                <div
                  className={`relative max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-[var(--msg-out-bg)] text-[var(--text-primary)] rounded-br-md'
                      : 'bg-[var(--msg-in-bg)] text-[var(--text-primary)] rounded-bl-md'
                  }`}
                >
                  {/* Photo Attachment View */}
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
          {isTyping && (
            <div className="flex justify-start animate-message">
              <div className="bg-[var(--msg-in-bg)] px-4 py-3 rounded-2xl rounded-bl-md">
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

      {/* Image Upload Preview Bar before sending */}
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
      <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
        <div className="flex items-end gap-2">
          <button className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition shrink-0" title="Emoji">
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
              onChange={(e) => setInputText(e.target.value)}
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
