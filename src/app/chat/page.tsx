'use strict';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserChatView from '@/components/UserChatView';
import AdminChatView from '@/components/AdminChatView';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Visual Viewport Height handler for mobile keyboard compatibility
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty('--viewport-height', `${window.visualViewport.height}px`);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      handleResize();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      document.documentElement.style.removeProperty('--viewport-height');
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        if (!res.ok || !data.authenticated) {
          router.push('/login?expired=true');
          return;
        }
        
        setUser(data.user);
      } catch (err) {
        console.error('Auth verification error:', err);
        router.push('/login?expired=true');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px' }}>Loading support panel...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-container">
      {user.role === 'user' ? (
        <UserChatView currentUser={user} />
      ) : (
        <AdminChatView currentUser={user} />
      )}
    </div>
  );
}
