'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminSlugLinkPage() {
  const router = useRouter();
  const params = useParams();
  const adminSlug = params.adminSlug as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminSlug) return;

    // Check for reserved routing paths and files with extensions
    const reservedRoutes = ['chat', 'login', 'admin', 'profile', 'api', 'favicon.ico'];
    if (reservedRoutes.includes(adminSlug.toLowerCase()) || /\.[a-zA-Z0-9]+$/.test(adminSlug)) {
      return;
    }

    const linkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/link-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminSlug }),
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
          // Redirect to support chat
          router.push('/chat');
        } else {
          setError(data.error || 'Administrator link is invalid');
        }
      } catch (err) {
        console.error('Error linking admin:', err);
        setError('Connection error. Please try again.');
      }
    };

    linkAdmin();
  }, [adminSlug, router]);

  if (error) {
    return (
      <div className="fullscreen-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px', padding: '20px', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '40px 30px',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ff4b6b', margin: 0 }}>Link Error</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            {error}
          </p>
          <button 
            type="button"
            className="lobby-btn-primary" 
            onClick={() => router.push('/')}
            style={{ width: '100%', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer' }}
          >
            Go to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen-loader" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--accent-color)' }} size={40} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Connecting to administrator support...</p>
    </div>
  );
}
