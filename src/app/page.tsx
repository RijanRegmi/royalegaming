'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogOut, LogIn, Shield, Bell, ArrowRight, Loader2, User as UserIcon, Heart, Trash2, Image as ImageIcon, ThumbsUp, Pencil, X, Gamepad2, Sparkles } from 'lucide-react';
import AdSenseBanner from '@/components/AdSenseBanner';
import SponsoredPostCard from '@/components/SponsoredPostCard';

interface PostItem {
  _id: string;
  adminId: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
    role: string;
  };
  content: string;
  image?: string;
  likes: string[];
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const getInitials = (fullName: string) => {
    if (!fullName) return '';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [verifyingAuth, setVerifyingAuth] = useState<boolean>(true);
  const [notices, setNotices] = useState<any[]>([]);
  const [loadingNotices, setLoadingNotices] = useState<boolean>(true);
  const [gamesList, setGamesList] = useState<any[]>([]);

  // 3D Carousel Drag & Spin State Refs
  const ringRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const lastX = useRef<number>(0);
  const rotationY = useRef<number>(0);
  const startRotation = useRef<number>(0);
  const velocity = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const autoSpinSpeedRef = useRef<number>(0.15);
  useEffect(() => {
    const friction = 0.95;
    const updateRotation = () => {
      if (!isDragging.current) {
        velocity.current *= friction;
        if (Math.abs(velocity.current) < 0.01) {
          velocity.current = 0;
        }
        rotationY.current += autoSpinSpeedRef.current + velocity.current;
        if (ringRef.current) {
          const speedScale = 1 + Math.min(Math.abs(velocity.current) * 0.006, 0.14);
          ringRef.current.style.transform = `scale3d(${speedScale},${speedScale},1) rotateY(${rotationY.current}deg)`;
        }
      }
      requestRef.current = requestAnimationFrame(updateRotation);
    };
    requestRef.current = requestAnimationFrame(updateRotation);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const handleDragStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    lastX.current = clientX;
    startRotation.current = rotationY.current;
    velocity.current = 0;
    lastTime.current = performance.now();
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;
    const deltaX = clientX - startX.current;
    const deltaAngle = deltaX * 0.35;
    rotationY.current = startRotation.current + deltaAngle;

    const now = performance.now();
    const dt = now - lastTime.current;
    const dx = clientX - lastX.current;
    if (dt > 0) {
      const instantVelocity = (dx * 0.35) / (dt / 16.66);
      velocity.current = velocity.current * 0.4 + instantVelocity * 0.6;
    }

    lastX.current = clientX;
    lastTime.current = now;

    if (ringRef.current) {
      // Simple flat rotation - no tilt
      const speedScale = 1 + Math.min(Math.abs(velocity.current) * 0.006, 0.14);
      ringRef.current.style.transform = `scale3d(${speedScale},${speedScale},1) rotateY(${rotationY.current}deg)`;
    }
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    const maxVelocity = 18;
    velocity.current = Math.max(-maxVelocity, Math.min(maxVelocity, velocity.current));
    // Persist spin direction: if flicked hard, auto-spin continues that way
    if (Math.abs(velocity.current) > 1.0) {
      autoSpinSpeedRef.current = velocity.current > 0 ? 0.15 : -0.15;
    }
  };

  // Post Creator State
  const [content, setContent] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Post Edit State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editDeleteImage, setEditDeleteImage] = useState<boolean>(false);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Admin Profile View State
  const [viewingAdmin, setViewingAdmin] = useState<any | null>(null);
  const [adminPosts, setAdminPosts] = useState<PostItem[]>([]);
  const [loadingAdminPosts, setLoadingAdminPosts] = useState<boolean>(false);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Ad loading status state
  const [leftAdStatus, setLeftAdStatus] = useState<'filled' | 'unfilled' | 'loading'>('loading');
  const [rightAdStatus, setRightAdStatus] = useState<'filled' | 'unfilled' | 'loading'>('loading');

  // Confirmation Modal State
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
    onConfirm: () => { },
  });

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

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/posts');
        const data = await res.json();
        if (res.ok && data.success) {
          setPosts(data.posts || []);
        }
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    };

    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/notices');
        const data = await res.json();
        if (res.ok && data.success) {
          setNotices(data.notices || []);
        }
      } catch (err) {
        console.error('Error fetching notices:', err);
      } finally {
        setLoadingNotices(false);
      }
    };

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setUser(data.user);
          setAuthenticated(true);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setVerifyingAuth(false);
      }
    };

    const fetchGamesList = async () => {
      try {
        const res = await fetch('/api/games');
        const data = await res.json();
        if (res.ok && data.success) {
          setGamesList(data.games || []);
        }
      } catch (err) {
        console.error('Error fetching games list:', err);
      }
    };

    fetchPosts();
    fetchNotices();
    checkAuth();
    fetchGamesList();

    // Check if query param viewAdmin is set to open profile modal automatically
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const viewAdminId = urlParams.get('viewAdmin');
      if (viewAdminId) {
        const fetchAdminAndPosts = async () => {
          try {
            const adminRes = await fetch(`/api/auth/link-admin?slug=${viewAdminId}`);
            const adminData = await adminRes.json();
            if (adminRes.ok && adminData.success) {
              setViewingAdmin(adminData.admin);
              setLoadingAdminPosts(true);
              const actualAdminId = adminData.admin.id || adminData.admin._id || viewAdminId;
              const postsRes = await fetch(`/api/posts?adminId=${actualAdminId}`);
              const postsData = await postsRes.json();
              if (postsRes.ok && postsData.success) {
                setAdminPosts(postsData.posts || []);
              }
            }
          } catch (err) {
            console.error('Error loading admin profile from URL:', err);
          } finally {
            setLoadingAdminPosts(false);
          }
        };
        fetchAdminAndPosts();
      }
    }

    // Allow document scrolling for lobby page
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        setAuthenticated(false);
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleChatAccess = () => {
    if (authenticated) {
      router.push('/chat');
    } else {
      router.push('/login?redirect=/chat');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRemoveAttachedImage = () => {
    setFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) => [data.post, ...prev]);
        setContent('');
        setFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        showAlert('Error', data.error || 'Failed to create post');
      }
    } catch (err) {
      console.error('Create post error:', err);
      showAlert('Error', 'Error creating post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!authenticated) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) =>
          prev.map((post) => {
            if (post._id === postId) {
              const currentUserId = user.id || user._id;
              const newLikes = data.liked
                ? [...post.likes, currentUserId]
                : post.likes.filter((id) => id !== currentUserId);
              return { ...post, likes: newLikes };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleDeletePost = (postId: string) => {
    showConfirm(
      'Delete Post',
      'Are you sure you want to delete this post?',
      async () => {
        try {
          const res = await fetch(`/api/posts?postId=${postId}`, {
            method: 'DELETE',
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setPosts((prev) => prev.filter((post) => post._id !== postId));
          } else {
            showAlert('Error', data.error || 'Failed to delete post');
          }
        } catch (err) {
          console.error('Delete error:', err);
          showAlert('Error', 'Error deleting post. Please try again.');
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const startEditPost = (post: PostItem) => {
    setEditingPostId(post._id);
    setEditContent(post.content);
    setEditImagePreview(post.image || null);
    setEditFile(null);
    setEditDeleteImage(false);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setEditFile(selectedFile);
      setEditDeleteImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRemoveEditImage = () => {
    setEditFile(null);
    setEditImagePreview(null);
    setEditDeleteImage(true);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId) return;

    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('postId', editingPostId);
      formData.append('content', editContent);
      if (editFile) {
        formData.append('file', editFile);
      }
      formData.append('deleteImage', editDeleteImage ? 'true' : 'false');

      const res = await fetch('/api/posts', {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) =>
          prev.map((post) => (post._id === editingPostId ? data.post : post))
        );
        setEditingPostId(null);
        // Also update adminPosts if currently viewing
        if (viewingAdmin) {
          setAdminPosts((prev) =>
            prev.map((post) => (post._id === editingPostId ? data.post : post))
          );
        }
      } else {
        showAlert('Error', data.error || 'Failed to update post');
      }
    } catch (err) {
      console.error('Update post error:', err);
      showAlert('Error', 'Error updating post');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleViewAdminProfile = (adminId: string, adminObj: any) => {
    const actualAdminId = adminId || adminObj?.id || adminObj?._id;
    if (!actualAdminId) {
      console.error('No admin ID found for profile view', adminId, adminObj);
      return;
    }
    const adminSlug = adminObj?.username || actualAdminId;
    router.push(`/profile/${adminSlug}`);
  };

  const formatPostTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  if (verifyingAuth) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          gap: '24px',
        }}>
          {/* RILOGRAM Logo */}
          <div style={{
            borderRadius: '24px',
            boxShadow: '0 0 24px rgba(168, 85, 247, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src="/rilogram_logo.png" 
              alt="Rilogram Logo" 
              style={{ width: '180px', height: '120px', objectFit: 'contain' }}
            />
          </div>

          {/* Animated spinner */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(168,85,247,0.15)',
            borderTop: '3px solid #a855f7',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        </div>

        {/* Developed by RJN */}
        <div style={{
          position: 'absolute',
          bottom: '36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
        }}>
          <span style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.35)',
            fontWeight: 400,
            letterSpacing: '1px',
            marginBottom: '8px',
          }}>
            from
          </span>
          <img 
            src="/assets/logo/RJN.png" 
            alt="RJN Logo" 
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              border: '2px solid rgba(255, 255, 255, 0.1)',
              objectFit: 'cover' 
            }}
          />
        </div>
      </div>
    );
  }

  if (!verifyingAuth && !authenticated) {
    return (
      <div className="landing-container" style={{
        minHeight: '100dvh',
        height: '100dvh',
        background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        color: '#ffffff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        overflowX: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '40px 20px 28px',
        boxSizing: 'border-box',
      }}>
        {/* Floating background glowing orbs */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0,0,0,0) 70%)',
          top: '10%',
          left: '5%',
          zIndex: 0,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(0, 168, 132, 0.12) 0%, rgba(0,0,0,0) 70%)',
          bottom: '10%',
          right: '5%',
          zIndex: 0,
          pointerEvents: 'none',
        }} />

        {/* Custom Styles for 3D Rotating Loop Circle */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap');
          
          .carousel-3d-stage {
            perspective: 3000px;
            width: 100%;
            height: 380px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            margin: 30px 0;
            z-index: 2;
            cursor: grab;
            user-select: none;
          }

          .carousel-3d-stage:active {
            cursor: grabbing;
          }

          .carousel-3d-ring {
            transform-style: preserve-3d;
            width: 190px;
            height: 260px;
            position: relative;
            user-select: none;
            -webkit-user-drag: none;
            transition: transform 0.05s linear;
          }

          .carousel-3d-card {
            position: absolute;
            width: 100%;
            height: 100%;
            left: 0;
            top: 0;
            border-radius: 18px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(12px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            transition: border-color 0.4s, box-shadow 0.4s;
            cursor: pointer;
            backface-visibility: visible;
            transform: rotateY(var(--card-angle)) translateZ(var(--card-z));
          }

          .carousel-3d-card:hover {
            border-color: #a855f7;
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
            z-index: 100 !important;
          }

          .carousel-3d-card img {
            width: 100%;
            height: 82%;
            object-fit: cover;
            border-radius: 12px;
            pointer-events: none;
            -webkit-user-drag: none;
          }

          .carousel-3d-card-title {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            margin: 4px 0;
            text-align: center;
            text-shadow: 0 2px 4px rgba(0,0,0,0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            padding: 0 4px;
          }

          @keyframes rotateRing {
            from { transform: rotateY(0deg); }
            to { transform: rotateY(-360deg); }
          }

          .premium-badge {
            background: linear-gradient(90deg, #a855f7 0%, #6366f1 100%);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 12px;
            box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35);
            animation: pulseGlow 2s infinite ease-in-out;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            z-index: 2;
          }

          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35); }
            50% { box-shadow: 0 4px 25px rgba(168, 85, 247, 0.6); }
          }

          .landing-title {
            font-size: 44px;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 10px;
            text-align: center;
            background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
            z-index: 2;
          }

          .landing-highlight {
            background: linear-gradient(90deg, #a855f7 0%, #00a884 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .landing-subtitle {
            font-size: 15px;
            color: #94a3b8;
            max-width: 560px;
            text-align: center;
            line-height: 1.55;
            margin-bottom: 0;
            z-index: 2;
          }

          .landing-btn-playing {
            background: linear-gradient(135deg, #00a884 0%, #008f6d 100%);
            color: white;
            font-weight: 700;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            border: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 168, 132, 0.3);
          }

          .landing-btn-playing:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 25px rgba(0, 168, 132, 0.45);
          }

          .landing-btn-signup {
            background: rgba(255, 255, 255, 0.05);
            color: white;
            font-weight: 600;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s;
          }

          .landing-btn-signup:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
          }

          .landing-actions {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            justify-content: center;
          }

          .landing-footer {
            font-size: 12px;
            color: rgba(255,255,255,0.28);
            text-align: center;
          }

          /* Landing top section */
          .landing-top {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            z-index: 2;
            width: 100%;
          }

          /* Landing bottom section */
          .landing-bottom {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
            z-index: 2;
            width: 100%;
          }

          /* ---- Responsive: Tablet ---- */
          @media (max-width: 768px) {
            .landing-container {
              padding: 28px 20px 20px !important;
              justify-content: space-between !important;
            }
            .premium-badge {
              font-size: 10px !important;
              padding: 5px 12px !important;
            }
            .landing-title {
              font-size: 28px !important;
              line-height: 1.2 !important;
              padding: 0 12px !important;
            }
            .landing-title br { display: none; }
            .landing-subtitle {
              font-size: 13px !important;
              padding: 0 20px !important;
              line-height: 1.5 !important;
            }
            .landing-top { gap: 10px !important; }
            .landing-bottom { gap: 12px !important; }
            .carousel-3d-stage {
              margin: 0 !important;
              height: 300px !important;
            }
            .landing-btn-playing, .landing-btn-signup {
              padding: 12px 24px !important;
              font-size: 14px !important;
            }
            .landing-footer {
              font-size: 11px !important;
            }
          }

          /* ---- Responsive: Small Mobile ---- */
          @media (max-width: 480px) {
            .landing-container {
              padding: 22px 16px 16px !important;
              justify-content: space-between !important;
            }
            .premium-badge {
              padding: 5px 12px !important;
              font-size: 9.5px !important;
              letter-spacing: 1.5px !important;
            }
            .landing-title {
              font-size: 26px !important;
              font-weight: 900 !important;
              padding: 0 8px !important;
              line-height: 1.2 !important;
            }
            .landing-subtitle {
              font-size: 12px !important;
              padding: 0 16px !important;
              line-height: 1.5 !important;
            }
            .landing-top { gap: 8px !important; }
            .landing-bottom { gap: 10px !important; }
            .carousel-3d-stage {
              margin: 0 !important;
              height: 280px !important;
            }
            .landing-btn-playing, .landing-btn-signup {
              padding: 11px 20px !important;
              font-size: 13px !important;
            }
            .landing-footer {
              font-size: 10px !important;
            }
          }
        ` }} />

        {/* ── TOP SECTION: Badge + Title + Subtitle ── */}
        <div className="landing-top">
          <div className="premium-badge">
            <Sparkles size={13} fill="currentColor" /> Welcome to Rilogram
          </div>
          <h1 className="landing-title">
            The Ultimate Realm of{' '}
            <span className="landing-highlight">Premium Gaming</span>
          </h1>
          <p className="landing-subtitle">
            Jump into the most thrilling community platform. Play your favorite games, unlock official rewards, and connect with live support managers 24/7.
          </p>
        </div>

        {/* ── MIDDLE SECTION: 3D Carousel (flex:1 centers it) ── */}
        <div
          ref={stageRef}
          className="carousel-3d-stage"
          style={{ flex: '1', maxHeight: '400px' }}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
        >
          <div ref={ringRef} className="carousel-3d-ring">
            {(gamesList && gamesList.length > 0 ? gamesList : [
              { name: 'Fire Kirin', image: '/games/fire_kirin.png' },
              { name: 'Orion Stars', image: '/games/orion_stars.png' },
              { name: 'Ultra Panda', image: '/games/ultra_panda.png' },
              { name: 'eSports Arena', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop' },
              { name: 'Cyber Realm', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=600&auto=format&fit=crop' },
              { name: 'Neon Arcade', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop' },
            ]).map((game, idx, arr) => {
              const count = arr.length;
              const angle = (360 / count) * idx;
              const cardWidth = 190;
              const translateZ = Math.round((cardWidth / 2) / Math.tan(Math.PI / count)) + 60;
              return (
                <div
                  key={game._id || idx}
                  className="carousel-3d-card"
                  style={{
                    '--card-angle': `${angle}deg`,
                    '--card-z': `${translateZ}px`,
                  } as React.CSSProperties}
                  onClick={() => handleChatAccess()}
                >
                  <img
                    src={game.image}
                    alt={game.name}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';
                    }}
                  />
                  <span className="carousel-3d-card-title">{game.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BOTTOM SECTION: Buttons + Copyright ── */}
        <div className="landing-bottom">
          <div className="landing-actions" style={{ zIndex: 10 }}>
            <button
              type="button"
              className="landing-btn-playing"
              onClick={() => router.push('/login?tab=register')}
            >
              <Gamepad2 size={18} /> Sign Up to Play
            </button>
            <button
              type="button"
              className="landing-btn-signup"
              onClick={() => router.push('/login')}
            >
              Login
            </button>
          </div>
          <div className="landing-footer" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src="/assets/logo/RJN.png" 
                alt="RJN Logo" 
                style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
                Created by RJN
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
              © 2026 Rilogram. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      {/* Header Navbar */}
      <header className="lobby-navbar">
        <div className="lobby-logo" onClick={() => router.push('/')}>
          <img
            src="/rilogram_logo.png"
            alt="Rilogram Logo"
            style={{ width: '72px', height: '48px', borderRadius: '8px', objectFit: 'contain', marginRight: '10px' }}
          />
          <div>
            <span className="lobby-logo-text" style={{ letterSpacing: '2px', fontWeight: 800 }}>RILOGRAM</span>
            <div className="lobby-logo-sub">Community Hub</div>
          </div>
        </div>

        <nav className="lobby-nav-actions">
          {verifyingAuth ? (
            <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          ) : authenticated ? (
            <>
              {isAdmin && (
                <button onClick={() => router.push('/admin')} className="lobby-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Control Room">
                  <Shield size={15} />
                  <span className="lobby-btn-label">Control Room</span>
                </button>
              )}

              <button
                onClick={() => router.push('/notices')}
                className="lobby-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}
                title="Notices Board"
              >
                <Bell size={15} />
                <span className="lobby-btn-label">Notices</span>
                {notices.filter(n => !n.isRead).length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-4px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 800,
                      borderRadius: '10px',
                      padding: '1px 5px',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                    }}
                  >
                    {notices.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              <button onClick={handleChatAccess} className="lobby-btn-chat">
                <MessageSquare size={15} fill="white" />
                <span className="lobby-btn-label">Support Chat</span>
              </button>

              <button
                onClick={() => router.push('/profile')}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 12px rgba(168, 85, 247, 0.15)',
                  marginLeft: '8px',
                }}
                title="My Profile"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.8)';
                  e.currentTarget.style.boxShadow = '0 0 18px rgba(168, 85, 247, 0.35)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(168, 85, 247, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {getInitials(user.name)}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleChatAccess} className="lobby-btn-chat" style={{ backgroundColor: 'rgba(0, 168, 132, 0.15)', color: '#00a884', border: '1px solid rgba(0, 168, 132, 0.25)' }}>
                <MessageSquare size={15} /> Support Chat
              </button>
              <button onClick={() => router.push('/login')} className="lobby-btn-primary">
                <LogIn size={15} /> Sign In
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <div className="lobby-container">



        {/* Hero Section */}
        <section className="lobby-hero" style={{ marginBottom: '32px' }}>
          <h2>Rilogram <span style={{ color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}>Community Portal</span></h2>
          <p>
            Connect directly with our community managers, view official announcements, and request real-time support whenever needed.
          </p>
        </section>

        {/* Google AdSense Banner — only shown when content is loaded */}
        {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID && !loadingPosts && posts.length > 0 && (
          <AdSenseBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID} />
        )}

        <div className="lobby-content-layout">
          {/* Left Vertical Ad Sidebar — only shown when content is loaded */}
          {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID && !loadingPosts && posts.length > 0 && (
            <div
              className={`desktop-ad-sidebar left ${leftAdStatus !== 'filled' ? 'ad-hidden' : ''}`}
            >
              <div className="desktop-ad-sidebar-title">Partner Ad</div>
              <AdSenseBanner
                adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID}
                adFormat="vertical"
                style={{ display: 'block', width: '136px', height: '600px' }}
                onStatusChange={(status) => setLeftAdStatus(status)}
              />
            </div>
          )}

          <div className="feed-container">
            {/* Post Creator (Admins only) */}
            {authenticated && isAdmin && (
              user?.isFrozen ? (
                <div className="post-creator-card" style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(0, 0, 0, 0.2) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '30px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  borderRadius: '16px',
                  marginBottom: '24px',
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
                  }}>
                    <Shield size={28} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                      Administrative Actions Suspended
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '440px', lineHeight: '1.6' }}>
                      Your administrator account has been automatically frozen due to outstanding payments. Announcement creation and other system operations are temporarily locked.
                    </p>
                  </div>
                  <button
                    onClick={handleChatAccess}
                    className="lobby-btn-chat"
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                      width: 'auto',
                      margin: '0 auto'
                    }}
                  >
                    <MessageSquare size={16} fill="white" />
                    Chat with Super Admin
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreatePost} className="post-creator-card">
                  <div className="post-creator-header">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="post-avatar"
                      />
                    ) : (
                      <div className="post-avatar" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, var(--accent-color), #007c62)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}>
                        {getInitials(user.name)}
                      </div>
                    )}
                    <span className="post-creator-title">Create Official Announcement</span>
                  </div>

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What announcements do you want to share with the community today?"
                    className="post-textarea"
                  />

                  {imagePreview && (
                    <div className="post-creator-preview">
                      <img src={imagePreview} alt="Attached Preview" />
                      <button
                        type="button"
                        onClick={handleRemoveAttachedImage}
                        className="post-creator-preview-remove"
                        title="Remove Image"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="post-creator-actions">
                    <label className="post-attach-btn">
                      <ImageIcon size={18} />
                      <span>Attach Photo</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={submitting || (!content.trim() && !file)}
                      className="post-create-btn"
                    >
                      {submitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              )
            )}

            {/* Posts Feed */}
            {loadingPosts ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px' }}>
                <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={40} />
                <p style={{ fontSize: '13px', color: '#8fa0b5' }}>Loading official feed...</p>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'rgba(18, 31, 69, 0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '480px', margin: '0 auto' }}>
                <ImageIcon size={48} style={{ color: '#8fa0b5', marginBottom: '16px', opacity: 0.5, margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>No Announcements</h3>
                <p style={{ fontSize: '13px', color: '#8fa0b5' }}>
                  {authenticated
                    ? 'There are no active posts from your linked administrators at this time.'
                    : 'Please sign in to link with an administrator and view the feed.'}
                </p>
              </div>
            ) : (
              posts.map((post, index) => {
                const hasLiked = user && post.likes.includes(user.id || user._id);
                const isMyPost = user && (post.adminId?._id === (user.id || user._id));

                const isEditing = editingPostId === post._id;

                return (
                  <Fragment key={post._id}>
                    <div className="post-card">
                      {isEditing ? (
                        <>
                          {/* Post Header (Editing) */}
                          <div className="post-header">
                            <div className="post-author-info">
                              {post.adminId.avatar ? (
                                <img
                                  src={post.adminId.avatar}
                                  alt={post.adminId.name}
                                  className="post-avatar"
                                />
                              ) : (
                                <div className="post-avatar" style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'linear-gradient(135deg, var(--accent-color), #007c62)',
                                  color: 'white',
                                  fontWeight: 600,
                                  fontSize: '14px'
                                }}>
                                  {getInitials(post.adminId.name)}
                                </div>
                              )}
                              <div className="post-author-details">
                                <span className="post-author-name">{post.adminId.name}</span>
                                <span className="post-time">{formatPostTime(post.createdAt)} (Editing)</span>
                              </div>
                            </div>
                          </div>

                          {/* Edit Form */}
                          <form onSubmit={handleEditPost} className="post-creator-card" style={{ background: 'none', border: 'none', padding: 0, margin: '12px 0 0 0' }}>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              placeholder="Update announcement..."
                              className="post-textarea"
                              style={{ minHeight: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}
                              required
                            />

                            {editImagePreview && (
                              <div className="post-creator-preview" style={{ marginTop: '10px' }}>
                                <img src={editImagePreview} alt="Edit Attachment" />
                                <button
                                  type="button"
                                  onClick={handleRemoveEditImage}
                                  className="post-creator-preview-remove"
                                  title="Remove Image"
                                >
                                  ×
                                </button>
                              </div>
                            )}

                            <div className="post-creator-actions" style={{ padding: '8px 0 0 0', borderTop: 'none' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <label className="post-attach-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                  <ImageIcon size={16} />
                                  <span>Change Photo</span>
                                  <input
                                    type="file"
                                    ref={editFileInputRef}
                                    accept="image/*"
                                    onChange={handleEditFileChange}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setEditingPostId(null)}
                                  className="lobby-btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', margin: 0 }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={editSubmitting || (!editContent.trim() && !editImagePreview)}
                                  className="post-create-btn"
                                  style={{ padding: '6px 16px', fontSize: '12px', height: 'auto' }}
                                >
                                  {editSubmitting ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          </form>
                        </>
                      ) : (
                        <>
                          {/* Post Header */}
                          <div className="post-header">
                            <div className="post-author-info" onClick={() => handleViewAdminProfile(post.adminId?._id, post.adminId)} style={{ cursor: 'pointer' }} title="View Profile">
                              {post.adminId.avatar ? (
                                <img
                                  src={post.adminId.avatar}
                                  alt={post.adminId.name}
                                  className="post-avatar"
                                />
                              ) : (
                                <div className="post-avatar" style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'linear-gradient(135deg, var(--accent-color), #007c62)',
                                  color: 'white',
                                  fontWeight: 600,
                                  fontSize: '14px'
                                }}>
                                  {getInitials(post.adminId.name)}
                                </div>
                              )}
                              <div className="post-author-details">
                                <span className="post-author-name">{post.adminId.name}</span>
                                <span className="post-time">{formatPostTime(post.createdAt)}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {(isMyPost || (user && user.role === 'super_admin')) && (
                                <>
                                  <button
                                    onClick={() => startEditPost(post)}
                                    className="post-edit-btn"
                                    style={{ background: 'none', border: 'none', color: '#8fa0b5', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                    title="Edit Announcement"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePost(post._id)}
                                    className="post-delete-btn"
                                    title="Delete Announcement"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Post Content */}
                          {post.content && (
                            <div className="post-content">{post.content}</div>
                          )}

                          {/* Post Image */}
                          {post.image && (
                            <div className="post-image-container">
                              <img
                                src={post.image}
                                alt="Announcement Media"
                                className="post-image"
                                onClick={() => setLightboxImage(post.image!)}
                                style={{ cursor: 'pointer' }}
                                title="Click to view full screen"
                              />
                            </div>
                          )}

                          {/* Post Actions (Likes) */}
                          <div className="post-actions">
                            <button
                              onClick={() => handleLikePost(post._id)}
                              className={`post-like-btn ${hasLiked ? 'liked' : ''}`}
                            >
                              <Heart size={18} fill={hasLiked ? '#ff4b6b' : 'none'} />
                              <span>{post.likes.length} {post.likes.length === 1 ? 'Like' : 'Likes'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Inline sponsored ad block */}
                    {(index + 1) % 3 === 0 && (
                      <SponsoredPostCard />
                    )}
                  </Fragment>
                );
              })
            )}
          </div>

          {/* Right Vertical Ad Sidebar — only shown when content is loaded */}
          {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID && !loadingPosts && posts.length > 0 && (
            <div
              className={`desktop-ad-sidebar right ${rightAdStatus !== 'filled' ? 'ad-hidden' : ''}`}
            >
              <div className="desktop-ad-sidebar-title">Partner Ad</div>
              <AdSenseBanner
                adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID}
                adFormat="vertical"
                style={{ display: 'block', width: '136px', height: '600px' }}
                onStatusChange={(status) => setRightAdStatus(status)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Support FAB */}
      <div className="lobby-chat-widget">
        <button onClick={handleChatAccess} className="lobby-chat-fab" title="Connect with support">
          <MessageSquare size={26} fill="white" />
        </button>
      </div>

      {/* Sticky Bottom Bar for Guest Players */}
      {!authenticated && !verifyingAuth && (
        <div className="lobby-announcement-bar">
          <span style={{ fontSize: '13px', color: '#8fa0b5' }}>
            Have questions or issues? Talk to our managers.
          </span>
          <button
            onClick={handleChatAccess}
            className="lobby-btn-primary"
            style={{ padding: '8px 18px', fontSize: '12px', width: 'auto' }}
          >
            Sign In to Live Support <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Fullscreen Admin Profile Modal */}
      {viewingAdmin && (
        <div className="lightbox-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(11, 20, 26, 0.98)',
          zIndex: 99998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 20px',
          overflowY: 'auto'
        }} onClick={() => setViewingAdmin(null)}>
          <div style={{
            maxWidth: '640px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setViewingAdmin(null)}
              style={{
                position: 'absolute',
                top: '-10px',
                right: '0px',
                color: 'white',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <X size={20} />
            </button>

            {/* Profile Info Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #a855f7',
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: viewingAdmin.avatar ? 'none' : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                color: 'white',
                fontSize: '36px',
                fontWeight: 700
              }}>
                {viewingAdmin.avatar ? (
                  <img
                    src={viewingAdmin.avatar}
                    alt={viewingAdmin.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(viewingAdmin.name)
                )}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', margin: 0 }}>{viewingAdmin.name}</h2>
              <span style={{ fontSize: '14px', color: '#a855f7', fontWeight: 600 }}>@{viewingAdmin.username || 'admin'}</span>
              <span style={{ fontSize: '11px', color: '#8fa0b5', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(168, 85, 247, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                {viewingAdmin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />

            {/* Feed Section Title */}
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', alignSelf: 'flex-start', margin: '0 0 8px 0' }}>Announcements by {viewingAdmin.name}</h3>

            {/* Scrollable list of posts */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loadingAdminPosts ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                  <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={32} />
                  <p style={{ fontSize: '13px', color: '#8fa0b5' }}>Loading admin feed...</p>
                </div>
              ) : adminPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <p style={{ color: '#8fa0b5', fontSize: '14px', margin: 0 }}>No announcements published yet by this admin.</p>
                </div>
              ) : (
                adminPosts.map((post) => {
                  const hasLiked = user && post.likes.includes(user.id || user._id);
                  const isMyPost = user && (post.adminId?._id === (user.id || user._id));
                  const isEditing = editingPostId === post._id;

                  return (
                    <div key={post._id} className="post-card" style={{ width: '100%' }}>
                      {isEditing ? (
                        <form onSubmit={handleEditPost} className="post-creator-card" style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Update announcement..."
                            className="post-textarea"
                            style={{ minHeight: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}
                            required
                          />

                          {editImagePreview && (
                            <div className="post-creator-preview" style={{ marginTop: '10px' }}>
                              <img src={editImagePreview} alt="Edit Attachment" />
                              <button
                                type="button"
                                onClick={handleRemoveEditImage}
                                className="post-creator-preview-remove"
                                title="Remove Image"
                              >
                                ×
                              </button>
                            </div>
                          )}

                          <div className="post-creator-actions" style={{ padding: '8px 0 0 0', borderTop: 'none' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <label className="post-attach-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                <ImageIcon size={16} />
                                <span>Change Photo</span>
                                <input
                                  type="file"
                                  ref={editFileInputRef}
                                  accept="image/*"
                                  onChange={handleEditFileChange}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setEditingPostId(null)}
                                className="lobby-btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', margin: 0 }}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={editSubmitting || (!editContent.trim() && !editImagePreview)}
                                className="post-create-btn"
                                style={{ padding: '6px 16px', fontSize: '12px', height: 'auto' }}
                              >
                                {editSubmitting ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="post-header">
                            <div className="post-author-info">
                              {viewingAdmin.avatar ? (
                                <img
                                  src={viewingAdmin.avatar}
                                  alt={viewingAdmin.name}
                                  className="post-avatar"
                                />
                              ) : (
                                <div className="post-avatar" style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'linear-gradient(135deg, var(--accent-color), #007c62)',
                                  color: 'white',
                                  fontWeight: 600,
                                  fontSize: '14px'
                                }}>
                                  {getInitials(viewingAdmin.name)}
                                </div>
                              )}
                              <div className="post-author-details">
                                <span className="post-author-name">{viewingAdmin.name}</span>
                                <span className="post-time">{formatPostTime(post.createdAt)}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {(isMyPost || (user && user.role === 'super_admin')) && (
                                <>
                                  <button
                                    onClick={() => startEditPost(post)}
                                    className="post-edit-btn"
                                    style={{ background: 'none', border: 'none', color: '#8fa0b5', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                    title="Edit Announcement"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePost(post._id)}
                                    className="post-delete-btn"
                                    title="Delete Announcement"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {post.content && (
                            <div className="post-content">{post.content}</div>
                          )}

                          {post.image && (
                            <div className="post-image-container">
                              <img
                                src={post.image}
                                alt="Announcement Media"
                                className="post-image"
                                onClick={() => setLightboxImage(post.image!)}
                                style={{ cursor: 'pointer' }}
                                title="Click to view full screen"
                              />
                            </div>
                          )}

                          <div className="post-actions">
                            <button
                              onClick={() => handleLikePost(post._id)}
                              className={`post-like-btn ${hasLiked ? 'liked' : ''}`}
                            >
                              <Heart size={18} fill={hasLiked ? '#ff4b6b' : 'none'} />
                              <span>{post.likes.length} {post.likes.length === 1 ? 'Like' : 'Likes'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-title">Image View</span>
            <div className="lightbox-actions">
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
              alt="Fullscreen Preview"
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
    </div>
  );
}
