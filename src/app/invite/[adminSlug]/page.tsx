'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Shield, Check, LogIn, ArrowLeft } from 'lucide-react';

interface AdminInfo {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const adminSlug = params.adminSlug as string;

  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [accepting, setAccepting] = useState<boolean>(false);

  useEffect(() => {
    if (!adminSlug) return;

    const checkAuthAndFetchAdmin = async () => {
      try {
        // 1. Verify if user is logged in
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authRes.ok && authData.authenticated) {
          setAuthenticated(true);
        }

        // 2. Fetch admin details
        const adminRes = await fetch(`/api/auth/link-admin?slug=${adminSlug}`);
        const adminData = await adminRes.json();
        if (adminRes.ok && adminData.success) {
          setAdmin(adminData.admin);
        } else {
          setError(adminData.error || 'This invitation link is invalid or expired.');
        }
      } catch (err) {
        console.error('Error in invite load:', err);
        setError('Connection error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchAdmin();
  }, [adminSlug]);

  const handleAcceptInvite = async () => {
    if (!adminSlug) return;
    setAccepting(true);
    try {
      const res = await fetch('/api/auth/link-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSlug }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to accept invitation');
      }

      if (authenticated) {
        router.push('/chat');
      } else {
        router.push('/login?redirect=/chat');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(errorMsg);
      setAccepting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="fullscreen-loader" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={40} />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Loading invitation details...</p>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="auth-card glass" style={{ maxWidth: '420px', width: '100%', padding: '40px 30px', textAlign: 'center' }}>
        
        <div className="auth-logo" style={{ marginBottom: '32px' }}>
          <Image
            src="/royale_logo.jpg"
            alt="Royale Gaming Logo"
            width={70}
            height={70}
            style={{ borderRadius: '16px', objectFit: 'cover', marginBottom: '16px', boxShadow: '0 8px 24px rgba(168, 85, 247, 0.25)' }}
          />
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>Royale Gaming</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>Community Invitation</p>
        </div>

        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <ArrowLeft size={24} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ef4444', margin: 0 }}>Invitation Error</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {error}
            </p>
            <button 
              type="button"
              className="btn-primary" 
              onClick={() => router.push('/')}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginTop: '8px' }}
            >
              Go to Lobby
            </button>
          </div>
        ) : (
          admin && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Admin Avatar Circle */}
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{ 
                  width: '90px', 
                  height: '90px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#ffffff',
                  border: '3px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
                  overflow: 'hidden'
                }}>
                  {admin.avatar ? (
                    <img src={admin.avatar} alt={admin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(admin.name)
                  )}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  background: '#a855f7',
                  border: '2px solid #100f14',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}>
                  <Shield size={12} />
                </div>
              </div>

              {/* Text Context */}
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff', margin: '0 0 8px 0' }}>
                Join {admin.name}&apos;s Community
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: '0 0 32px 0' }}>
                You have been invited to connect with <strong>{admin.name}</strong> for direct game credentials, private support chat, and custom checkout options.
              </p>

              {/* Accept Trigger Button */}
              <button
                type="button"
                className="btn-primary"
                onClick={handleAcceptInvite}
                disabled={accepting}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '10px', 
                  fontSize: '15px', 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
                }}
              >
                {accepting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : authenticated ? (
                  <>
                    <Check size={18} />
                    Accept Invite & Chat
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In / Register to Accept
                  </>
                )}
              </button>

              <button
                type="button"
                className="guest-btn"
                onClick={() => router.push('/')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  fontSize: '14px', 
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Decline & Exit
              </button>

            </div>
          )
        )}
      </div>
    </div>
  );
}
