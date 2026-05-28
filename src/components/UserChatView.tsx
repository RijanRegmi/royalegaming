'use strict';
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, LogOut, MessageSquare, Shield, Paperclip, Mic, X, Play, Pause, FileText, Download, Loader2, Check, CheckCheck, CornerUpLeft, Smile, Trash2, Gamepad2, CreditCard, Bell, BellOff, ArrowLeft } from 'lucide-react';

interface UserChatViewProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    avatar?: string;
    linkedAdmins?: Array<{ _id: string; name: string; username: string; avatar?: string }>;
  };
}

interface CustomAudioPlayerProps {
  src: string;
  duration?: number;
  senderName?: string;
  senderAvatar?: string;
}

// Custom Audio Player component inside the bubble
function CustomAudioPlayer({ src, duration, senderName, senderAvatar }: CustomAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    if (audio.duration && audio.duration !== Infinity) {
      setTotalDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  // Handle playback rate changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error('Audio play failed:', err));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = parseFloat(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybackSpeed((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return 'U';
    return nameStr
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="voice-player-container">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Avatar indicator */}
      <div className="voice-avatar-wrapper">
        {senderAvatar ? (
          <img src={senderAvatar} alt={senderName || 'Avatar'} className="voice-avatar-img" />
        ) : (
          <span>{getInitials(senderName)}</span>
        )}
      </div>

      {/* Play/Pause Button */}
      <button type="button" className="voice-play-btn" onClick={togglePlay}>
        {isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" style={{ marginLeft: '1px' }} />
        )}
      </button>

      {/* Seek Details */}
      <div className="voice-playback-details">
        <input 
          type="range"
          className="voice-seek-slider"
          min="0"
          max={totalDuration || 100}
          step="0.05"
          value={currentTime}
          onChange={handleSliderChange}
        />
        <div className="voice-time-info">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Speed Selector Badge */}
      <span className="voice-speed-badge" onClick={cycleSpeed} title="Playback speed">
        {playbackSpeed}x
      </span>

      {/* Microphone status icon */}
      <div className="voice-mic-icon" title="Voice message">
        <Mic size={14} fill="currentColor" />
      </div>
    </div>
  );
}

export default function UserChatView({ currentUser }: UserChatViewProps) {
  const router = useRouter();
  const linkedAdmins = currentUser.linkedAdmins || [];
  const [selectedAdmin, setSelectedAdmin] = useState<any>(linkedAdmins[0] || null);
  const selectedAdminRef = useRef(selectedAdmin);

  useEffect(() => {
    selectedAdminRef.current = selectedAdmin;
  }, [selectedAdmin]);

  useEffect(() => {
    if (!selectedAdmin && linkedAdmins.length > 0) {
      setSelectedAdmin(linkedAdmins[0]);
    }
  }, [linkedAdmins, selectedAdmin]);

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return 'U';
    return nameStr
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Helper to convert base64 VAPID public key to Uint8Array for subscribe option
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.error('Service Worker registration or subscription check failed:', err);
        });
    }
  }, []);

  const handleTogglePush = async () => {
    if (!pushSupported || subscribing) return;
    setSubscribing(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      
      if (isSubscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'unsubscribe',
              subscription: {
                endpoint: sub.endpoint
              }
            })
          });
        }
        setIsSubscribed(false);
      } else {
        // Subscribe
        const keyRes = await fetch('/api/notifications/subscribe');
        if (!keyRes.ok) {
          throw new Error('Failed to retrieve VAPID public key');
        }
        const { publicKey } = await keyRes.json();
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showAlert('Permission Denied', 'Notifications permission was denied. Please enable notifications in your browser settings to receive push updates.');
          setSubscribing(false);
          return;
        }

        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        const subRes = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'subscribe',
            subscription: newSub
          })
        });

        if (!subRes.ok) {
          throw new Error('Failed to save subscription to database');
        }

        setIsSubscribed(true);
      }
    } catch (err: any) {
      console.error('Error toggling push notifications:', err);
      showAlert('Notification Error', err.message || 'Failed to toggle push notifications.');
    } finally {
      setSubscribing(false);
    }
  };
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [activeEmojiPickerMessageId, setActiveEmojiPickerMessageId] = useState<string | null>(null);

  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [messageContextMenu, setMessageContextMenu] = useState<{
    x: number;
    y: number;
    message: any;
    isMe: boolean;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm', cancelText = 'Cancel') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText,
    });
  };

  const showAlert = (title: string, message: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      confirmText: 'OK',
      cancelText: '',
    });
  };

  // Swipe gesture states and refs
  const [activeSwipeMessageId, setActiveSwipeMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const isScrollLockedRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessageContextMenu = (e: React.MouseEvent | React.TouchEvent, msg: any) => {
    e.preventDefault();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const isMe = msg.senderId._id === currentUser.id || msg.senderId === currentUser.id;

    setMessageContextMenu({
      x: clientX,
      y: clientY,
      message: msg,
      isMe
    });

    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, msg: any) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    isScrollLockedRef.current = false;
    setActiveSwipeMessageId(msg._id);
    setSwipeOffset(0);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      if (!msg.isUnsent) {
        handleMessageContextMenu(e, msg);
      }
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent, msg: any) => {
    if (activeSwipeMessageId !== msg._id) return;

    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = e.touches[0].clientY - touchStartYRef.current;

    // Cancel long press if the user moves their finger significantly
    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Determine lock (horizontal swipe vs vertical scroll)
    if (!isSwipingRef.current && !isScrollLockedRef.current) {
      if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        isSwipingRef.current = true;
      } else if (Math.abs(diffY) > 10 && Math.abs(diffY) > Math.abs(diffX)) {
        isScrollLockedRef.current = true;
      }
    }

    if (isSwipingRef.current) {
      if (e.cancelable) {
        e.preventDefault();
      }
      
      // Swipe right only
      if (diffX > 0) {
        const maxSwipe = 75;
        let offset = diffX;
        if (offset > maxSwipe) {
          offset = maxSwipe + (offset - maxSwipe) * 0.15;
        }
        setSwipeOffset(offset);
      } else {
        setSwipeOffset(0);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, msg: any) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (activeSwipeMessageId === msg._id) {
      if (isSwipingRef.current && swipeOffset >= 50) {
        setReplyingToMessage(msg);
      }
    }
    setSwipeOffset(0);
    setTimeout(() => {
      setActiveSwipeMessageId(null);
    }, 250);
  };

  const handleUnsendMessage = async (messageId: string) => {
    showConfirm(
      'Unsend Message',
      'Are you sure you want to delete this message for everyone?',
      async () => {
        try {
          const res = await fetch(`/api/messages?messageId=${messageId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg._id === messageId
                  ? {
                      ...msg,
                      isUnsent: true,
                      content: 'This message was unsent.',
                      fileUrl: null,
                      fileType: null,
                      fileName: null,
                      fileSize: null,
                      duration: null,
                      reactions: [],
                      replyTo: null,
                    }
                  : msg
              )
            );
          } else {
            showAlert('Error', data.error || 'Failed to delete message');
          }
        } catch (err) {
          console.error('Error deleting message:', err);
          showAlert('Error', 'Error deleting message');
        }
      },
      'Unsend',
      'Cancel'
    );
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    showConfirm(
      'Delete Message',
      'Are you sure you want to delete this message for yourself?',
      async () => {
        try {
          const res = await fetch(`/api/messages?messageId=${messageId}&forMe=true`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
          } else {
            showAlert('Error', data.error || 'Failed to delete message');
          }
        } catch (err) {
          console.error('Error deleting message:', err);
          showAlert('Error', 'Error deleting message');
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const handleDeleteWholeChat = async () => {
    if (!selectedAdmin) return;
    const adminId = selectedAdmin._id || selectedAdmin.id;
    showConfirm(
      'Clear Chat History',
      'Are you sure you want to delete the entire chat history? This action cannot be undone.',
      async () => {
        try {
          const res = await fetch(`/api/messages?adminId=${adminId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setMessages([]);
          } else {
            showAlert('Error', data.error || 'Failed to clear chat');
          }
        } catch (err) {
          console.error('Error clearing chat:', err);
          showAlert('Error', 'Error clearing chat');
        }
      },
      'Clear Chat',
      'Cancel'
    );
  };

  const scrollToMessage = (msgId: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const bubble = element.querySelector('.message-bubble');
      if (bubble) {
        bubble.classList.add('highlight-flash');
        setTimeout(() => {
          bubble.classList.remove('highlight-flash');
        }, 1500);
      }
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? data.message : msg))
        );
      }
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
  };
  
  // File Attachment States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'voice' | 'document' | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Lightbox Modal States
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  // Close lightbox on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    if (lightboxImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxImage]);

  // Fetch active payments
  useEffect(() => {
    const fetchPayments = async () => {
      if (!selectedAdmin) {
        setPayments([]);
        return;
      }
      try {
        const adminId = selectedAdmin._id || selectedAdmin.id;
        const res = await fetch(`/api/payments?adminId=${adminId}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setPayments(data.payments);
        }
      } catch (err) {
        console.error('Error fetching active payments:', err);
      }
    };
    fetchPayments();
  }, [selectedAdmin]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimeRef = useRef<number>(0);

  // Clean up recording timers and streams on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Fetch initial messages
  const fetchMessages = async () => {
    if (!selectedAdmin) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const adminId = selectedAdmin._id || selectedAdmin.id;
      const res = await fetch(`/api/messages?adminId=${adminId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.messages);
      } else {
        throw new Error(data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedAdmin]);

  // Click listener to close emoji picker when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.emoji-reaction-picker') || target.closest('.msg-action-btn')) return;
      setActiveEmojiPickerMessageId(null);
      setMessageContextMenu(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  // Listen to Server-Sent Events (SSE) for real-time messaging
  useEffect(() => {
    const sse = new EventSource(`/api/messages/stream?t=${Date.now()}`);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.connected) {
          if (data.onlineUsers) {
            const usersMap: Record<string, string> = {};
            data.onlineUsers.forEach((u: any) => {
              usersMap[u.userId] = u.role;
            });
            setOnlineUsers(usersMap);
          }
          return;
        }

        if (data.type === 'presence') {
          setOnlineUsers((prev) => {
            const next = { ...prev };
            if (data.online) {
              next[data.userId] = data.role;
            } else {
              delete next[data.userId];
            }
            return next;
          });
          return;
        }

        if (data.isChatCleared) {
          const currentAdmin = selectedAdminRef.current;
          const currentAdminId = currentAdmin ? (currentAdmin._id || currentAdmin.id)?.toString() : '';
          const msgAdminId = data.adminId?.toString();
          if (msgAdminId === currentAdminId) {
            setMessages(data.systemMessage ? [data.systemMessage] : []);
          }
          return;
        }

        // Append or update message in-place
        if (data._id) {
          const currentAdmin = selectedAdminRef.current;
          const currentAdminId = currentAdmin ? (currentAdmin._id || currentAdmin.id)?.toString() : '';
          const msgAdminId = data.adminId?.toString();
          
          if (msgAdminId && msgAdminId !== currentAdminId) {
            return; // Ignore message for another admin
          }

          if (data.isDeleted) {
            setMessages((prev) => prev.filter((msg) => msg._id !== data._id));
            return;
          }
          setMessages((prev) => {
            const exists = prev.some((msg) => msg._id === data._id);
            if (exists) {
              return prev.map((msg) => (msg._id === data._id ? data : msg));
            }
            return [...prev, data];
          });
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    sse.onerror = (err) => {
      console.warn('SSE connection warning, reconnecting...', err);
    };

    return () => {
      sse.close();
    };
  }, []);

  // Fallback polling for serverless environment (Vercel)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const fetchSilent = async () => {
        const currentAdmin = selectedAdminRef.current;
        if (!currentAdmin) return;
        const adminId = currentAdmin._id || currentAdmin.id;
        try {
          const res = await fetch(`/api/messages?adminId=${adminId}`);
          const data = await res.json();
          if (res.ok && data.success) {
            setMessages((prev) => {
              const prevMap = new Map(prev.map((msg) => [msg._id, msg]));
              let hasChanges = false;
              const merged = data.messages.map((newMsg: any) => {
                const existing = prevMap.get(newMsg._id);
                if (!existing) {
                  hasChanges = true;
                  return newMsg;
                }
                const rxCountPrev = existing.reactions?.length || 0;
                const rxCountNew = newMsg.reactions?.length || 0;
                if (existing.isRead !== newMsg.isRead || rxCountPrev !== rxCountNew || existing.isUnsent !== newMsg.isUnsent || existing.content !== newMsg.content) {
                  hasChanges = true;
                  return newMsg;
                }
                return existing;
              });
              if (merged.length !== prev.length || hasChanges) {
                return merged;
              }
              return prev;
            });
          }
        } catch (err) {
          console.warn('Silent messages poll failed:', err);
        }
      };
      fetchSilent();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // Scroll to bottom only when a new message is added
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // File Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      setFileType('image');
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFileType('document');
      setFilePreview(null);
    }
  };

  const handleCancelFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Audio Recording Handlers
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 100) {
            const duration = recordingTimeRef.current;
            await uploadVoiceMessage(audioBlob, duration);
          }
        }
        cleanupRecordingResources();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);

    } catch (err) {
      console.error('Error starting audio recording:', err);
      showAlert('Microphone Error', 'Could not access microphone. Please check browser permissions.');
    }
  };

  const cleanupRecordingResources = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = () => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingResources();
    }
  };

  const formatRecordingTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Upload Voice Message
  const uploadVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!selectedAdmin) return;
    const adminId = selectedAdmin._id || selectedAdmin.id;
    setSending(true);
    try {
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'voice');
      formData.append('duration', duration.toString());
      formData.append('adminId', adminId);
      if (replyingToMessage) {
        formData.append('replyTo', replyingToMessage._id);
      }

      const res = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send voice message');
      }

      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === data.message._id);
        if (exists) {
          return prev.map((msg) => (msg._id === data.message._id ? data.message : msg));
        }
        return [...prev, data.message];
      });
      setReplyingToMessage(null);
    } catch (err) {
      console.error('Error sending voice message:', err);
    } finally {
      setSending(false);
    }
  };

  // Send Message (Text & File Upload)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    const adminId = selectedAdmin._id || selectedAdmin.id;
    
    const hasText = !!inputText.trim();
    const hasFile = !!selectedFile;
    
    if (!hasText && !hasFile) return;
    if (sending) return;

    setSending(true);

    try {
      if (hasFile) {
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('type', fileType!);
        formData.append('adminId', adminId);
        if (replyingToMessage) {
          formData.append('replyTo', replyingToMessage._id);
        }
        if (hasText) {
          formData.append('content', inputText.trim());
        }

        const res = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload and send message');
        }

        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === data.message._id);
          if (exists) {
            return prev.map((msg) => (msg._id === data.message._id ? data.message : msg));
          }
          return [...prev, data.message];
        });

        handleCancelFile();
        setInputText('');
      } else {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: inputText.trim(),
            adminId,
            replyTo: replyingToMessage ? replyingToMessage._id : undefined
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === data.message._id);
          if (exists) {
            return prev.map((msg) => (msg._id === data.message._id ? data.message : msg));
          }
          return [...prev, data.message];
        });
        setInputText('');
      }
      setReplyingToMessage(null);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px' }}>Loading chat history...</p>
      </div>
    );
  }

  if (linkedAdmins.length === 0) {
    return (
      <div className="fullscreen-loader" style={{ flexDirection: 'column', gap: '20px', padding: '20px', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '40px 30px',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '450px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255, 180, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffb400'
          }}>
            <MessageSquare size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No Support Channel</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            You are not connected to any support administrator. Please access the site through an administrator's referral link to start a conversation.
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
            <button 
              className="btn-primary" 
              onClick={() => window.location.href = '/'}
              style={{ flex: 1, margin: 0, padding: '12px', fontSize: '14px', width: '100%' }}
            >
              Go to Lobby Front
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fullscreen-loader" style={{ flexDirection: 'column', gap: '20px', padding: '20px', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '40px 30px',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '450px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(234, 0, 56, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff4b6b'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Connection Error</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            We encountered an issue loading your data. Please check your connection and try again.
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
            <button 
              className="btn-secondary" 
              onClick={fetchMessages}
              style={{ flex: 1, margin: 0, padding: '12px', fontSize: '14px', width: 'auto' }}
            >
              Try Again
            </button>
            <button 
              className="btn-primary" 
              onClick={() => router.push('/login')}
              style={{ flex: 1, margin: 0, padding: '12px', fontSize: '14px', width: 'auto' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${selectedAdmin ? 'has-selected-user' : ''}`}>
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="user-profile-badge">
            <div className="avatar-wrapper">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="avatar-image" />
              ) : (
                getInitials(currentUser.name)
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name">{currentUser.name}</span>
              <span className="role-badge user" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>Player</span>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" title="Go to Lobby Front" onClick={() => window.location.href = '/'}>
              <Gamepad2 size={18} />
            </button>
            <button className="icon-btn" title="Log Out" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="sidebar-title" style={{ padding: '16px 20px 8px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Support Admins
        </div>

        <div className="conversation-list">
          {linkedAdmins.map((admin: any) => {
            const adminId = admin._id || admin.id;
            const isSelected = selectedAdmin && (selectedAdmin._id === adminId || selectedAdmin.id === adminId);
            const isOnline = Object.entries(onlineUsers).some(([uId, uRole]) => uId === adminId && (uRole === 'admin' || uRole === 'super_admin'));
            return (
              <div
                key={adminId}
                className={`conversation-item ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedAdmin(admin)}
              >
                <div className="sidebar-avatar-container">
                  <div className="avatar-wrapper" style={{ width: '45px', height: '45px', fontSize: '15px' }}>
                    {admin.avatar ? (
                      <img src={admin.avatar} alt={admin.name} className="avatar-image" />
                    ) : (
                      getInitials(admin.name)
                    )}
                  </div>
                  {isOnline && <span className="sidebar-online-badge" />}
                </div>
                <div className="convo-details">
                  <div className="convo-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="convo-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{admin.name}</span>
                    <span className="role-badge admin" style={{ fontSize: '8px', padding: '1px 4px', textTransform: 'uppercase', flexShrink: 0, marginTop: 0 }}>
                      Admin
                    </span>
                  </div>
                  <div className="convo-row">
                    <span className="convo-message-preview">
                      @{admin.username || 'admin'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="chat-area">
        {selectedAdmin ? (
          <>
            {/* Header */}
            <header className="chat-header">
              <div className="chat-user-info" style={{ minWidth: 0, overflow: 'hidden' }}>
                <button 
                  className="mobile-back-btn icon-btn" 
                  onClick={() => setSelectedAdmin(null)}
                  style={{ marginRight: '8px', flexShrink: 0 }}
                  title="Back to admin list"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="avatar-wrapper" style={{ flexShrink: 0 }}>
                  {selectedAdmin.avatar ? (
                    <img src={selectedAdmin.avatar} alt={selectedAdmin.name} className="avatar-image" />
                  ) : (
                    getInitials(selectedAdmin.name)
                  )}
                </div>
                <div className="chat-user-details" style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span className="chat-user-name" style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '120px'
                    }}>{selectedAdmin.name}</span>
                    <span className="role-badge admin" style={{ fontSize: '9px', padding: '1px 5px', textTransform: 'uppercase', marginTop: 0, flexShrink: 0 }}>
                      Admin
                    </span>
                  </div>
                  <div className="chat-user-status-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', rowGap: '2px', marginTop: '2px' }}>
                    {Object.entries(onlineUsers).some(([uId, uRole]) => uId === (selectedAdmin._id || selectedAdmin.id) && (uRole === 'admin' || uRole === 'super_admin')) ? (
                      <span className="chat-user-status" style={{ color: 'var(--success-color)', fontSize: '11px' }}>
                        ● Online & Ready to Help
                      </span>
                    ) : (
                      <span className="chat-user-status" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        ○ Offline (Replies may be delayed)
                      </span>
                    )}
                    <span className="chat-logged-in-as" style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', borderLeft: '1px solid rgba(255, 255, 255, 0.15)', paddingLeft: '8px', whiteSpace: 'nowrap' }}>
                      Logged in as: <strong style={{ color: '#ffffff' }}>{currentUser.name}</strong>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {pushSupported && (
                  <button 
                    type="button" 
                    className={`icon-btn ${isSubscribed ? 'active-bell' : ''}`} 
                    title={isSubscribed ? "Disable Push Notifications" : "Enable Push Notifications"} 
                    onClick={handleTogglePush}
                    disabled={subscribing}
                  >
                    {isSubscribed ? (
                      <Bell size={20} style={{ color: 'var(--success-color)' }} />
                    ) : (
                      <BellOff size={20} style={{ opacity: 0.6 }} />
                    )}
                  </button>
                )}
                <button className="icon-btn" title="Go to Lobby Front" onClick={() => window.location.href = '/'}>
                  <Gamepad2 size={20} />
                </button>
                <button className="icon-btn delete-chat-btn" title="Delete Chat History" onClick={handleDeleteWholeChat}>
                  <Trash2 size={20} />
                </button>
                {currentUser.role === 'super_admin' && (
                  <button className="icon-btn" title="Go to Admin Panel" onClick={() => window.location.href = '/admin'}>
                    <Shield size={20} />
                  </button>
                )}
                <button className="icon-btn" title="Log Out" onClick={handleLogout}>
                  <LogOut size={20} />
                </button>
              </div>
            </header>

      {/* Messages Pane */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">
              <MessageSquare size={64} />
            </div>
            <h2>Start a Conversation</h2>
            <p>Type a message below to contact the administration team. An admin will get back to you shortly.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            if (msg.isSystem) {
              return (
                <div key={msg._id} className="system-message-row">
                  <div className="system-message-content">
                    {msg.content}
                  </div>
                </div>
              );
            }

            const isMe = msg.senderId._id === currentUser.id || msg.senderId === currentUser.id;
            const senderRole = msg.senderId.role;
            const isSenderAdmin = senderRole === 'admin' || senderRole === 'super_admin';
            const hasImageOnly = msg.fileType === 'image' && !msg.content;
            
            const isAdminOnline = Object.values(onlineUsers).some(role => role === 'admin' || role === 'super_admin');

            const reactions = msg.reactions || [];
            const groupedReactions: { emoji: string; count: number; hasMyReaction: boolean }[] = [];
            reactions.forEach((reaction: any) => {
              const rUserId = reaction.userId?._id || reaction.userId;
              const isMyReaction = rUserId === currentUser.id;
              const existing = groupedReactions.find((gr) => gr.emoji === reaction.emoji);
              if (existing) {
                existing.count += 1;
                if (isMyReaction) {
                  existing.hasMyReaction = true;
                }
              } else {
                groupedReactions.push({
                  emoji: reaction.emoji,
                  count: 1,
                  hasMyReaction: isMyReaction,
                });
              }
            });

            return (
              <div
                key={msg._id}
                id={`msg-${msg._id}`}
                className={`message-bubble-row ${isMe ? 'sent' : 'received'} ${
                  !isMe && isSenderAdmin ? 'admin-sender' : ''
                }`}
              >
                {/* Emoji picker overlay */}
                {activeEmojiPickerMessageId === msg._id && (
                  <div className={`emoji-reaction-picker ${index <= 1 ? 'picker-bottom' : ''}`} onClick={(e) => e.stopPropagation()}>
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="reaction-emoji-btn"
                        onClick={() => {
                          handleReactToMessage(msg._id, emoji);
                          setActiveEmojiPickerMessageId(null);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div 
                  className="message-bubble-wrapper"
                  onTouchStart={(e) => handleTouchStart(e, msg)}
                  onTouchMove={(e) => handleTouchMove(e, msg)}
                  onTouchEnd={(e) => handleTouchEnd(e, msg)}
                  onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return; // Left click only
                    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = setTimeout(() => {
                      if (!msg.isUnsent) {
                        handleMessageContextMenu(e, msg);
                      }
                    }, 600);
                  }}
                  onMouseUp={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  onMouseLeave={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                >
                  {/* Hover actions */}
                  {!msg.isUnsent && (
                    <div className="message-actions-overlay">
                      <button
                        type="button"
                        className="msg-action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMe) {
                            handleUnsendMessage(msg._id);
                          } else {
                            handleDeleteMessageForMe(msg._id);
                          }
                        }}
                        title={isMe ? "Unsend message" : "Delete message"}
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => setReplyingToMessage(msg)}
                        title="Reply to message"
                      >
                        <CornerUpLeft size={14} />
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEmojiPickerMessageId(activeEmojiPickerMessageId === msg._id ? null : msg._id);
                        }}
                        title="React to message"
                      >
                        <Smile size={14} />
                      </button>
                    </div>
                  )}
                  {activeSwipeMessageId === msg._id && swipeOffset > 10 && (
                    <div 
                      className="swipe-reply-indicator"
                      style={{
                        opacity: Math.min(swipeOffset / 50, 1),
                        transform: `translateY(-50%) scale(${Math.min(swipeOffset / 50, 1)})`
                      }}
                    >
                      <CornerUpLeft size={16} />
                    </div>
                  )}
                  <div 
                    className={`message-bubble ${msg.fileType === 'image' ? 'has-image' : ''} ${hasImageOnly ? 'has-image-only' : ''} ${msg.isUnsent ? 'unsent-bubble' : ''}`}
                    style={{
                      transform: activeSwipeMessageId === msg._id ? `translateX(${swipeOffset}px)` : undefined,
                      transition: activeSwipeMessageId === msg._id ? 'none' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                    onDoubleClick={() => {
                      if (!msg.isUnsent) {
                        handleReactToMessage(msg._id, '❤️');
                      }
                    }}
                  >
                  {!isMe && (
                    <span className="message-sender-name">
                      {msg.senderId.name} ({senderRole === 'super_admin' ? 'Super Admin' : 'Admin'})
                    </span>
                  )}

                  {/* Reply Reference Quote */}
                  {msg.replyTo && (
                    <div 
                      className="message-reply-quote" 
                      onClick={() => scrollToMessage(msg.replyTo._id || msg.replyTo)}
                    >
                      <span className="reply-quote-sender">
                        {msg.replyTo.senderId?.name || 'Message'}
                      </span>
                      <span className="reply-quote-content">
                        {msg.replyTo.fileType === 'image' && '📷 Image '}
                        {msg.replyTo.fileType === 'voice' && '🎵 Voice Message '}
                        {msg.replyTo.fileType === 'document' && '📄 Document '}
                        {msg.replyTo.content || ''}
                      </span>
                    </div>
                  )}
                  
                  {/* Rich Media Content rendering */}
                  {msg.fileUrl && (
                    <div style={{ marginBottom: msg.content ? '6px' : '0px' }}>
                      {msg.fileType === 'image' && (
                        <div className="message-media-image-container">
                          <img 
                            src={msg.fileUrl} 
                            alt={msg.fileName || 'Image'} 
                            className="message-media-image" 
                            onClick={() => {
                              setLightboxImage(msg.fileUrl);
                              setLightboxTitle(msg.fileName || 'Image');
                            }}
                          />
                        </div>
                      )}
                      {msg.fileType === 'voice' && (
                        <CustomAudioPlayer 
                          src={msg.fileUrl} 
                          duration={msg.duration} 
                          senderName={msg.senderId?.name || (isMe ? currentUser.name : 'Admin')}
                          senderAvatar={msg.senderId?.avatar}
                        />
                      )}
                      {msg.fileType === 'document' && (
                        <div className="document-card">
                          <div className="document-icon-wrapper">
                            <FileText size={20} />
                          </div>
                          <div className="document-info-block">
                            <span className="document-card-name" title={msg.fileName}>{msg.fileName}</span>
                            <span className="document-card-size">
                              {msg.fileSize ? `${(msg.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size'}
                            </span>
                          </div>
                          <a 
                            href={msg.fileUrl} 
                            download={msg.fileName} 
                            className="document-download-action"
                            title="Download document"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.content && <span className="message-text">{msg.content}</span>}
                  
                  <div className="message-bubble-meta">
                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                    {isMe && (
                      <span className="message-ticks">
                        {msg.isRead ? (
                          <CheckCheck size={15} className="tick-read" />
                        ) : isAdminOnline ? (
                          <CheckCheck size={15} className="tick-delivered" />
                        ) : (
                          <Check size={15} className="tick-sent" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Reaction pills */}
                  {!msg.isUnsent && groupedReactions.length > 0 && (
                    <div className="reaction-pills-container">
                      {groupedReactions.map((gr) => (
                        <button
                          key={gr.emoji}
                          type="button"
                          className={`reaction-pill ${gr.hasMyReaction ? 'my-reaction' : ''}`}
                          onClick={() => handleReactToMessage(msg._id, gr.emoji)}
                          title={gr.hasMyReaction ? "Remove reaction" : "React with this emoji"}
                        >
                          <span>{gr.emoji}</span>
                          <span className="reaction-pill-count">{gr.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedFile && (
        <div className="file-preview-bar">
          <div className="file-preview-card">
            {fileType === 'image' && filePreview ? (
              <img src={filePreview} alt="upload preview" className="file-preview-thumbnail" />
            ) : (
              <div className="document-icon-wrapper" style={{ width: '36px', height: '36px' }}>
                <FileText size={18} />
              </div>
            )}
            <div className="file-preview-details">
              <span className="file-preview-name">{selectedFile.name}</span>
              <span className="file-preview-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
            <button type="button" className="file-preview-remove" onClick={handleCancelFile}>
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyingToMessage && (
        <div className="reply-preview-bar">
          <div className="reply-preview-content">
            <span className="reply-preview-title">
              Replying to {replyingToMessage.senderId._id === currentUser.id || replyingToMessage.senderId === currentUser.id ? 'yourself' : replyingToMessage.senderId.name}
            </span>
            <span className="reply-preview-text">
              {replyingToMessage.fileType === 'image' && '📷 Image '}
              {replyingToMessage.fileType === 'voice' && '🎵 Voice Message '}
              {replyingToMessage.fileType === 'document' && '📄 Document '}
              {replyingToMessage.content || ''}
            </span>
          </div>
          <button 
            type="button" 
            className="reply-preview-close" 
            onClick={() => setReplyingToMessage(null)}
            title="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form className="chat-input-bar" onSubmit={handleSendMessage}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
        />
        
        {!isRecording && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="chat-action-btn" 
              onClick={triggerFileSelect} 
              title="Attach file or image"
              disabled={sending}
            >
              <Paperclip size={20} />
            </button>
            <button 
              type="button" 
              className="chat-action-btn" 
              onClick={() => setShowPaymentModal(true)} 
              title="View Payment QR Codes"
              disabled={sending}
            >
              <CreditCard size={20} />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="voice-recording-banner">
            <div className="recording-indicator">
              <div className="recording-status-dot" />
              <span>Recording voice note...</span>
              <span className="recording-timer">{formatRecordingTime(recordingTime)}</span>
            </div>
            <div className="recording-actions">
              <button 
                type="button" 
                className="recording-action-btn cancel" 
                onClick={handleCancelRecording}
                title="Cancel recording"
              >
                <X size={18} />
              </button>
              <button 
                type="button" 
                className="recording-action-btn send" 
                onClick={handleStopRecording}
                title="Send recording"
              >
                <Send size={16} fill="white" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-input-wrapper">
              <input
                type="text"
                placeholder={selectedFile ? "Add a caption..." : "Type a message to admins..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
              />
            </div>
            
            {/* Toggle Mic / Send Button */}
            {inputText.trim() || selectedFile ? (
              <button type="submit" className="send-btn" disabled={sending}>
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} fill="white" />}
              </button>
            ) : (
              <button 
                type="button" 
                className="send-btn" 
                onClick={handleStartRecording} 
                title="Record voice message"
                disabled={sending}
              >
                <Mic size={18} fill="white" />
              </button>
            )}
          </>
        )}
      </form>
    </>
  ) : (
          <div className="chat-empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div className="chat-empty-icon" style={{ marginBottom: '16px' }}>
              <MessageSquare size={64} />
            </div>
            <h2>No Admin Selected</h2>
            <p>Please select an administrator from the list to start support chat.</p>
          </div>
        )}
      </section>

      {/* Fullscreen Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-title">{lightboxTitle || 'Image View'}</span>
            <div className="lightbox-actions">
              <a 
                href={lightboxImage} 
                download={lightboxTitle || 'image'} 
                className="lightbox-action-btn"
                title="Download image"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={18} />
              </a>
              <button 
                type="button" 
                className="lightbox-action-btn" 
                onClick={() => setLightboxImage(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="lightbox-body">
            <img 
              src={lightboxImage} 
              alt={lightboxTitle || 'Fullscreen'} 
              className="lightbox-image" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="custom-modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${confirmModal.cancelText ? 'warning' : ''}`}>
              <span className="modal-title">{confirmModal.title}</span>
              <button type="button" className="modal-close-btn" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="modal-actions">
              {confirmModal.cancelText && (
                <button type="button" className="btn-secondary" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                  {confirmModal.cancelText}
                </button>
              )}
              <button type="button" className="btn-danger" onClick={confirmModal.onConfirm}>
                {confirmModal.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="custom-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="custom-modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} /> Support Payment Gateways
              </span>
              <button type="button" className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Please scan any of the QR codes below to make a payment deposit. Click on a QR code to view it full screen.
              </p>
              {payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
                  No payment gateways are currently configured. Please message the admin support team below for instructions.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {payments.map((payment) => (
                    <div 
                      key={payment._id} 
                      className="payment-gateway-card"
                      onClick={() => {
                        setLightboxImage(payment.qrImage);
                        setLightboxTitle(payment.name);
                        setShowPaymentModal(false);
                      }}
                      title="Click to view full screen"
                    >
                      <div 
                        style={{ 
                          width: '90px', 
                          height: '90px', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          background: 'white', 
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <img 
                          src={payment.qrImage} 
                          alt={payment.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{payment.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scan QR code or click to enlarge.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px', margin: 0, width: '100%' }} onClick={() => setShowPaymentModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {messageContextMenu && (
        <div 
          className="context-menu glass"
          style={{
            position: 'fixed',
            top: `${Math.min(messageContextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 250 : messageContextMenu.y)}px`,
            left: `${Math.min(messageContextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 220 : messageContextMenu.x)}px`,
            zIndex: 100000,
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-2xl)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '200px'
          }}
          onClick={() => setMessageContextMenu(null)}
        >
          {/* Reaction Emojis Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '4px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '4px',
            gap: '6px'
          }} onClick={(e) => e.stopPropagation()}>
            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="reaction-emoji-btn"
                style={{
                  fontSize: '18px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  transition: 'transform 0.15s ease'
                }}
                onClick={() => {
                  handleReactToMessage(messageContextMenu.message._id, emoji);
                  setMessageContextMenu(null);
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Action Options */}
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              textAlign: 'left',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background 0.2s',
              width: '100%'
            }}
            onClick={() => {
              setReplyingToMessage(messageContextMenu.message);
              setMessageContextMenu(null);
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <CornerUpLeft size={15} /> Reply
          </button>

          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: '#ff4b6b',
              textAlign: 'left',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background 0.2s',
              width: '100%'
            }}
            onClick={() => {
              const msg = messageContextMenu.message;
              if (messageContextMenu.isMe) {
                handleUnsendMessage(msg._id);
              } else {
                handleDeleteMessageForMe(msg._id);
              }
              setMessageContextMenu(null);
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234, 0, 56, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={15} /> {messageContextMenu.isMe ? 'Unsend for Everyone' : 'Delete for Me'}
          </button>
        </div>
      )}
    </div>
  );
}
