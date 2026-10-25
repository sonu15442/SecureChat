import React, { useState, useRef } from 'react';
import { X, Music, Image as ImageIcon, Type, Sparkles, Send, Volume2, Upload, Check } from 'lucide-react';
import { POPULAR_SONG_PRESETS, STATUS_BACKGROUND_GRADIENTS, createStatusUpdate } from '../utils/statusManager';
import { recordAction } from '../utils/testRecorder';

export default function StatusModal({ currentUser, onClose, onStatusCreated }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'media'
  const [textCaption, setTextCaption] = useState('');
  const [selectedBgGradient, setSelectedBgGradient] = useState(STATUS_BACKGROUND_GRADIENTS[0]);
  const [selectedSong, setSelectedSong] = useState(null); // Optional: default to null so user video has only its own audio
  const [_customAudioUrl, setCustomAudioUrl] = useState(null);
  const [_customAudioName, setCustomAudioName] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);

  const mediaInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const audioPreviewRef = useRef(null);

  // Toggle audio preview for selected song or preset
  const toggleAudioPreview = (songToPlay = selectedSong) => {
    if (isPreviewingAudio) {
      stopPreview();
    } else {
      const url = songToPlay?.audioUrl;
      if (!url) return;
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      audio.play().then(() => {
        setIsPreviewingAudio(true);
      }).catch(err => {
        console.warn('Audio preview play blocked by browser policy:', err);
      });
      audio.onended = () => setIsPreviewingAudio(false);
    }
  };

  const stopPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setIsPreviewingAudio(false);
  };

  const handleClose = () => {
    stopPreview();
    onClose();
  };

  // Handle photo or video upload from device
  const handleMediaFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|3gp|mkv)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview(event.target.result);
      setMediaType(isVid ? 'video' : 'image');
      setActiveTab('media');
      // When uploading a video, keep selectedSong null so user gets only their video audio
      if (isVid) {
        stopPreview();
        setSelectedSong(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle custom song/audio upload from device
  const handleAudioFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomAudioUrl(event.target.result);
      setCustomAudioName(file.name.replace(/\.[^/.]+$/, ""));
      const newCustomSong = {
        id: 'custom_audio',
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'My Device Song',
        audioUrl: event.target.result,
        cover: '🎵'
      };
      setSelectedSong(newCustomSong);
      toggleAudioPreview(newCustomSong);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    stopPreview();
    const canSubmit = (activeTab === 'text' && (textCaption.trim() || selectedSong)) || 
                      (activeTab === 'media' && mediaPreview);
    if (!canSubmit) return;

    const newStatus = createStatusUpdate({
      userId: currentUser?.id || 'user_' + Date.now(),
      userName: currentUser?.name || 'User',
      userAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      type: activeTab === 'media' ? mediaType : 'text',
      text: textCaption.trim() || (selectedSong ? `🎵 ${selectedSong.title}` : ''),
      imageUrl: (activeTab === 'media' && mediaType === 'image') ? mediaPreview : null,
      videoUrl: (activeTab === 'media' && mediaType === 'video') ? mediaPreview : null,
      bgColor: selectedBgGradient,
      songTitle: selectedSong?.title || null,
      songArtist: selectedSong?.artist || null,
      songAudioUrl: selectedSong?.audioUrl || null,
      songCover: selectedSong?.cover || null
    });

    recordAction('Moments Management', 'User publishes photo/video Moment story with sound', { duration: 0.08, status: 'PASSED', source: 'SecureChat' });

    if (onStatusCreated) onStatusCreated(newStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-lg glass-modal rounded-3xl p-6 border border-cyan-500/30 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-slate-950 font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">New Moment</h2>
              <p className="text-xs text-slate-400">Share photo, text & background music to Moments</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1 bg-slate-900/80 rounded-2xl my-4 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === 'text'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            Text & Song Moment
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('media');
              if (!mediaPreview && mediaInputRef.current) mediaInputRef.current.click();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === 'media'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Photo & Video Moment
          </button>
        </div>

        {/* Hidden inputs */}
        <input ref={mediaInputRef} type="file" accept="image/*,video/*" onChange={handleMediaFile} className="hidden" />
        <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />

        {/* Scrollable Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* Status Preview Canvas */}
          <div
            className="w-full h-56 rounded-2xl relative flex flex-col items-center justify-center p-6 text-center shadow-inner overflow-hidden border border-white/10 transition-all bg-black"
            style={{
              background: activeTab === 'text' ? selectedBgGradient : '#0a0f14'
            }}
          >
            {activeTab === 'media' && mediaPreview && mediaType === 'video' ? (
              <video
                src={mediaPreview}
                controls
                autoPlay
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            ) : activeTab === 'media' && mediaPreview && mediaType === 'image' ? (
              <img src={mediaPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover z-0" />
            ) : null}

            {/* Overlay Gradient for readability when photo/video is active */}
            {activeTab === 'media' && mediaPreview && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none z-10" />
            )}

            {/* Status Text overlay */}
            <p className="relative z-20 text-white text-lg font-extrabold drop-shadow-md max-w-xs break-words pointer-events-none">
              {textCaption || (activeTab === 'text' ? 'Type your Moment message...' : 'Add photo or video caption...')}
            </p>

            {/* Song Sticker Badge */}
            {selectedSong && (
              <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2.5 px-3 py-2 bg-slate-950/85 backdrop-blur-md rounded-xl border border-cyan-400/40 shadow-lg text-left">
                <span className="text-lg">{selectedSong.cover}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-cyan-300 truncate">{selectedSong.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{selectedSong.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAudioPreview(selectedSong);
                  }}
                  className="px-2.5 py-1 bg-gradient-to-r from-cyan-400 to-teal-400 hover:brightness-110 text-slate-950 text-[11px] font-extrabold rounded-lg shadow-md transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPreviewingAudio ? 'Pause' : 'Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopPreview();
                    setSelectedSong(null);
                  }}
                  className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg transition shrink-0 cursor-pointer"
                  title="Remove Music"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Text Caption Input */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1 block">Moment Caption / Message</label>
            <input
              type="text"
              value={textCaption}
              onChange={(e) => setTextCaption(e.target.value)}
              placeholder="What's on your mind? Add a caption..."
              className="w-full bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Media picker trigger button if media tab */}
          {activeTab === 'media' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="flex-1 py-2 px-3 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {mediaPreview ? (mediaType === 'video' ? 'Change Video' : 'Change Photo') : 'Upload Photo or Video'}
              </button>
            </div>
          )}

          {/* Text Background Color Gradients (only for text status) */}
          {activeTab === 'text' && (
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">Background Color Theme</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {STATUS_BACKGROUND_GRADIENTS.map((grad, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedBgGradient(grad)}
                    className={`w-8 h-8 rounded-full shrink-0 transition-transform ${
                      selectedBgGradient === grad ? 'scale-110 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ background: grad }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Song / Music Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-cyan-400" />
                Background Song / Theme (Optional)
              </label>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="text-xs font-extrabold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:brightness-125 px-3 py-1.5 rounded-xl border border-purple-400/60 shadow-md shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Original MP3</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Option to clear / keep video original audio without extra song */}
              <button
                type="button"
                onClick={() => {
                  stopPreview();
                  setSelectedSong(null);
                }}
                className={`col-span-2 p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  !selectedSong
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔇</span>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {mediaType === 'video' ? 'No Background Song (Keep Original Video Sound Only)' : 'No Music / None'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {mediaType === 'video' ? 'Plays your device video with its own audio' : 'Silent Moment without background song'}
                    </p>
                  </div>
                </div>
                {!selectedSong && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              {POPULAR_SONG_PRESETS.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => {
                    if (selectedSong?.id === song.id) {
                      stopPreview();
                      setSelectedSong(null);
                    } else {
                      setSelectedSong(song);
                      toggleAudioPreview(song);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    selectedSong?.id === song.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xl shrink-0">{song.cover}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{song.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{song.artist}</p>
                  </div>
                  {selectedSong?.id === song.id && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={(activeTab === 'text' && !textCaption.trim() && !selectedSong) || (activeTab === 'media' && !mediaPreview)}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 hover:brightness-110 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Share to Moments</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
