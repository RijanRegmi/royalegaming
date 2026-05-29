'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Shield, ShieldAlert, ArrowLeft, Loader2, Heart, X } from 'lucide-react';
import styles from '../profile.module.css';
import AdSenseBanner from '@/components/AdSenseBanner';

interface AdminInfo {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

interface CurrentUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  linkedAdmins: Array<{ _id: string; id?: string; name: string; username: string; avatar?: string }>;
}

export default function AdminProfilePublicPage() {
  const router = useRouter();
  const params = useParams();
  const adminSlug = params.adminSlug as string;

  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean>(false);

  // Posts states
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (!adminSlug) return;

    const checkAccessAndLoad = async () => {
      try {
        // 1. Fetch current logged-in user
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        
        if (!authRes.ok || !authData.authenticated) {
          // Redirect to login with dynamic redirection back to here
          router.push(`/login?redirect=/profile/${adminSlug}`);
          return;
        }
        
        const activeUser: CurrentUser = authData.user;
        setCurrentUser(activeUser);

        // 2. Fetch admin details
        const adminRes = await fetch(`/api/auth/link-admin?slug=${adminSlug}`);
        const adminData = await adminRes.json();
        
        if (!adminRes.ok || !adminData.success) {
          setError(adminData.error || 'Administrator not found.');
          setLoading(false);
          return;
        }

        const adminInfo: AdminInfo = adminData.admin;
        setAdmin(adminInfo);

        // 3. Security Check: Only allow if isMe, isStaff, or isLinked
        const isMe = activeUser._id === adminInfo.id;
        const isStaff = activeUser.role === 'admin' || activeUser.role === 'super_admin';
        const isLinked = activeUser.linkedAdmins?.some((la) => la._id === adminInfo.id || la.id === adminInfo.id);

        if (isMe || isStaff || isLinked) {
          setAuthorized(true);
          // Load admin announcements
          setLoadingPosts(true);
          const postsRes = await fetch(`/api/posts?adminId=${adminInfo.id}`);
          const postsData = await postsRes.json();
          if (postsRes.ok && postsData.success) {
            setPosts(postsData.posts || []);
          }
          setLoadingPosts(false);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error('Error loading secure profile page:', err);
        setError('A connection error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoad();

    // Allow document scrolling for profile page
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [adminSlug, router]);

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;
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
              return { ...post, likes: data.likes };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error('Error liking post:', err);
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

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="fullscreen-loader" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--accent-color)' }} size={40} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Verifying security credentials...</p>
      </div>
    );
  }

  // Error view (e.g. Admin not found)
  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: 'var(--error-color)' }}>
            <ShieldAlert size={48} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Profile Error</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>{error}</p>
          <button 
            onClick={() => router.push('/')} 
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: 'auto', margin: '0 auto', padding: '10px 24px' }}
          >
            <ArrowLeft size={16} /> Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Security Denied View
  if (!authorized) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '520px', margin: '80px auto', textAlign: 'center', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '40px 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: '#ffb020' }}>
            <div style={{ background: 'rgba(255, 176, 32, 0.1)', padding: '16px', borderRadius: '50%' }}>
              <ShieldAlert size={48} />
            </div>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '14px' }}>Access Restricted</h2>
          <p style={{ color: '#8fa0b5', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '28px' }}>
            You are not connected/linked to this administrator. Only users who have joined this community via this admin&apos;s referral link are authorized to view their profile and announcement feed.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => router.push('/')} 
              className="lobby-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '10px 20px', width: 'auto' }}
            >
              <ArrowLeft size={16} /> Go to Lobby
            </button>
            <button 
              onClick={() => router.push('/chat')} 
              className="lobby-btn-chat"
              style={{ fontSize: '13px', padding: '10px 20px', width: 'auto' }}
            >
              Go to Support Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized Admin Profile view
  return (
    <div className="auth-page" style={{ overflowY: 'auto' }}>
      <div className="lobby-content-layout" style={{ maxWidth: '1400px', margin: '40px auto', width: '100%' }}>
        {/* Left Vertical Ad Sidebar */}
        <div className="desktop-ad-sidebar left" style={{ marginTop: '0' }}>
          <div className="desktop-ad-sidebar-title">Partner Ad</div>
          {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID ? (
            <AdSenseBanner 
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID} 
              adFormat="vertical" 
              style={{ display: 'block', width: '136px', height: '600px' }} 
            />
          ) : (
            <div style={{
              height: '400px',
              background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.05), transparent)',
              borderRadius: '8px',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px'
            }}>
              <span style={{ fontSize: '11px', color: '#8fa0b5' }}>Vertical Ad Slot</span>
            </div>
          )}
        </div>

        <div className="auth-card" style={{ maxWidth: '900px', width: '100%', margin: '0' }}>
        
        {/* Header Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/')}
            className="icon-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', width: 'auto', padding: '6px 12px', borderRadius: '8px' }}
          >
            <ArrowLeft size={16} /> Lobby
          </button>

          <button
            onClick={() => router.push('/chat')}
            className="lobby-btn-chat"
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', width: 'auto' }}
          >
            Support Chat
          </button>
        </div>

        {/* Profile Info Header */}
        {admin && (
          <div className={styles.avatarContainer}>
            <div 
              className={styles.avatarWrapper} 
              onClick={() => setLightboxImage(admin.avatar)}
              title="Click to view full screen"
            >
              {admin.avatar ? (
                <img src={admin.avatar} alt={admin.name} className={styles.avatarImage} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {getInitials(admin.name)}
                  </span>
                </div>
              )}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>{admin.name}</h1>
            <p style={{ color: 'var(--accent-color)', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>@{admin.username || 'admin'}</p>
            <span style={{ 
              fontSize: '11px', 
              color: '#8fa0b5', 
              textTransform: 'uppercase', 
              letterSpacing: '1px', 
              background: 'rgba(168, 85, 247, 0.1)', 
              padding: '4px 10px', 
              borderRadius: '12px',
              marginTop: '8px',
              display: 'inline-block'
            }}>
              Support Administrator
            </span>
          </div>
        )}

        <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '16px 0' }} />

        {/* Announcements List */}
        {admin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', margin: 0 }}>Announcements by {admin.name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loadingPosts ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                  <Loader2 className="animate-spin" style={{ color: 'var(--accent-color)' }} size={32} />
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading feed...</p>
                </div>
              ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No announcements published yet by this admin.</p>
                </div>
              ) : (
                posts.map((post, index) => {
                  const hasLiked = currentUser && post.likes.includes(currentUser._id);

                  return (
                    <Fragment key={post._id}>
                      <div className="post-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                      <div className="post-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        {admin.avatar ? (
                          <img 
                            src={admin.avatar} 
                            alt={admin.name} 
                            className="post-avatar"
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="post-avatar" style={{ 
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            background: 'linear-gradient(135deg, var(--accent-color), #007c62)', 
                            color: 'white', 
                            fontWeight: 600, 
                            fontSize: '13px' 
                          }}>
                            {getInitials(admin.name)}
                          </div>
                        )}
                        <div className="post-author-details" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="post-author-name" style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{admin.name}</span>
                          <span className="post-time" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{formatPostTime(post.createdAt)}</span>
                        </div>
                      </div>

                      {post.content && (
                        <div className="post-content" style={{ color: '#e2e8f0', fontSize: '14.5px', lineHeight: '1.5', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{post.content}</div>
                      )}

                      {post.image && (
                        <div className="post-image-container" style={{ overflow: 'hidden', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' }} onClick={() => setLightboxImage(post.image)}>
                          <img 
                            src={post.image} 
                            alt="Announcement Media" 
                            className="post-image" 
                            style={{ width: '100%', maxHeight: '320px', objectFit: 'cover' }}
                            title="Click to view full screen"
                          />
                        </div>
                      )}

                      <div className="post-actions" style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                        <button 
                          onClick={() => handleLikePost(post._id)}
                          className={`post-action-btn like-btn ${hasLiked ? 'liked' : ''}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: hasLiked ? '#ff4b6b' : 'var(--text-secondary)', fontSize: '13px' }}
                        >
                          <Heart size={16} fill={hasLiked ? 'currentColor' : 'none'} />
                          <span>{post.likes.length} {post.likes.length === 1 ? 'Like' : 'Likes'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline sponsored ad block */}
                    {(index + 1) % 3 === 0 && (
                      <div className="sponsored-post-card" style={{ marginTop: '20px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)' }}>
                        <div className="sponsored-badge">Sponsored Announcement</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#ffffff',
                            fontSize: '14px'
                          }}>
                            RG
                          </div>
                          <div>
                            <h4 style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', margin: 0 }}>Royale Gaming Premium Events</h4>
                            <span style={{ color: '#8fa0b5', fontSize: '11px' }}>Sponsored Partner</span>
                          </div>
                        </div>
                        <p style={{ color: '#e9edef', fontSize: '14px', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                          Join the next big tournament! Compete with players worldwide and win big prizes. High speed servers, verified anti-cheat, and massive prize pools await.
                        </p>
                        {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID ? (
                          <AdSenseBanner 
                            adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID} 
                            adFormat="fluid" 
                            style={{ display: 'block' }} 
                          />
                        ) : (
                          <div style={{ 
                            height: '180px', 
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(99, 102, 241, 0.05))',
                            borderRadius: '8px',
                            border: '1px dashed rgba(168, 85, 247, 0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}>
                            <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: 600 }}>Google AdSense Spot</span>
                            <span style={{ fontSize: '11px', color: '#8fa0b5' }}>Setup NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID to load live ads</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>

    {/* Right Vertical Ad Sidebar */}
    <div className="desktop-ad-sidebar right" style={{ marginTop: '0' }}>
      <div className="desktop-ad-sidebar-title">Partner Ad</div>
      {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID ? (
        <AdSenseBanner 
          adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID} 
          adFormat="vertical" 
          style={{ display: 'block', width: '136px', height: '600px' }} 
        />
      ) : (
        <div style={{
          height: '400px',
          background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.05), transparent)',
          borderRadius: '8px',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}>
          <span style={{ fontSize: '11px', color: '#8fa0b5' }}>Vertical Ad Slot</span>
        </div>
      )}
    </div>
  </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="lightbox-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }} 
          onClick={() => setLightboxImage(null)}
        >
          <button 
            onClick={() => setLightboxImage(null)} 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: 'white',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              cursor: 'pointer',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Fullscreen preview" 
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }} 
          />
        </div>
      )}
    </div>
  );
}
