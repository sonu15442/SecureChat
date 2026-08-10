import React, { useState } from 'react';
import {
  X, Shield, Lock, Bell, Eye, Globe,
  ShieldCheck, Zap, Code2, Heart, ToggleLeft, ToggleRight, Camera, Download
} from 'lucide-react';
import { PRESET_AVATARS } from '../utils/initialData';

export default function SettingsPanel({ settings, onUpdateSettings, currentUser, onUpdateUser, onLogout, onClose, canInstallApp, onInstallApp }) {
  const [activeSection, setActiveSection] = useState('security');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio);

  const Toggle = ({ enabled, onToggle }) => (
    <button onClick={onToggle} className="transition-colors">
      {enabled ? (
        <ToggleRight className="w-8 h-8 text-[var(--bg-accent)]" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-gray-600" />
      )}
    </button>
  );

  const sections = [
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Edit Profile', icon: Eye },
    { id: 'about', label: 'About SecureChat', icon: Code2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl glass-modal rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--bg-accent)]/10 text-[var(--bg-accent)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Settings</h2>
              <p className="text-xs text-[var(--text-secondary)]">Configure your SecureChat experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Section Nav */}
          <div className="w-52 border-r border-[var(--border-color)] p-2 space-y-1 bg-[var(--bg-primary)]/50">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-all ${
                  activeSection === s.id
                    ? 'bg-[var(--bg-accent)]/15 text-[var(--bg-accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeSection === 'security' && (
              <div className="space-y-4 animate-slide-up">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--bg-accent)]" />
                  Security & Link Scanning
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-[var(--bg-tertiary)] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Auto-Scan Links</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Automatically detect fraud & phishing links</p>
                    </div>
                    <Toggle
                      enabled={settings.autoScanLinks}
                      onToggle={() => onUpdateSettings({ ...settings, autoScanLinks: !settings.autoScanLinks })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[var(--bg-tertiary)] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Block High-Risk Links</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Prevent opening dangerous URLs</p>
                    </div>
                    <Toggle
                      enabled={settings.blockHighRiskLinks}
                      onToggle={() => onUpdateSettings({ ...settings, blockHighRiskLinks: !settings.blockHighRiskLinks })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[var(--bg-tertiary)] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Read Receipts</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Show when you've read messages</p>
                    </div>
                    <Toggle
                      enabled={settings.readReceipts}
                      onToggle={() => onUpdateSettings({ ...settings, readReceipts: !settings.readReceipts })}
                    />
                  </div>

                  <div className="p-3.5 bg-[var(--bg-tertiary)] rounded-xl">
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Link Security Level</p>
                    <div className="flex gap-2">
                      {['strict', 'balanced', 'basic'].map(level => (
                        <button
                          key={level}
                          onClick={() => onUpdateSettings({ ...settings, linkSecurity: level })}
                          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all capitalize ${
                            settings.linkSecurity === level
                              ? 'bg-[var(--bg-accent)] text-white shadow-md'
                              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-4 animate-slide-up">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Notification Preferences
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-[var(--bg-tertiary)] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Push Notifications</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Get notified of new messages</p>
                    </div>
                    <Toggle
                      enabled={settings.notifications}
                      onToggle={() => onUpdateSettings({ ...settings, notifications: !settings.notifications })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[var(--bg-tertiary)] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Sound Effects</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Play sounds for messages</p>
                    </div>
                    <Toggle
                      enabled={settings.soundEnabled}
                      onToggle={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'profile' && (
              <div className="space-y-4 animate-slide-up">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-400" />
                  Edit Profile
                </h3>

                {/* Avatar Picker */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img
                      src={currentUser.avatar}
                      alt="Your avatar"
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-[var(--bg-accent)]/30"
                    />
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{currentUser.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{currentUser.username}</p>
                  </div>
                </div>

                {showAvatarPicker && (
                  <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl">
                    <p className="text-xs text-[var(--text-secondary)] mb-2">Choose an avatar</p>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AVATARS.map((avatar, i) => (
                        <button
                          key={i}
                          onClick={() => { onUpdateUser({ ...currentUser, avatar }); setShowAvatarPicker(false); }}
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 transition hover:scale-110 ${
                            currentUser.avatar === avatar ? 'border-[var(--bg-accent)]' : 'border-transparent'
                          }`}
                        >
                          <img src={avatar} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm px-3.5 py-2.5 rounded-xl border border-transparent focus:border-[var(--bg-accent)]/30 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={2}
                      className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm px-3.5 py-2.5 rounded-xl border border-transparent focus:border-[var(--bg-accent)]/30 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    onClick={() => onUpdateUser({ ...currentUser, name: editName, bio: editBio })}
                    className="px-5 py-2 bg-[var(--bg-accent)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--bg-accent-hover)] transition shadow-lg shadow-[var(--bg-accent)]/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-5 animate-slide-up">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-violet-400" />
                  About SecureChat
                </h3>

                <div className="dev-badge-glow rounded-xl p-5 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg-accent)]/20 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-[var(--bg-accent)]" />
                  </div>
                  <h4 className="text-lg font-bold text-[var(--text-primary)]">SecureChat v1.0</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    A next-generation encrypted messaging platform with built-in AI-powered fraud detection and real-time link security analysis.
                  </p>
                </div>

                <div className="space-y-2">
                  {canInstallApp && (
                    <button
                      onClick={onInstallApp}
                      className="w-full flex items-center justify-between p-3.5 bg-[var(--bg-accent)]/15 border border-[var(--bg-accent)]/30 rounded-xl text-[var(--bg-accent)] font-semibold hover:bg-[var(--bg-accent)]/25 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <Download className="w-5 h-5" />
                        <span>Install SecureChat App</span>
                      </div>
                      <span className="text-xs bg-[var(--bg-accent)] text-white px-2 py-0.5 rounded-full">Desktop / Mobile</span>
                    </button>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-xl">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-[var(--text-primary)]">Real-time fraud link detection</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-xl">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-[var(--text-primary)]">End-to-end encryption</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-xl">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="text-sm text-[var(--text-primary)]">Typosquatting & phishing detection</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-xl">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-[var(--text-primary)]">HD encrypted voice & video calls</span>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Built with <Heart className="w-3 h-3 inline text-red-400" /> using React + Vite
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
