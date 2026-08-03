import React, { useState } from 'react';
import { Search, MessageSquarePlus, Shield, Settings, LogOut, ChevronDown, X } from 'lucide-react';

export default function Sidebar({ contacts, activeContactId, onSelectContact, currentUser, onOpenSettings, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLastMessage = (contact) => {
    if (!contact.messages || contact.messages.length === 0) return '';
    const last = contact.messages[contact.messages.length - 1];
    const prefix = last.senderId === currentUser?.id ? 'You: ' : '';
    const text = last.imageUrl ? '📷 Photo' : (last.text.length > 40 ? last.text.substring(0, 40) + '…' : last.text);
    return prefix + text;
  };

  const getLastTime = (contact) => {
    if (!contact.messages || contact.messages.length === 0) return '';
    return contact.messages[contact.messages.length - 1].timestamp;
  };

  return (
    <div className="w-[380px] min-w-[320px] h-full flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">

      {/* ── Top Bar ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className="relative">
          <button
            id="profile-toggle"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2.5 hover:bg-[var(--bg-tertiary)] rounded-xl px-2 py-1.5 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--bg-accent)]/40"
            />
            <div className="text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{currentUser.name}</p>
              <p className="text-[11px] text-[var(--text-accent)] font-medium">{currentUser.username}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 glass-modal rounded-xl shadow-2xl z-50 animate-slide-up border border-[var(--border-color)]">
              <div className="p-3 border-b border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)]">Signed in as</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{currentUser.name}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => { onOpenSettings(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
                >
                  <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                  Settings
                </button>
                <button 
                  onClick={() => { if (onLogout) onLogout(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition" title="New Chat">
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            id="contact-search"
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm pl-10 pr-4 py-2.5 rounded-xl border border-transparent focus:border-[var(--bg-accent)]/40 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Encrypted Badge ── */}
      <div className="mx-3 mb-2 px-3 py-2 bg-[var(--bg-accent)]/8 rounded-lg flex items-center gap-2 border border-[var(--bg-accent)]/15">
        <Shield className="w-3.5 h-3.5 text-[var(--bg-accent)]" />
        <span className="text-[11px] font-medium text-[var(--bg-accent)]">End-to-end encrypted • Fraud protection active</span>
      </div>

      {/* ── Contact List ── */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Search className="w-10 h-10 text-[var(--text-secondary)] mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">No chats found</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <button
              key={contact.id}
              id={`contact-${contact.id}`}
              onClick={() => onSelectContact(contact.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]/50 ${
                activeContactId === contact.id
                  ? 'bg-[var(--bg-tertiary)] border-l-2 border-l-[var(--bg-accent)]'
                  : 'border-l-2 border-l-transparent'
              }`}
            >
              {/* Avatar + Status */}
              <div className="relative shrink-0">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-secondary)] ${
                  contact.status === 'online' ? 'status-online' : 'status-offline'
                }`} />
                {contact.isBot && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[var(--bg-accent)] rounded-full flex items-center justify-center">
                    <Shield className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{contact.name}</h3>
                  <span className="text-[11px] text-[var(--text-secondary)] shrink-0 ml-2">{getLastTime(contact)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[13px] text-[var(--text-secondary)] truncate">{getLastMessage(contact)}</p>
                  {contact.unreadCount > 0 && (
                    <span className="ml-2 shrink-0 w-5 h-5 bg-[var(--bg-accent)] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* ── Bottom Security Badge ── */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <div className="dev-badge-glow rounded-xl px-4 py-3 flex items-center gap-3">
          <Shield className="w-5 h-5 text-[var(--bg-accent)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">SecureChat Guard™</p>
            <p className="text-[10px] text-[var(--text-secondary)]">AI-powered fraud & phishing protection</p>
          </div>
        </div>
      </div>
    </div>
  );
}
