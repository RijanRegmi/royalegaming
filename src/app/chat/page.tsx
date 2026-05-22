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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        if (!res.ok || !data.authenticated) {
          router.push('/login');
          return;
        }
        
        setUser(data.user);
      } catch (err) {
        console.error('Auth verification error:', err);
        router.push('/login');
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
