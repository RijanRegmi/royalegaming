'use client';

import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-roboto, sans-serif)' }}>
      {/* Glow Orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '440px', width: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '24px', padding: '40px 30px', textAlign: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', position: 'relative', zIndex: 2 }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '24px' }}>
          <XCircle size={36} />
        </div>
        
        <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 12px 0', color: '#fff' }}>Upgrade Cancelled</h1>
        <p style={{ margin: '0 0 32px 0', fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>
          Your payment was cancelled and no charges were made. You can try again or check out other subscription plan options.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => router.push('/profile/become-admin')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
              boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(168, 85, 247, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.3)'; }}
          >
            <RefreshCw size={16} /> View Pricing Plans
          </button>

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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <ArrowLeft size={16} /> Return to Profile
          </button>
        </div>

      </div>
    </div>
  );
}
