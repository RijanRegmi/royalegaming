'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Shield, ArrowLeft, Loader2, Check, CheckCheck, MessageSquare, LogIn, LogOut, User as UserIcon } from 'lucide-react';

interface NoticeItem {
  _id: string;
  title: string;
  content: string;
  type: 'system' | 'global' | 'admin_warning' | 'super_admin_broadcast';
  targetRole?: string;
  isRead: boolean;
  createdAt: string;
  createdBy?: {
    name: string;
    avatar?: string;
    role: string;
  };
}

export default function NoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [verifyingAuth, setVerifyingAuth] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setUser(data.user);
        setAuthenticated(true);
        return data.user;
      } else {
        router.push('/login?redirect=/notices');
      }
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login?redirect=/notices');
    } finally {
      setVerifyingAuth(false);
    }
    return null;
  };

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notices');
      const data = await res.json();
      if (res.ok && data.success) {
        setNotices(data.notices || []);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth().then((loggedInUser) => {
      if (loggedInUser) {
        fetchNotices();
      }
    });
  }, []);

  const handleMarkAsRead = async (noticeId: string) => {
    try {
      // Optimistic update
      setNotices((prev) =>
        prev.map((n) => (n._id === noticeId ? { ...n, isRead: true } : n))
      );

      const res = await fetch('/api/notices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noticeId, action: 'read' }),
      });

      if (!res.ok) {
        // Rollback on failure
        setNotices((prev) =>
          prev.map((n) => (n._id === noticeId ? { ...n, isRead: false } : n))
        );
      }
    } catch (err) {
      console.error('Error marking notice as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotices = notices.filter((n) => !n.isRead);
    if (unreadNotices.length === 0) return;

    setMarkingAll(true);
    try {
      // Optimistically update UI
      setNotices((prev) => prev.map((n) => ({ ...n, isRead: true })));

      const promises = unreadNotices.map((n) =>
        fetch('/api/notices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noticeId: n._id, action: 'read' }),
        })
      );

      await Promise.allSettled(promises);
    } catch (err) {
      console.error('Error marking all as read:', err);
      // Re-fetch to ensure sync with DB
      fetchNotices();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return '';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const filteredNotices = notices.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notices.filter((n) => !n.isRead).length;

  if (verifyingAuth) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', background: '#090d16' }}>
        <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={40} />
        <p style={{ fontSize: '14px', color: '#8fa0b5' }}>Verifying your credentials...</p>
      </div>
    );
  }

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #131a35 0%, #090d16 100%)', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header className="lobby-navbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="lobby-logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img 
            src="/rilogram_logo.png" 
            alt="Rilogram Logo" 
            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', marginRight: '10px' }}
          />
          <div>
            <span className="lobby-logo-text">Rilogram</span>
            <div className="lobby-logo-sub">Notices Board</div>
          </div>
        </div>

        <nav className="lobby-nav-actions">
          {authenticated && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{user.name}</span>
                <span style={{ fontSize: '10px', color: '#a855f7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
              
              {isAdmin && (
                <button onClick={() => router.push('/admin')} className="lobby-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={15} />
                  <span>Control Room</span>
                </button>
              )}

              <button onClick={() => router.push('/profile')} className="lobby-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserIcon size={15} />
                <span>Profile</span>
              </button>

              <button onClick={() => router.push('/chat')} className="lobby-btn-chat">
                <MessageSquare size={15} fill="white" />
                <span>Support Chat</span>
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* Back navigation */}
        <button 
          onClick={() => router.push('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 16px',
            borderRadius: '10px',
            color: '#a3b3c9',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '32px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = '#a3b3c9';
          }}
        >
          <ArrowLeft size={16} />
          Back to Feed
        </button>

        {/* Title and Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px 0', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Notifications & Notices
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              Stay updated with system broadcasts, announcements, and administrative logs.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#d8b4fe',
                fontSize: '13px',
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid rgba(168, 85, 247, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid rgba(168, 85, 247, 0.3)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <CheckCheck size={16} />
              {markingAll ? 'Updating...' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '12px', marginBottom: '24px', maxWidth: '280px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              flex: 1,
              background: filter === 'all' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              color: filter === 'all' ? '#ffffff' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            All Notices
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{
              flex: 1,
              background: filter === 'unread' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              color: filter === 'unread' ? '#ffffff' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            Unread
            {unreadCount > 0 && (
              <span style={{ fontSize: '10px', background: '#ef4444', color: '#ffffff', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notices Feed */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '16px' }}>
            <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={40} />
            <p style={{ fontSize: '13px', color: '#8fa0b5' }}>Fetching official notices...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: 'rgba(18, 31, 69, 0.25)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
            <Bell size={48} style={{ color: '#64748b', marginBottom: '20px', opacity: 0.4, margin: '0 auto 20px auto' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>All caught up!</h3>
            <p style={{ fontSize: '13.5px', color: '#8fa0b5', maxWidth: '340px', margin: '0 auto', lineHeight: '1.6' }}>
              {filter === 'unread' 
                ? 'You have read all notices! Toggle filters to view past announcements.' 
                : 'No notices or broadcasts are currently active in the system.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredNotices.map((notice) => {
              const isWarning = notice.type === 'admin_warning' || notice.type === 'system';
              
              // Harmonic gradients based on type
              const bgGradient = isWarning 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)' 
                : 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)';
              const borderColor = isWarning 
                ? 'rgba(239, 68, 68, 0.15)' 
                : 'rgba(168, 85, 247, 0.15)';
              const typeColor = isWarning ? '#ef4444' : '#a855f7';
              const typeText = notice.type.replace('_', ' ').toUpperCase();

              return (
                <div
                  key={notice._id}
                  style={{
                    background: bgGradient,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '16px',
                    padding: '24px',
                    position: 'relative',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
                    opacity: notice.isRead ? 0.7 : 1,
                  }}
                >
                  {/* Unread Ring indicator */}
                  {!notice.isRead && (
                    <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
                      <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NEW</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: isWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: typeColor,
                    }}>
                      <Shield size={20} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', color: typeColor, background: `${typeColor}1a`, border: `1px solid ${typeColor}33`, padding: '2px 8px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.5px' }}>
                          {typeText}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {new Date(notice.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                        {notice.title}
                      </h3>

                      <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {notice.content}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '16px' }}>
                        {notice.createdBy && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {notice.createdBy.avatar ? (
                              <img 
                                src={notice.createdBy.avatar} 
                                alt={notice.createdBy.name} 
                                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                background: 'linear-gradient(135deg, #a855f7, #007c62)', 
                                color: 'white', 
                                fontWeight: 700, 
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {getInitials(notice.createdBy.name)}
                              </div>
                            )}
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{notice.createdBy.name}</span>
                          </div>
                        )}

                        {!notice.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notice._id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              color: '#ffffff',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(0, 168, 132, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(0, 168, 132, 0.3)';
                              e.currentTarget.style.color = '#00a884';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                          >
                            <Check size={13} />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
