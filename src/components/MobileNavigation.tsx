'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageSquare, User, Bell, Shield, UserPlus } from 'lucide-react';

export default function MobileNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Error verifying auth in MobileNavigation:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch unread notifications count for the badge
  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/notices');
        const data = await res.json();
        if (res.ok && data.success) {
          const unreads = data.notices.filter((n: any) => !n.isRead).length;
          setUnreadCount(unreads);
        }
      } catch (err) {
        console.error('Error fetching unread notices count:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [user, pathname]);

  // Set visual class on document body for spacing
  useEffect(() => {
    if (loading || !user) return;

    // Check if the current page is a public one or a payment flow page
    const isPublicPage = pathname === '/login' || 
                         pathname.startsWith('/invite') || 
                         pathname === '/register' || 
                         pathname.startsWith('/reset-password') || 
                         pathname.startsWith('/forgot-password') ||
                         pathname.startsWith('/payment');

    if (!isPublicPage) {
      document.body.classList.add('has-mobile-nav');
    } else {
      document.body.classList.remove('has-mobile-nav');
    }

    return () => {
      document.body.classList.remove('has-mobile-nav');
    };
  }, [pathname, user, loading]);

  if (loading || !user) return null;

  // Do not show on login, register, reset-password, invite, or payment pages
  const isPublicPage = pathname === '/login' || 
                       pathname.startsWith('/invite') || 
                       pathname === '/register' || 
                       pathname.startsWith('/reset-password') || 
                       pathname.startsWith('/forgot-password') ||
                       pathname.startsWith('/payment');

  if (isPublicPage) return null;

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  // Determine top header title and action based on page path
  let topHeaderTitle = 'RILOGRAM';
  let showActions: 'home' | 'chat' | 'none' = 'none';

  if (pathname === '/') {
    topHeaderTitle = 'RILOGRAM';
    showActions = 'home';
  } else if (pathname.startsWith('/chat')) {
    topHeaderTitle = 'SUPPORT CHAT';
    showActions = 'chat';
  } else if (pathname.startsWith('/profile')) {
    topHeaderTitle = 'MY PROFILE';
  } else if (pathname === '/admin') {
    topHeaderTitle = 'CONTROL ROOM';
  } else if (pathname === '/notices') {
    topHeaderTitle = 'NOTICE BOARD';
  }

  const handleOpenInvite = () => {
    // Dispatch custom event to trigger showing invite modal inside UserChatView/AdminChatView
    window.dispatchEvent(new Event('open-invite-modal'));
  };

  return (
    <>
      {/* Mobile Top Glass Header */}
      <header className="mobile-top-header">
        <span className="mobile-top-header-title">{topHeaderTitle}</span>
        
        <div className="mobile-top-header-actions">
          {showActions === 'home' && (
            <>
              {/* Notices / Notifications */}
              <button 
                className="mobile-header-btn" 
                onClick={() => router.push('/notices')}
                title="Notifications"
              >
                <Bell size={21} />
                {unreadCount > 0 && (
                  <span className="mobile-notification-badge">{unreadCount}</span>
                )}
              </button>

              {/* Control Room (Admins only) */}
              {isAdmin && (
                <button 
                  className="mobile-header-btn" 
                  onClick={() => router.push('/admin')}
                  title="Control Room"
                >
                  <Shield size={21} style={{ color: '#a855f7' }} />
                </button>
              )}
            </>
          )}

          {showActions === 'chat' && (
            <button 
              className="mobile-header-btn" 
              onClick={handleOpenInvite}
              title="Add Player / Get Invite Link"
              style={{ color: '#a855f7' }}
            >
              <UserPlus size={21} />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Glass Navbar */}
      <nav className="mobile-bottom-navbar">
        {/* Home page link */}
        <button 
          className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}
          onClick={() => router.push('/')}
          title="Home"
        >
          <Home size={22} />
        </button>

        {/* Chat page link */}
        <button 
          className={`mobile-nav-item ${pathname.startsWith('/chat') ? 'active' : ''}`}
          onClick={() => router.push('/chat')}
          title="Support Chat"
        >
          <MessageSquare size={22} />
        </button>

        {/* Profile page link */}
        <button 
          className={`mobile-nav-item ${pathname.startsWith('/profile') ? 'active' : ''}`}
          onClick={() => router.push('/profile')}
          title="Profile"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt="Avatar" 
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: pathname.startsWith('/profile') ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                objectFit: 'cover'
              }} 
            />
          ) : (
            <User size={22} />
          )}
        </button>
      </nav>
    </>
  );
}
