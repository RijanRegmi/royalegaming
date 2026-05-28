'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogOut, LogIn, Shield, ArrowRight, Loader2, User as UserIcon, Heart, Trash2, Image as ImageIcon, ThumbsUp } from 'lucide-react';
import AdSenseBanner from '@/components/AdSenseBanner';

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
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [verifyingAuth, setVerifyingAuth] = useState<boolean>(true);

  // Post Creator State
  const [content, setContent] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    fetchPosts();
    checkAuth();

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
        alert(data.error || 'Failed to create post');
      }
    } catch (err) {
      console.error('Create post error:', err);
      alert('Error creating post. Please try again.');
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
              const currentUserId = user._id;
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

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/posts?postId=${postId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
      } else {
        alert(data.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
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

  return (
    <div className="lobby-page">
      {/* Header Navbar */}
      <header className="lobby-navbar">
        <div className="lobby-logo" onClick={() => router.push('/')}>
          <img 
            src="/royale_logo.jpg" 
            alt="Royale Logo" 
            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', marginRight: '10px' }}
          />
          <div>
            <span className="lobby-logo-text">Royale Hub</span>
            <div className="lobby-logo-sub">Community Feed</div>
          </div>
        </div>

        <nav className="lobby-nav-actions">
          {verifyingAuth ? (
            <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          ) : authenticated ? (
            <>
              {/* User badge */}
              <div className="lobby-user-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{user.name}</span>
                <span style={{ fontSize: '10px', color: '#a855f7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
              
              {isAdmin && (
                <button onClick={() => router.push('/admin')} className="lobby-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Control Room">
                  <Shield size={15} />
                  <span className="lobby-btn-label">Control Room</span>
                </button>
              )}

              <button onClick={() => router.push('/profile')} className="lobby-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="My Profile">
                <UserIcon size={15} />
                <span className="lobby-btn-label">Profile</span>
              </button>

              <button onClick={handleChatAccess} className="lobby-btn-chat">
                <MessageSquare size={15} fill="white" />
                <span className="lobby-btn-label">Support Chat</span>
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
          <h2>Royale <span style={{ color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}>Community Portal</span></h2>
          <p>
            Connect directly with our community managers, view official announcements, and request real-time support whenever needed.
          </p>
        </section>

        {/* Google AdSense Banner */}
        {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID && (
          <AdSenseBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID} />
        )}

        <div className="feed-container">
          {/* Post Creator (Admins only) */}
          {authenticated && isAdmin && (
            <form onSubmit={handleCreatePost} className="post-creator-card">
              <div className="post-creator-header">
                <img 
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                  alt={user.name} 
                  className="post-avatar"
                />
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
            posts.map((post) => {
              const hasLiked = user && post.likes.includes(user._id);
              const isMyPost = user && post.adminId._id === user._id;

              return (
                <div key={post._id} className="post-card">
                  {/* Post Header */}
                  <div className="post-header">
                    <div className="post-author-info">
                      <img 
                        src={post.adminId.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                        alt={post.adminId.name} 
                        className="post-avatar"
                      />
                      <div className="post-author-details">
                        <span className="post-author-name">{post.adminId.name}</span>
                        <span className="post-time">{formatPostTime(post.createdAt)}</span>
                      </div>
                    </div>

                    {(isMyPost || (user && user.role === 'super_admin')) && (
                      <button 
                        onClick={() => handleDeletePost(post._id)}
                        className="post-delete-btn"
                        title="Delete Announcement"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <div className="post-content">{post.content}</div>
                  )}

                  {/* Post Image */}
                  {post.image && (
                    <div className="post-image-container">
                      <img src={post.image} alt="Announcement Media" className="post-image" />
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
                </div>
              );
            })
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
    </div>
  );
}
