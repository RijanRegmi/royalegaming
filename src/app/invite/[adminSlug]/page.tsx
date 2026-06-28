'use client';

import { useEffect, useState } from 'react';
import styles from './invite.module.css';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Shield, Check, LogIn, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface AdminInfo {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const adminSlug = params.adminSlug as string;
  const referredBy = searchParams ? searchParams.get('referredBy') || '' : '';

  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [referrerName, setReferrerName] = useState<string>('');
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

        // 2. Fetch admin details and resolve referrerName if referredBy query is present
        const adminRes = await fetch(`/api/auth/link-admin?slug=${adminSlug}&referredBy=${referredBy}`);
        const adminData = await adminRes.json();
        if (adminRes.ok && adminData.success) {
          setAdmin(adminData.admin);
          if (adminData.referrerName) {
            setReferrerName(adminData.referrerName);
          }
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
  }, [adminSlug, referredBy]);

  const handleAcceptInvite = async () => {
    if (!adminSlug) return;
    setAccepting(true);
    try {
      const res = await fetch('/api/auth/link-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSlug, referredBy }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      const adminId = data.admin?.id || data.admin?._id;
      if (authenticated) {
        router.push(`/chat?adminId=${adminId}`);
      } else {
        router.push(`/login?redirect=${encodeURIComponent(`/chat?adminId=${adminId}`)}`);
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
    <div className={`auth-page ${styles.container}`}>
      <div className={styles.background} />
      <div className={`auth-card glass ${styles.inviteCard}`}>
        
        <div className={styles.authLogo}>
          <Image
            src="/rilogram_logo.png"
            alt="Rilogram Logo"
            width={90}
            height={90}
            className={styles.logoImage}
          />
          <h1 className={styles.logoTitle} style={{ letterSpacing: '4px', fontWeight: 900 }}>RILOGRAM</h1>
          <p className={styles.logoSubtitle}>Community Invitation</p>
        </div>

        {error ? (
          <div className={styles.errorBox}>
            <div className={styles.errorIcon}>
              <ArrowLeft size={24} />
            </div>
            <h2 className={styles.errorTitle}>Invitation Error</h2>
            <p className={styles.errorMessage}>{error}</p>
            <button 
              type="button"
              onClick={() => router.push('/')}
              className={styles.btnPrimary}
            >
              Go to Lobby
            </button>
          </div>
        ) : (
          admin && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Admin Avatar Circle */}
              <Link href="/profile">
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatarCircle}>
                    {admin.avatar ? (
                      <img 
                        src={admin.avatar.startsWith('http') || admin.avatar.startsWith('/') ? admin.avatar : `/${admin.avatar}`} 
                        alt={admin.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      getInitials(admin.name)
                    )}
                  </div>
                  <div className={styles.avatarBadge}>
                    <Shield size={12} />
                  </div>
                </div>
              </Link>

              {/* Text Context */}
              <h2 className={styles.title}>Join {admin.name}&apos;s Community</h2>
              {referrerName ? (
                <p className={styles.subtitle}>You have been invited by <strong>{referrerName}</strong> to connect with <strong>{admin.name}</strong> for direct game credentials, private support chat, and custom checkout options.</p>
              ) : (
                <p className={styles.subtitle}>You have been invited to connect with <strong>{admin.name}</strong> for direct game credentials, private support chat, and custom checkout options.</p>
              )}

              {/* Accept Trigger Button */}
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleAcceptInvite}
                disabled={accepting}
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
                className={styles.btnGuest}
                onClick={() => router.push('/')}
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
