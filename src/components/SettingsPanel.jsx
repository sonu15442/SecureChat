import React, { useState, useRef } from 'react';
import {
  X, Shield, Lock, Bell, Eye, Globe,
  ShieldCheck, Zap, Code2, Heart, ToggleLeft, ToggleRight, Camera, Download, Upload, Image as ImageIcon, CheckCircle2, Trash2
} from 'lucide-react';
import { PRESET_AVATARS } from '../utils/initialData';

export default function SettingsPanel({ settings, onUpdateSettings, currentUser, onUpdateUser, onLogout, onClose, canInstallApp, onInstallApp }) {
  const [activeSection, setActiveSection] = useState('security');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleDeviceFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WEBP, GIF).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onUpdateUser({ ...currentUser, avatar: dataUrl });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

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
      {/* Hidden File Input for Uploading Profile Photo from Device */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleDeviceFileUpload}
      />

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

                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete all local user accounts & cached data?')) {
                          onLogout();
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete All Local Accounts & Clear Data</span>
                    </button>
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

                {/* Avatar & Device Upload Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--bg-tertiary)]/60 rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-4">
                    <div className="relative group shrink-0">
                      <img
                        src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                        alt="Your avatar"
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-[var(--bg-accent)]/30 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200"
                        title="Upload picture from device"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{currentUser?.name || 'User'}</p>
                      <p className="text-xs text-[var(--bg-accent)] font-medium mb-1">{currentUser?.username || '@user'}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Click photo or use button to upload from device</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-[var(--bg-accent)] hover:bg-[var(--bg-accent-hover)] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md shadow-[var(--bg-accent)]/20"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload from Device</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="px-3.5 py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-semibold rounded-xl border border-[var(--border-color)] transition flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span>Presets</span>
                    </button>
                  </div>
                </div>

                {showAvatarPicker && (
                  <div className="p-3.5 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-color)] animate-fade-in">
                    <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Select a Preset Avatar:</p>
                    <div className="flex flex-wrap gap-2.5">
                      {PRESET_AVATARS.map((avatar, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { onUpdateUser({ ...currentUser, avatar }); setShowAvatarPicker(false); }}
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                            currentUser?.avatar === avatar ? 'border-[var(--bg-accent)] ring-2 ring-[var(--bg-accent)]/50' : 'border-transparent opacity-80 hover:opacity-100'
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
                    onClick={() => {
                      onUpdateUser({ ...currentUser, name: editName, bio: editBio });
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                    className="px-5 py-2.5 bg-[var(--bg-accent)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--bg-accent-hover)] transition shadow-lg shadow-[var(--bg-accent)]/20 flex items-center gap-2"
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white animate-fade-in" />
                        <span>Saved Successfully!</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
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
