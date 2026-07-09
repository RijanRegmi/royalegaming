'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Shield, ArrowRight, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'timeout'>('verifying');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setStatus('timeout');
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;

    const verifyTransaction = async () => {
      try {
        const res = await fetch(`/api/payments/stripe/verify?session_id=${sessionId}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setStatus('success');
          // Fetch user details to get name
          const userRes = await fetch('/api/auth/me');
          const userData = await userRes.json();
          if (userRes.ok && userData.authenticated) {
            setUserName(userData.user.name);
          }
          return;
        }
      } catch (err) {
        console.error('Error verifying status:', err);
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(verifyTransaction, 3000);
      } else {
        setStatus('timeout');
      }
    };

    verifyTransaction();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-roboto, sans-serif)' }}>
      {/* Glow Orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '24px', padding: '40px 30px', textAlign: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', position: 'relative', zIndex: 2 }}>
        
        {status === 'verifying' && (
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', marginBottom: '24px' }}>
              <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0' }}>Verifying Transaction</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>
              We are confirming your payment with Stripe. Your administrative panel privileges will unlock momentarily...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '24px', animation: 'scaleUp 0.3s ease-out' }}>
              <CheckCircle size={36} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 12px 0', color: '#fff' }}>Payment Successful!</h1>
            <p style={{ margin: '0 0 32px 0', fontSize: '14.5px', color: '#cbd5e1', lineHeight: '1.6' }}>
              Thank you, {userName}! Your administrative subscription plan has been successfully activated and time limits extended.
            </p>

            <button
              onClick={() => router.push('/admin')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)'; }}
            >
              Open Admin Panel <ArrowRight size={16} />
            </button>
          </div>
        )}

        {status === 'timeout' && (
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', marginBottom: '24px' }}>
              <Shield size={32} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0' }}>Activation Processing</h1>
            <p style={{ margin: '0 0 32px 0', fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>
              Your payment was received, but the backend is still completing the synchronization. You can manually check your console shortly.
            </p>

            <button
              onClick={() => router.push('/profile')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              Go to Profile
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes scaleUp { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
