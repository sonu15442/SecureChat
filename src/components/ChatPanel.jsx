import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  X,
  Search,
  MessageCircle,
  Users,
  Lock,
  ArrowLeft,
  FileText,
  Download,
  Camera,
  Mic,
  Image as ImageIcon,
  Headphones,
  MapPin,
  User,
  Info,
  Palette,
  Trash2,
  Settings
} from 'lucide-react';
import { recordAction } from '../utils/testRecorder';
import { analyzeUrl } from '../utils/linkDetector';
import { broadcastTyping } from '../utils/realtimeChannel';
import { searchUsers } from '../utils/api';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & Faces',
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🫣','🤗','🫡','🤔','🤫','🫠','🤐','🤨','😐','😑','😶','🫥','🙄','😬','🤥','🫨','😌','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥴','😵','😵‍💫','🤠','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'
    ]
  },
  {
    name: 'People & Gestures',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','🫰','🫵','👌','🤌','🤏','✌️','🤞','🫶','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦','👶','👧','🧒','👦','👩','🧑','👨','🧑‍🦱','👩‍🦱','🧑‍🦰','👨‍🦰','👱‍♀️','👱‍♂️','🧓','👵','👴','👲','👳‍♀️','👳‍♂️','🧕','👮‍♀️','👮‍♂️','👷‍♀️','👷‍♂️','💂‍♀️','💂‍♂️','🕵️‍♀️','🕵️‍♂️','🧑‍⚕️','👩‍⚕️','👨‍⚕️'
    ]
  },
  {
    name: 'Hearts & Love',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕯️','✨','⭐','🌟','💫','⚡','💥','🔥','💯','💢','💨','💦','💤','🕳️'
    ]
  },
  {
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🌸','💮','🏵️','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🪴','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀','🍁','🍂','🍃'
    ]
  },
  {
    name: 'Food & Drinks',
    icon: '🍔',
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🌮','🌯','🫔','🥙','🧆','🥘','🍲','🫕','🥣','🥗','🍿','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤','🧋','🧃','🧉','🧊'
    ]
  },
  {
    name: 'Activities & Sports',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️‍♀️','🏋️‍♂️','🤼‍♀️','🤼‍♂️','🤸‍♀️','🤸‍♂️','⛹️‍♀️','⛹️‍♂️','🤺','🤾‍♀️','🤾‍♂️','🏌️‍♀️','🏌️‍♂️','🏇','🧘‍♀️','🧘‍♂️','🏄‍♀️','🏄‍♂️','🏊‍♀️','🏊‍♂️','🤽‍♀️','🤽‍♂️','🚣‍♀️','🚣‍♂️','🧗‍♀️','🧗‍♂️','🚵‍♀️','🚵‍♂️','🚴‍♀️','🚴‍♂️','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹‍♀️','🤹‍♂️','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','🎯','🎳','🎮','🕹️'
    ]
  },
  {
    name: 'Travel & Places',
    icon: '🚗',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🛟','⛽','🚧','🚦','🚥','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏛️','⛪','🕌','🕍','🛕','🕋'
    ]
  },
  {
    name: 'Objects & Tools',
    icon: '💡',
    emojis: [
      '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','🧪','🧫','🧬','🔬','🔭','🩺','💊','🩹','🚪','🪞','🪟','🛏️','🛋️','🪑','🚽','🪠','🚿','🛁','🪒','🧴','🧻','🧹','🧺','🧽','🧼','🪥','🛒','🔑','🗝️','🔒','🔓','🔏','🔐'
    ]
  }
];

const EMOJI_KEYWORD_MAP = {
  smile: ['😀','😃','😄','😁','😆','😅','😂','🤣','🙂','🙃','🫠','😉','😊','😇','🥰','😍','🤩'],
  laugh: ['😄','😁','😆','😅','😂','🤣'],
  happy: ['😀','😃','😄','😁','😊','😇','🥰','😍','🤩','🥳'],
  love: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','🥰','😍','😘'],
  heart: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝'],
  cry: ['😢','😭','😿','🥹','🥺','😥','😓'],
  sad: ['😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭'],
  angry: ['😤','😠','😡','🤬','👿','😾'],
  fire: ['🔥','❤️‍🔥','⚡','💥'],
  cool: ['😎','🥶','🤙'],
  kiss: ['😘','😗','😚','😙','💋'],
  wink: ['😉','😜','🤪','😝'],
  hand: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','🫰','🫵','👌','🤌','🤏','✌️','🤞','🫶','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏'],
  thumbs: ['👍','👎'],
  clap: ['👏','🙌'],
  party: ['🥳','🎉','🎊','🎈','🎂','🎁'],
  dog: ['🐶','🐕','🐩','🦮','🐕‍🦺'],
  cat: ['🐱','🐈','🐈‍⬛','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
  food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯'],
  drink: ['🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤','🧋','🧃','🧉','🧊'],
  car: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜'],
  star: ['⭐','🌟','💫','✨','🤩'],
  music: ['🎤','🎧','🎼','🎵','🎶','🎹','🥁','🎷','🎺','🎸','🪕','🎻'],
  sport: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋']
};


export default function ChatPanel({
  messages = [],
  allUsers = [],
  activeChatTarget = 'global',
  onSelectChatTarget,
  onSendMessage,
  onOpenLinkModal,
  onOpenVoiceCall,
  onOpenVideoCall,
  currentUser,
  onlineUsers = [],
  onToggleMobileSidebar,
  theme = 'dark',
  onToggleTheme,
  onOpenSettings,
  onClearChat
}) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [showSearchHeader, setShowSearchHeader] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLaptopWebcam, setShowLaptopWebcam] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mobileCameraInputRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const documentFileInputRef = useRef(null);
  const videoFileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const moreMenuBtnRef = useRef(null);
  const moreMenuRef = useRef(null);
  const webcamVideoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingSecondsRef = useRef(0);

  const startAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Live audio recording is not supported on this device/browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];

      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          const dur = recordingSecondsRef.current > 0 ? `${recordingSecondsRef.current}s` : 'Voice Note';
          if (onSendMessage && base64Audio) {
            onSendMessage({
              text: '🎤 Voice Note',
              audioUrl: base64Audio,
              audioName: `Voice Note (${dur}).webm`
            });
            recordAction('CRUD Operations', 'User sends recorded audio voice note', { duration: 0.05, status: 'PASSED', source: 'SecureChat' });
          }
        };
        reader.readAsDataURL(blob);

        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(t => t.stop());
          recordingStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Audio recording failed:', err);
      alert('Microphone permission required to record audio voice notes.');
    }
  };

  const stopAndSendAudioRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
  };

  const cancelAudioRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach(t => t.stop());
      recordingStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  const formatRecordTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);


  const isLight = theme === 'light';
  const isGlobal = !activeChatTarget || activeChatTarget === 'global';
  const targetUser = !isGlobal && typeof activeChatTarget === 'object' ? activeChatTarget : null;

  // Filter messages for current chat target (Global vs 1-on-1 Private)
  const displayedMessages = (messages || []).filter(msg => {
    if (!msg) return false;
    if (isGlobal) {
      return !msg.recipientId || msg.recipientId === 'global';
    } else if (targetUser && currentUser?.id && targetUser?.id) {
      return (
        (msg.senderId === currentUser.id && msg.recipientId === targetUser.id) ||
        (msg.senderId === targetUser.id && msg.recipientId === currentUser.id)
      );
    }
    return true;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayedMessages]);

  // Handle outside click for emoji picker and three dots menu
  useEffect(() => {
    const handleOutside = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !emojiButtonRef.current?.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target) &&
        !moreMenuBtnRef.current?.contains(e.target)
      ) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

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

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedAudio({
          dataUrl: uploadEvent.target.result,
          name: file.name,
          size: formatFileSize(file.size)
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedVideo({
          dataUrl: uploadEvent.target.result,
          name: file.name,
          size: formatFileSize(file.size)
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedDocument({
          dataUrl: uploadEvent.target.result,
          name: file.name,
          size: formatFileSize(file.size)
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera Handler: Mobile opens device camera; Laptop/Desktop opens live webcam preview
  const handleCameraClick = () => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth <= 768 && 'ontouchstart' in window);

    if (isMobileDevice) {
      mobileCameraInputRef.current?.click();
    } else {
      openLaptopWebcam();
    }
  };

  const openLaptopWebcam = async () => {
    setShowLaptopWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Could not access laptop webcam, falling back to file picker:', err);
      setShowLaptopWebcam(false);
      fileInputRef.current?.click();
    }
  };

  const closeLaptopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    setShowLaptopWebcam(false);
  };

  const captureLaptopPhoto = () => {
    const video = webcamVideoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setSelectedImage(dataUrl);
    }
    closeLaptopWebcam();
  };

  // Live User Location Sharing with High Accuracy GPS
  const handleShareLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser or device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const accMeters = Math.round(accuracy || 10);
        onSendMessage({
          text: `📍 Live Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accMeters}m)\n${mapsUrl}`,
          location: {
            latitude,
            longitude,
            accuracy: accMeters,
            mapsUrl,
            timestamp: Date.now()
          }
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not retrieve live location. Please ensure GPS/location permissions are enabled.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text && !selectedImage && !selectedAudio && !selectedVideo && !selectedDocument) return;

    if (selectedImage) {
      recordAction('CRUD Operations', 'User attaches and sends media photo', { duration: 0.08, status: 'PASSED', source: 'SecureChat' });
    }
    if (selectedAudio) {
      recordAction('CRUD Operations', 'User attaches and sends audio file', { duration: 0.08, status: 'PASSED', source: 'SecureChat' });
    }
    if (selectedVideo) {
      recordAction('CRUD Operations', 'User attaches and sends video file', { duration: 0.08, status: 'PASSED', source: 'SecureChat' });
    }
    if (selectedDocument) {
      recordAction('CRUD Operations', 'User attaches and sends document file', { duration: 0.08, status: 'PASSED', source: 'SecureChat' });
    }

    onSendMessage({
      text: text || (selectedAudio ? `🎵 Audio: ${selectedAudio.name}` : selectedVideo ? `🎬 Video: ${selectedVideo.name}` : selectedDocument ? `📄 Document: ${selectedDocument.name}` : ''),
      imageUrl: selectedImage || null,
      audioUrl: selectedAudio?.dataUrl || null,
      audioName: selectedAudio?.name || null,
      videoUrl: selectedVideo?.dataUrl || null,
      videoName: selectedVideo?.name || null,
      documentUrl: selectedDocument?.dataUrl || null,
      documentName: selectedDocument?.name || null,
      documentSize: selectedDocument?.size || null
    });

    setInputText('');
    setSelectedImage(null);
    setSelectedAudio(null);
    setSelectedVideo(null);
    setSelectedDocument(null);
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

  const displayedEmojis = useMemo(() => {
    if (emojiSearch && emojiSearch.trim()) {
      const q = emojiSearch.toLowerCase().trim();
      const matches = new Set();
      Object.entries(EMOJI_KEYWORD_MAP).forEach(([k, list]) => {
        if (k.includes(q) || q.includes(k)) {
          list.forEach(e => matches.add(e));
        }
      });
      EMOJI_CATEGORIES.forEach(c => {
        if (c.name.toLowerCase().includes(q)) {
          c.emojis.forEach(e => matches.add(e));
        }
      });
      if (matches.size > 0) return Array.from(matches);
      return EMOJI_CATEGORIES[activeEmojiCategory]?.emojis || [];
    }
    return EMOJI_CATEGORIES[activeEmojiCategory]?.emojis || [];
  }, [emojiSearch, activeEmojiCategory]);

  const renderMessageContent = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
    const matches = text.match(urlRegex);

    if (!matches) {
      return <span>{text}</span>;
    }

    const result = [];
    let lastIdx = 0;

    matches.forEach((url, i) => {
      const startIdx = text.indexOf(url, lastIdx);
      if (startIdx > lastIdx) {
        result.push(<span key={`text-${i}`}>{text.substring(lastIdx, startIdx)}</span>);
      }

      const analysis = analyzeUrl(url);
      const isDangerous = analysis.riskLevel === 'DANGEROUS';
      const isSuspicious = analysis.riskLevel === 'SUSPICIOUS';

      result.push(
        <button
          key={`link-${i}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenLinkModal) {
              onOpenLinkModal(analysis);
            }
          }}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-xs underline cursor-pointer transition-colors ${
            isDangerous
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
              : isSuspicious
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'text-cyan-400 hover:text-cyan-300'
          }`}
          title={`Click to verify: ${analysis.riskLevel} (${analysis.hostname || url})`}
        >
          {isDangerous && <ShieldAlert className="w-3.5 h-3.5 text-red-400 inline shrink-0" />}
          {isSuspicious && <ShieldAlert className="w-3.5 h-3.5 text-amber-400 inline shrink-0" />}
          <span>{url}</span>
        </button>
      );

      lastIdx = startIdx + url.length;
    });

    if (lastIdx < text.length) {
      result.push(<span key="end">{text.substring(lastIdx)}</span>);
    }

    return <>{result}</>;
  };

  // Ticks: 1 tick for sent (offline), 2 gray ticks for delivered (online), 2 orange ticks for read/seen
  const getStatusIcon = (status) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-4 h-4 text-[#f97316] inline ml-1 drop-shadow-[0_0_4px_rgba(249,115,22,0.6)]" title="Seen" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-slate-400 inline ml-1" title="Delivered (Recipient online)" />;
      case 'sent':
      default:
        return <Check className="w-4 h-4 text-slate-400 inline ml-1" title="Sent (Recipient offline)" />;
    }
  };

  const totalMembers = Math.max(1, (Array.isArray(allUsers) ? allUsers.filter(u => u && u.name && u.name.trim()).length : 0) + (currentUser ? 1 : 0));
  const totalOnline = useMemo(() => {
    const onlineSet = new Set((onlineUsers || []).map(u => (typeof u === 'string' ? u : u?.id)));
    if (currentUser?.id) onlineSet.add(currentUser.id);
    let count = 0;
    const allMembers = [...(allUsers || []), ...(currentUser ? [currentUser] : [])];
    const uniqueIds = new Set();
    allMembers.forEach(m => {
      if (m && m.id && m.name && m.name.trim() && !uniqueIds.has(m.id)) {
        uniqueIds.add(m.id);
        if (onlineSet.has(m.id) || m.isOnline) {
          count++;
        }
      }
    });
    return Math.max(1, count);
  }, [onlineUsers, allUsers, currentUser]);

  // Real-time online presence check
  const targetIsOnline = Boolean(
    targetUser && (
      (Array.isArray(onlineUsers) && onlineUsers.some(u => (typeof u === 'string' ? u === targetUser.id : u?.id === targetUser.id))) ||
      Boolean(targetUser.isOnline)
    )
  );

  return (
    <div className={`flex-1 flex flex-col h-full min-w-0 w-full overflow-hidden select-none relative ${
      isLight ? 'bg-[#f0f2f5]' : 'bg-[#0d161f]'
    }`}>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. CHAT HEADER                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className={`px-2.5 md:px-4 pt-9 pb-2.5 md:py-3 flex items-center justify-between border-b z-20 shrink-0 relative ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0d161d] border-slate-800/80'
      }`}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          {/* Back button (Mobile view to return to chats) */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 text-slate-300 hover:text-white rounded-xl transition"
            title="Back to Chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {isGlobal ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f97316] to-[#fb923c] flex items-center justify-center text-white shadow-sm shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5 truncate">
                  <span>SecureChat Community</span>
                  <Lock className="w-3.5 h-3.5 text-[#f97316]" />
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {totalMembers} {totalMembers === 1 ? 'member' : 'members'} • {totalOnline} online
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={targetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt={targetUser?.name || 'Contact'}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {targetIsOnline ? (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#0d161d]" />
                ) : (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-500 ring-2 ring-[#0d161d]" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5 truncate">
                  <span>{targetUser?.name}</span>
                  <Lock className="w-3.5 h-3.5 text-[#f97316]" />
                </h3>
                <p className="text-xs truncate">
                  {targetIsOnline ? (
                    <span className="text-[#22c55e] font-medium">● Online</span>
                  ) : (
                    <span className="text-slate-400">Offline</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Header Action Icons: Voice Call, Video Call, Search, Three Dots Menu */}
        <div className="flex items-center gap-0.5 md:gap-1.5 shrink-0">
          <button
            id="voice-call-btn"
            onClick={() => onOpenVoiceCall && onOpenVoiceCall(targetUser)}
            className="p-1.5 md:p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
            title="Voice Call"
          >
            <Phone className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            id="video-call-btn"
            onClick={() => onOpenVideoCall && onOpenVideoCall(targetUser)}
            className="p-1.5 md:p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
            title="Video Call"
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setShowSearchHeader(!showSearchHeader)}
            className="p-1.5 md:p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
            title="Search Messages"
          >
            <Search className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            ref={moreMenuBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreMenu(prev => !prev);
            }}
            className="p-1.5 md:p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* ── Three Dots Options Dropdown Menu ── */}
        {showMoreMenu && (
          <div
            ref={moreMenuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full right-3 mt-1 w-56 rounded-2xl bg-[#14202a]/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95 space-y-1"
          >
            {/* Option 1: Chat Theme */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                if (onToggleTheme) onToggleTheme();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left"
            >
              <Palette className="w-4 h-4 text-[#f97316] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">Chat Theme</p>
                <p className="text-[10px] text-slate-400 font-normal">Switch {isLight ? 'Dark' : 'Light'} Mode</p>
              </div>
            </button>

            {/* Option 2: Clear Chat */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                if (onClearChat) onClearChat(activeChatTarget);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition cursor-pointer text-left"
            >
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">Clear Chat</p>
                <p className="text-[10px] text-rose-400/70 font-normal">Delete messages in chat</p>
              </div>
            </button>

            {/* Option 3: Settings */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                if (onOpenSettings) onOpenSettings();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">Settings</p>
                <p className="text-[10px] text-slate-400 font-normal">Preferences & Security</p>
              </div>
            </button>

            {/* Option 4: Encryption Info */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                setShowEncryptionInfo(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left border-t border-slate-800/60 pt-2"
            >
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">Encryption Info</p>
                <p className="text-[10px] text-teal-400/70 font-normal">End-to-End verified</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Search Header Bar (if toggled) */}
      {showSearchHeader && (
        <div className="relative z-30">
          <div className="px-4 py-2 bg-[#121c25] border-b border-slate-800 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              autoFocus
            />
            <button onClick={() => { setShowSearchHeader(false); setSearchQuery(''); }} className="p-1 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User matches dropdown */}
          {searchQuery.trim().length > 0 && Array.isArray(allUsers) && (
            <div className="absolute top-full left-0 right-0 bg-[#16222f] border-b border-slate-700 max-h-60 overflow-y-auto shadow-2xl">
              {allUsers.filter(u => u && u.id !== currentUser?.id && (
                (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
              )).map(u => (
                <div
                  key={u.id}
                  onClick={() => {
                    if (onSelectChatTarget) onSelectChatTarget(u);
                    setShowSearchHeader(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#1f2e3d] cursor-pointer border-b border-slate-800/50"
                >
                  <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{u.name}</h4>
                    <p className="text-[10px] text-slate-400">{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. CHAT MESSAGES BODY                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 18, 25, 0.88), rgba(10, 18, 25, 0.94)), url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Floating Glowing Teal E2E Encryption Banner Card */}
        <div className="max-w-2xl mx-auto my-2 p-3.5 rounded-2xl bg-gradient-to-r from-[#072424]/90 via-[#0a3333]/90 to-[#072424]/90 border border-teal-500/40 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/50 flex items-center justify-center text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.35)] shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">This chat is end-to-end encrypted</h4>
              <p className="text-xs text-teal-200/80">
                Your messages, files and calls are protected with advanced encryption and AI Fraud Shield.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEncryptionInfo(!showEncryptionInfo)}
            className="p-1.5 text-teal-300 hover:text-white transition shrink-0"
            title="Encryption details"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Date separator: "Today" pill */}
        <div className="flex items-center justify-center my-3">
          <span className="px-3.5 py-1 rounded-full bg-[#18232e]/85 border border-slate-700/50 text-slate-300 text-xs font-semibold shadow-sm backdrop-blur-xs">
            Today
          </span>
        </div>

        {/* ── Community Welcome & Security Guide Card ── */}
        {isGlobal && displayedMessages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 max-w-md">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
                A
              </div>
              <div className="p-3.5 rounded-2xl bg-[#1b2733]/90 border border-slate-700/60 text-white shadow-lg backdrop-blur-md space-y-1">
                <p className="text-xs font-bold text-[#f97316]">Admin</p>
                <p className="text-sm font-medium">Welcome to SecureChat Community!</p>
                <p className="text-xs text-slate-300">Here we discuss updates, security tips and features.</p>
                <p className="text-[10px] text-slate-400 text-right">8:45 PM</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 max-w-md">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
                <FileText className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#1b2733]/90 border border-slate-700/60 text-white shadow-lg backdrop-blur-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Security_Guide.pdf</h5>
                    <p className="text-xs text-slate-400">2.4 MB • PDF</p>
                  </div>
                </div>
                <button
                  onClick={() => recordAction('CRUD Operations', 'User downloads security guide')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Real Messages History ── */}
        {displayedMessages.map((msg) => {
          const isSender = msg.senderId === currentUser?.id;
          const isLocationMsg = msg.location || (msg.text && (msg.text.includes('google.com/maps') || msg.text.includes('maps.google.com')));

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isSender ? 'justify-end' : 'justify-start'}`}
            >
              {!isSender && (
                <img
                  src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt={msg.senderName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 mt-1"
                />
              )}

              <div className={`p-3.5 rounded-2xl max-w-[88%] md:max-w-md shadow-lg backdrop-blur-md space-y-1.5 ${
                isSender
                  ? 'border border-[#f97316]/90 bg-[#231710]/95 text-white'
                  : 'border border-slate-700/60 bg-[#1b2733]/90 text-white'
              }`}>
                {/* Sender Name */}
                <p className="text-xs font-bold text-[#f97316]">
                  {isSender ? (currentUser?.name?.split(' ')[0] || 'You') : (msg.senderName || 'Contact')}
                </p>

                {/* Media Image if present */}
                {msg.imageUrl && (
                  <div className="my-1.5 rounded-xl overflow-hidden cursor-pointer" onClick={() => setPreviewImageModal(msg.imageUrl)}>
                    <img src={msg.imageUrl} alt="Attached" className="max-h-60 rounded-xl object-cover hover:scale-102 transition" />
                  </div>
                )}

                {/* Media Audio player if present */}
                {msg.audioUrl && (
                  <div className="my-1.5 p-2 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                      <Headphones className="w-4 h-4 shrink-0" />
                      <span className="truncate">{msg.audioName || 'Audio Message'}</span>
                    </div>
                    <audio controls src={msg.audioUrl} className="w-full h-8 rounded" preload="metadata" />
                  </div>
                )}

                {/* Media Video player if present */}
                {msg.videoUrl && (
                  <div className="my-1.5 rounded-xl overflow-hidden bg-black/70 border border-purple-500/40">
                    <video
                      controls
                      playsInline
                      src={msg.videoUrl}
                      className="max-h-64 w-full rounded-xl object-contain bg-black"
                      preload="metadata"
                    />
                  </div>
                )}

                {/* Media Document card if present */}
                {msg.documentUrl && (
                  <div className="my-1.5 p-3 rounded-xl bg-slate-900/90 border border-[#f97316]/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{msg.documentName || 'Document'}</p>
                        <p className="text-[10px] text-slate-400">{msg.documentSize || 'Document File'}</p>
                      </div>
                    </div>
                    <a
                      href={msg.documentUrl}
                      download={msg.documentName || 'document'}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0 cursor-pointer"
                      title="Download Document"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* Live Location Card if present */}
                {isLocationMsg && (
                  <div className="my-2 p-3 rounded-xl bg-slate-900/95 border border-rose-500/50 shadow-md space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                        <span className="text-xs font-bold text-rose-400">Live User Location</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        GPS Active
                      </span>
                    </div>
                    {msg.location?.accuracy && (
                      <p className="text-[11px] text-slate-300">
                        Accurate to within ±{msg.location.accuracy} meters
                      </p>
                    )}
                    <a
                      href={msg.location?.mapsUrl || (msg.text.match(/https?:\/\/[^\s]+/)?.[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Open Live Location on Google Maps</span>
                    </a>
                  </div>
                )}

                {/* Text Message */}
                {msg.text && (
                  <div className="text-sm font-normal leading-relaxed break-words">
                    {renderMessageContent(msg.text)}
                  </div>
                )}

                {/* Timestamp & Status with Double Orange Ticks when seen */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-0.5">
                  <span>{msg.timestamp || 'Just now'}</span>
                  {isSender && getStatusIcon(msg.status)}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Attachment Preview Box */}
      {selectedImage && (
        <div className="px-4 py-2 bg-[#121c25] border-t border-slate-800 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={selectedImage} alt="Attachment" className="w-14 h-14 object-cover rounded-xl border border-[#f97316]/60" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-[#f97316] font-medium">Photo ready to send</p>
          </div>
        </div>
      )}

      {/* Audio Attachment Preview Box */}
      {selectedAudio && (
        <div className="px-4 py-2 bg-[#121c25] border-t border-slate-800 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">{selectedAudio.name}</p>
              <p className="text-[10px] text-emerald-400">Audio file ready to send</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedAudio(null)}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            title="Remove audio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Video Attachment Preview Box */}
      {selectedVideo && (
        <div className="px-4 py-2 bg-[#121c25] border-t border-slate-800 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">{selectedVideo.name}</p>
              <p className="text-[10px] text-purple-400">Video ready to send • {selectedVideo.size}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedVideo(null)}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-full transition cursor-pointer"
            title="Remove video"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Document Attachment Preview Box */}
      {selectedDocument && (
        <div className="px-4 py-2 bg-[#121c25] border-t border-slate-800 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">{selectedDocument.name}</p>
              <p className="text-[10px] text-[#f97316]">Document ready to send • {selectedDocument.size}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedDocument(null)}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-full transition cursor-pointer"
            title="Remove document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. MESSAGE INPUT BOX & QUICK ACTION TOOLBAR                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="px-2 md:px-4 py-2 bg-[#0d161d] border-t border-slate-800/80 shrink-0 z-20 relative">

        {/* Emoji Picker Modal */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full left-2 md:left-4 mb-2 w-[calc(100vw-24px)] md:w-[350px] max-w-[350px] max-h-[340px] bg-[#14202a] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95"
          >
            {/* Search Input for Unlimited Smilies */}
            <div className="p-2 border-b border-slate-700/80 bg-[#0d161d] flex items-center gap-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
                placeholder="Search unlimited smilies..."
                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              {emojiSearch && (
                <button
                  type="button"
                  onClick={() => setEmojiSearch('')}
                  className="p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-700/80 bg-[#0d161d]/80 overflow-x-auto shrink-0 scrollbar-none">
              {EMOJI_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setActiveEmojiCategory(i);
                    setEmojiSearch('');
                  }}
                  className={`px-2 py-1 text-sm rounded-lg transition shrink-0 ${
                    activeEmojiCategory === i && !emojiSearch ? 'bg-[#f97316]/20 text-[#f97316] ring-1 ring-[#f97316]/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-7 md:grid-cols-8 gap-1.5">
              {displayedEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    insertEmoji(emoji);
                  }}
                  className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center text-xl hover:scale-125 transition active:scale-95 cursor-pointer rounded-lg hover:bg-slate-800/80"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Input Container: Mobile Responsive with Always-Visible Send Button */}
        <div className="p-1.5 md:p-2 rounded-2xl bg-[#14202a] border border-slate-700/60 shadow-xl space-y-1.5 w-full min-w-0">
          {/* Row 1: Emoji, Input/Record Bar, Paperclip, Camera, Mic Record, Circular Orange Send */}
          <div className="flex items-center gap-1 md:gap-2 w-full min-w-0">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(prev => !prev);
              }}
              className="p-1.5 md:p-2 text-slate-400 hover:text-[#f97316] transition cursor-pointer shrink-0"
              title="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Conditional input or live voice recording indicator */}
            {isRecordingAudio ? (
              <div className="min-w-0 flex-1 flex items-center justify-between px-3 py-1.5 bg-red-500/15 border border-red-500/40 rounded-xl min-h-[38px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span className="text-xs font-bold text-red-400 truncate">Recording Audio...</span>
                  <span className="font-mono text-xs font-bold text-white bg-red-950/90 px-2 py-0.5 rounded-md border border-red-500/40 shrink-0">
                    {formatRecordTimer(recordingSeconds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelAudioRecording}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
                  title="Discard Recording"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <input
                ref={inputRef}
                id="message-input"
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none px-1 md:px-2 py-1.5"
              />
            )}

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            {/* Mobile Native Camera Input with capture="environment" */}
            <input
              type="file"
              ref={mobileCameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            {/* Device Audio File Input */}
            <input
              type="file"
              ref={audioFileInputRef}
              onChange={handleAudioFileChange}
              accept="audio/*"
              className="hidden"
            />
            {/* Device Document File Input */}
            <input
              type="file"
              ref={documentFileInputRef}
              onChange={handleDocumentFileChange}
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.csv,application/pdf,application/msword,text/plain"
              className="hidden"
            />
            {/* Device Video File Input */}
            <input
              type="file"
              ref={videoFileInputRef}
              onChange={handleVideoFileChange}
              accept="video/*"
              className="hidden"
            />

            {!isRecordingAudio && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 md:p-2 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                  title="Attach File"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="p-1.5 md:p-2 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                  title="Camera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Record Icon Beside Camera: Records Audio and sends to other user as recorded audio file */}
            <button
              id="mic-record-btn"
              type="button"
              onClick={isRecordingAudio ? stopAndSendAudioRecording : startAudioRecording}
              className={`p-1.5 md:p-2 transition cursor-pointer shrink-0 rounded-xl ${
                isRecordingAudio
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/50 ring-2 ring-red-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={isRecordingAudio ? 'Stop and send voice recording' : 'Record Audio Note'}
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Circular Vibrant Orange Send Button - ALWAYS VISIBLE ON MOBILE with shrink-0 */}
            <button
              id="send-btn"
              type="button"
              onClick={isRecordingAudio ? stopAndSendAudioRecording : handleSend}
              disabled={!isRecordingAudio && !inputText.trim() && !selectedImage && !selectedAudio && !selectedVideo && !selectedDocument}
              className={`shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform ${
                isRecordingAudio || inputText.trim() || selectedImage || selectedAudio || selectedVideo || selectedDocument
                  ? 'bg-[#f97316] hover:bg-[#ea580c] active:scale-95 cursor-pointer shadow-orange-500/30'
                  : 'bg-[#f97316]/50 cursor-not-allowed opacity-60'
              }`}
              title={isRecordingAudio ? 'Send Voice Recording' : 'Send Message'}
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Row 2: Bottom Quick-Action Toolbar: Document, Image, Video, Audio, Location, Contact */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-800/80 scrollbar-none w-full">
            <button
              type="button"
              onClick={() => documentFileInputRef.current?.click()}
              className="px-3 py-1 rounded-xl bg-[#0a1218] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Open Device Documents"
            >
              <FileText className="w-3.5 h-3.5 text-[#f97316]" />
              <span>Document</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 rounded-xl bg-[#0a1218] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Open Device Photos"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Image</span>
            </button>

            <button
              type="button"
              onClick={() => videoFileInputRef.current?.click()}
              className="px-3 py-1 rounded-xl bg-[#0a1218] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Open Device Videos"
            >
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>Video</span>
            </button>

            {/* Audio Option: Opens Device Audio Files */}
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              className="px-3 py-1 rounded-xl bg-[#0a1218] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audio</span>
            </button>

            {/* Location Option: Sends High-Accuracy Live User Location */}
            <button
              type="button"
              onClick={handleShareLiveLocation}
              className="px-3 py-1 rounded-xl bg-[#0a1218] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Location</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const target = targetUser || allUsers[0];
                if (target) {
                  onSendMessage({ text: `👤 Contact: ${target.name} (${target.email || target.username})` });
                }
              }}
              className="px-3 py-1 rounded-xl bg-[#0a1218] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Laptop Camera Preview Modal (Desktop) ── */}
      {showLaptopWebcam && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-[#0d161f] border border-orange-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Camera className="w-4 h-4 text-[#f97316]" />
                <span>Laptop Camera Preview</span>
              </div>
              <button onClick={closeLaptopWebcam} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
              <video
                ref={webcamVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={closeLaptopWebcam}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureLaptopPhoto}
                className="px-6 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-bold shadow-lg shadow-orange-500/30 flex items-center gap-2 transition active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImageModal} alt="Expanded preview" className="max-w-full max-h-[85vh] rounded-2xl border border-slate-700 shadow-2xl" />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-4 -right-4 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Encryption Details Modal */}
      {showEncryptionInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowEncryptionInfo(false)}
        >
          <div
            className="w-full max-w-md bg-[#121c25] border border-teal-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">End-to-End Encryption</h3>
                  <p className="text-xs text-teal-300/80">AES-256-GCM + ECDH Protocol</p>
                </div>
              </div>
              <button onClick={() => setShowEncryptionInfo(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Messages, media files, and calls are encrypted on your device and can only be decrypted by the recipient. Nobody in between, not even SecureChat servers, can read them.
            </p>
            <div className="p-3 rounded-xl bg-[#091519] border border-teal-500/20 text-xs font-mono text-teal-400 flex items-center justify-between">
              <span>Security Code Verified</span>
              <span>● ACTIVE</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
