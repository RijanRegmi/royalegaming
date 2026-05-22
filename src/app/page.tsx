'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if already authenticated
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        
        if (meRes.ok && meData.authenticated) {
          router.push('/chat');
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="fullscreen-loader">
      <div className="spinner"></div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px' }}>Connecting to support...</p>
    </div>
  );
}
