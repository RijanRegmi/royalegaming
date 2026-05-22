'use strict';
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, LogOut, MessageSquare, Shield, Paperclip, Mic, X, Play, Pause, FileText, Download, Loader2 } from 'lucide-react';

interface UserChatViewProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    avatar?: string;
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
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/messages');
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
  }, []);

  // Listen to Server-Sent Events (SSE) for real-time messaging
  useEffect(() => {
    const sse = new EventSource(`/api/messages/stream?t=${Date.now()}`);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.connected) return; // Handshake message

        // Append message if it belongs to this conversation and isn't already added
        if (data._id) {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg._id === data._id);
            if (exists) return prev;
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
      if (sse) sse.close();
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      alert('Could not access microphone. Please check browser permissions.');
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
    setSending(true);
    try {
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'voice');
      formData.append('duration', duration.toString());

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
        if (exists) return prev;
        return [...prev, data.message];
      });
    } catch (err) {
      console.error('Error sending voice message:', err);
    } finally {
      setSending(false);
    }
  };

  // Send Message (Text & File Upload)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
          if (exists) return prev;
          return [...prev, data.message];
        });

        handleCancelFile();
        setInputText('');
      } else {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: inputText.trim() }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        setInputText('');
      }
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
    <div className="chat-area">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-user-info">
          <div className="avatar-wrapper">
            <MessageSquare size={18} fill="white" />
          </div>
          <div className="chat-user-details">
            <span className="chat-user-name">RoyaleGaming Admin Support</span>
            <span className="chat-user-status" style={{ color: 'var(--success-color)' }}>
              ● Online & Ready to Help
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentUser.role === 'super_admin' && (
            <button className="icon-btn" title="Go to Admin Panel" onClick={() => router.push('/admin')}>
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
          messages.map((msg) => {
            const isMe = msg.senderId._id === currentUser.id || msg.senderId === currentUser.id;
            const senderRole = msg.senderId.role;
            const isSenderAdmin = senderRole === 'admin' || senderRole === 'super_admin';
            const hasImageOnly = msg.fileType === 'image' && !msg.content;

            return (
              <div
                key={msg._id}
                className={`message-bubble-row ${isMe ? 'sent' : 'received'} ${
                  !isMe && isSenderAdmin ? 'admin-sender' : ''
                }`}
              >
                <div className={`message-bubble ${hasImageOnly ? 'has-image-only' : ''}`}>
                  {!isMe && (
                    <span className="message-sender-name">
                      {msg.senderId.name} ({senderRole === 'super_admin' ? 'Super Admin' : 'Admin'})
                    </span>
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
          <button 
            type="button" 
            className="chat-action-btn" 
            onClick={triggerFileSelect} 
            title="Attach file or image"
            disabled={sending}
          >
            <Paperclip size={20} />
          </button>
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
    </div>
  );
}
