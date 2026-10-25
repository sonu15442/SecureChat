import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Eye, Pause, Play, Trash2, ChevronUp, UserCheck } from 'lucide-react';
import { markStatusAsViewed, deleteStatus } from '../utils/statusManager';
import { playStatusSong, stopStatusSong } from '../utils/statusAudioPlayer';
import { recordAction } from '../utils/testRecorder';

export default function StatusViewerModal({ statusGroup, currentUserId, allUsers = [], onDeleteStatus, onClose }) {
  const [localStatuses, setLocalStatuses] = useState(() => statusGroup?.statuses || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);

  const timerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (statusGroup?.statuses) {
      setLocalStatuses(statusGroup.statuses);
    }
  }, [statusGroup]);

  const currentStatus = localStatuses[currentIndex];
  const totalStatuses = localStatuses.length;

  // Resolve viewer profiles (avatars & names) - ONLY other users who viewed this Moment
  // The creator/author ("who kept their seen") must NOT appear in this list
  const otherViewerIds = (currentStatus?.views || []).filter(
    vId => String(vId) !== String(currentStatus?.userId) && String(vId) !== String(currentUserId)
  );

  const viewerProfiles = otherViewerIds.map(userId => {
    const matched = allUsers.find(u => String(u.id) === String(userId));
    return {
      id: userId,
      name: matched ? matched.name : ('User (' + String(userId).slice(0, 6) + ')'),
      avatar: matched ? matched.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
    };
  });

  // Mark Moment as viewed when displayed by ANOTHER user (author viewing their own Moment never marks seen)
  useEffect(() => {
    if (currentStatus && currentUserId && String(currentStatus.userId) !== String(currentUserId)) {
      markStatusAsViewed(currentStatus.id, currentUserId);
      recordAction('Moments Management', 'User views contact Moment story', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
    }
  }, [currentStatus, currentUserId]);

  // Video playback management (play/pause, volume, mute)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      if (isPlaying && !showViewersList) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isMuted, showViewersList, currentIndex, currentStatus]);

  // Audio Playback
  useEffect(() => {
    if (!currentStatus || showViewersList) return;

    const isVideoWithNativeAudio = (currentStatus.type === 'video' || currentStatus.videoUrl) && !currentStatus.songAudioUrl;
    if (isVideoWithNativeAudio) {
      stopStatusSong();
      return;
    }

    const targetAudio = currentStatus.songAudioUrl || currentStatus.songTitle;
    if (targetAudio && isPlaying) {
      playStatusSong(targetAudio, isMuted);
    } else {
      stopStatusSong();
    }

    return () => {
      stopStatusSong();
    };
  }, [currentIndex, currentStatus, isPlaying, isMuted, showViewersList]);

  // Unlock audio on any click/touch anywhere on screen
  const unlockAudioUserGesture = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    if (!audioUnlocked && currentStatus && !showViewersList) {
      setAudioUnlocked(true);
      const targetAudio = currentStatus.songAudioUrl || currentStatus.songTitle;
      if (targetAudio && isPlaying) {
        playStatusSong(targetAudio, isMuted);
      }
    }
  };

  // Progress Bar timer (40s per story)
  useEffect(() => {
    if (!isPlaying || showViewersList) return;

    const DURATION = 40000; // 40 seconds duration
    const INTERVAL = 100; // Update every 100ms
    const step = (INTERVAL / DURATION) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPlaying, localStatuses, showViewersList]);

  const handleCloseModal = () => {
    stopStatusSong();
    if (onClose) onClose();
  };

  const isMyStatus = statusGroup?.userId === currentUserId || currentStatus?.userId === currentUserId || !currentUserId;

  const handleDeleteCurrentStatus = (e) => {
    if (e) e.stopPropagation();
    if (!currentStatus) return;
    stopStatusSong();
    
    // Delete from LocalStorage & Memory store
    deleteStatus(currentStatus.id);

    const remaining = localStatuses.filter(s => s.id !== currentStatus.id);
    setLocalStatuses(remaining);

    if (onDeleteStatus) {
      onDeleteStatus(currentStatus.id);
    }

    if (remaining.length > 0) {
      setCurrentIndex(prev => Math.min(prev, remaining.length - 1));
      setProgress(0);
    } else {
      handleCloseModal();
    }
  };

  const handleNext = () => {
    setProgress(0);
    if (currentIndex < totalStatuses - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleCloseModal(); // Close viewer when last story finishes
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopStatusSong();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const targetAudio = currentStatus?.songAudioUrl || currentStatus?.songTitle;
      if (targetAudio) playStatusSong(targetAudio, isMuted);
    }
  };

  if (!currentStatus) return null;

  return (
    <div 
      onClick={unlockAudioUserGesture}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none animate-fade-in"
    >
      <div className="w-full max-w-md h-full md:h-[90vh] md:max-h-[850px] relative flex flex-col justify-between overflow-hidden md:rounded-3xl border border-white/10 shadow-2xl">
        
        {/* Background Visual (Gradient, Photo, or Video) */}
        <div 
          className="absolute inset-0 w-full h-full transition-all duration-500 bg-black flex items-center justify-center overflow-hidden"
          style={{
            background: currentStatus.type === 'text' ? (currentStatus.bgColor || 'linear-gradient(135deg, #0575E6, #00F260)') : '#000'
          }}
        >
          {(currentStatus.type === 'video' || currentStatus.videoUrl) ? (
            <>
              <video
                ref={videoRef}
                src={currentStatus.videoUrl}
                autoPlay
                playsInline
                loop
                muted={isMuted}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />
            </>
          ) : currentStatus.imageUrl ? (
            <>
              <img src={currentStatus.imageUrl} alt="Status" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />
            </>
          ) : null}
        </div>

        {/* Top Header Bar */}
        <div className="relative z-20 p-4 space-y-3 bg-gradient-to-b from-black/80 to-transparent">
          {/* Segmented Progress Bars */}
          <div className="flex gap-1.5 w-full">
            {localStatuses.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Info & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={statusGroup.userAvatar || (allUsers.find(u => u.id === statusGroup.userId)?.avatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={statusGroup.userName}
                className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400"
              />
              <div>
                <p className="text-sm font-extrabold text-white leading-tight">
                  {statusGroup.userName || (allUsers.find(u => u.id === statusGroup.userId)?.name) || 'User'}
                </p>
                <p className="text-[10px] text-slate-300">
                  {new Date(currentStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayPause}
                className="p-2 text-white hover:bg-white/20 rounded-full transition"
                title={isPlaying ? 'Pause Story' : 'Play Story'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              {(currentStatus.songAudioUrl || currentStatus.songTitle || currentStatus.videoUrl || currentStatus.type === 'video') && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition"
                  title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
                </button>
              )}
              {isMyStatus && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentStatus}
                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-full transition"
                  title="Delete This Moment"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleCloseModal}
                className="p-2 text-white hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Content (Caption & Media) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
          {currentStatus.text && (
            <p className="text-white text-xl md:text-2xl font-extrabold drop-shadow-lg max-w-sm leading-relaxed">
              {currentStatus.text}
            </p>
          )}

          {/* Background Song Sticker Card */}
          {currentStatus.songTitle && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                unlockAudioUserGesture();
              }}
              className="mt-6 flex items-center gap-3 px-4 py-2.5 bg-slate-950/80 backdrop-blur-xl rounded-2xl border border-cyan-400/50 shadow-2xl animate-slide-up cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-2xl">{currentStatus.songCover || '🎵'}</span>
              <div className="text-left min-w-[130px]">
                <p className="text-xs font-extrabold text-cyan-300 truncate">{currentStatus.songTitle}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentStatus.songArtist}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    unlockAudioUserGesture();
                    togglePlayPause();
                  }}
                  className="px-2.5 py-1 bg-gradient-to-r from-orange-400 to-amber-400 text-slate-950 text-[11px] font-extrabold rounded-lg shadow-md hover:brightness-110 transition flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPlaying ? 'Sound ON' : 'Play Sound'}</span>
                </button>
                {/* Animated Equalizer Bars */}
                {isPlaying && !isMuted && (
                  <div className="flex items-end gap-1 h-5 pl-1 border-l border-slate-700">
                    <span className="w-1 bg-cyan-400 rounded-full audio-bar-1" />
                    <span className="w-1 bg-purple-400 rounded-full audio-bar-2" />
                    <span className="w-1 bg-pink-400 rounded-full audio-bar-3" />
                    <span className="w-1 bg-orange-400 rounded-full audio-bar-4" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tap Controls (Left for previous, Right for next) */}
        <button
          onClick={handlePrev}
          className="absolute left-0 top-20 bottom-20 w-1/3 z-20 focus:outline-none flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition"
        >
          <ChevronLeft className="w-8 h-8 text-white drop-shadow-md" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-0 top-20 bottom-20 w-1/3 z-20 focus:outline-none flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition"
        >
          <ChevronRight className="w-8 h-8 text-white drop-shadow-md" />
        </button>

        {/* Bottom Views Footer Bar */}
        <div className="relative z-20 p-4 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-between text-xs text-slate-300">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(false);
              stopStatusSong();
              setShowViewersList(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 hover:bg-cyan-500/20 backdrop-blur-md rounded-full border border-cyan-400/40 text-cyan-300 font-extrabold shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="View Moments Viewer"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>
              {viewerProfiles.length === 0
                ? '0 views'
                : `Seen by ${viewerProfiles.length} ${viewerProfiles.length === 1 ? 'user' : 'users'}`}
            </span>
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
          </button>
          <span className="text-[11px] text-slate-400 font-medium">Tap side to skip • Auto 40s</span>
        </div>

        {/* Moments Viewer Sheet Drawer */}
        {showViewersList && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-30 bg-slate-950/95 backdrop-blur-2xl rounded-t-3xl border-t border-cyan-500/40 p-5 shadow-2xl animate-slide-up flex flex-col max-h-[65%] min-h-[300px]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Moments Viewer ({viewerProfiles.length})</h3>
                  <p className="text-[11px] text-slate-400">People who viewed your Moment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewersList(false);
                  setIsPlaying(true);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
              {viewerProfiles.length > 0 ? (
                viewerProfiles.map((viewer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <img
                        src={viewer.avatar}
                        alt={viewer.name}
                        className="w-10 h-10 rounded-full object-cover border border-cyan-400/50"
                      />
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{viewer.name}</p>
                        <p className="text-[10px] text-orange-400 font-medium">Viewed Moment</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">Seen</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 px-4 text-slate-400 text-xs space-y-1">
                  <p className="font-semibold text-slate-300">No viewers yet</p>
                  <p className="text-[11px] text-slate-500">When other users view your Moment, they will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
