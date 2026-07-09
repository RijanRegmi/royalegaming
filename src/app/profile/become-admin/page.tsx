'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Sparkles, Shield, Zap, CreditCard, Lock, Gift } from 'lucide-react';

export default function BecomeAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async (isSilent = false) => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setUser(data.user);
        } else if (!isSilent) {
          router.push('/login');
        }
      } catch (err) {
        console.error('Fetch user error:', err);
        if (!isSilent) {
          setError('Failed to load profile details.');
        }
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    // Poll for real-time special discount updates every 5 seconds
    const interval = setInterval(() => {
      fetchUser(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const handlePurchase = async (planType: string) => {
    setSubmittingPlan(planType);
    setError(null);
    try {
      const res = await fetch('/api/payments/stripe/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout session');
      }
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('Invalid server response: missing checkout URL');
      }
    } catch (err) {
      setError((err as Error).message);
      setSubmittingPlan(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(168, 85, 247, 0.2)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Loading secure portal...</span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const isAlreadyAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const hasSpecialDiscount = user?.specialDiscount && user.specialDiscount.pricePerMonth !== null && user.specialDiscount.months !== null;

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '40px 20px', fontFamily: 'var(--font-roboto, sans-serif)', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Background Glowing Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(0, 168, 132, 0.08) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        {/* Back Button */}
        <button 
          onClick={() => router.push('/profile')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '8px 18px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '32px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        >
          <ArrowLeft size={16} /> Back to Profile
        </button>

        {/* Title Block */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '16px' }}>
            <Sparkles size={14} style={{ color: '#c084fc' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', color: '#c084fc', textTransform: 'uppercase' }}>
              {isAlreadyAdmin ? 'Extend Subscription' : 'Become Administrator'}
            </span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 16px 0', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            {isAlreadyAdmin ? 'Extend Your Administrative Limits' : 'Unlock Your Own Administrative Panel'}
          </h1>
          <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            {isAlreadyAdmin 
              ? 'Extend your active cycle seamlessly. Purchase extensions stack securely on top of your remaining time, taking effect after your current cycle ends.'
              : 'Configure custom checkout gateways, verify transactions, broadcast announcements, direct-message players, and manage your community under your own unique slug.'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '16px', color: '#fca5a5', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>
            {error}
          </div>
        )}

        {/* ── EXCLUSIVE SPECIAL OFFER BANNER ── */}
        {hasSpecialDiscount && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.08) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#c084fc', flexShrink: 0 }}>
                <Gift size={24} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'white' }}>Exclusive Offer Configured For You!</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5', maxWidth: '550px' }}>
                  Super Admin has configured a special targeted discount cycle just for your account. Get upgraded/extended for only <strong style={{ color: '#c084fc' }}>${user.specialDiscount.pricePerMonth}/month</strong> (Total of ${user.specialDiscount.totalPrice}) for {user.specialDiscount.months} Month(s).
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handlePurchase('special')}
              disabled={submittingPlan !== null}
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                padding: '14px 28px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.4)'; }}
            >
              {submittingPlan === 'special' ? 'Redirecting...' : 'Redeem Offer'}
            </button>
          </div>
        )}

        {/* Pricing Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '64px' }}>
          
          {/* Plan 1: 1 Month */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '36px 30px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.3s' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#fff' }}>1 Month Plan</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0' }}>Perfect for testing administrative tools</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '30px' }}>
              <span style={{ fontSize: '40px', fontWeight: 900, color: '#fff' }}>$599</span>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>/month</span>
            </div>
            <button
              onClick={() => handlePurchase('1')}
              disabled={submittingPlan !== null}
              style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginBottom: '30px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
            >
              {submittingPlan === '1' ? 'Opening Stripe...' : 'Purchase Plan'}
            </button>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <PlanFeature text="Full Admin Panel Console" />
              <PlanFeature text="Custom Checkout gateways" />
              <PlanFeature text="Custom Invite Codes" />
              <PlanFeature text="24/7 Support Hotline" />
            </div>
          </div>

          {/* Plan 2: 6 Months (Popular) */}
          <div style={{ background: 'rgba(168, 85, 247, 0.02)', border: '2px solid #a855f7', borderRadius: '24px', padding: '36px 30px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.3s', boxShadow: '0 10px 30px rgba(168, 85, 247, 0.1)' }}>
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#a855f7', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 14px', borderRadius: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Most Popular
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#fff' }}>6 Month Plan</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0' }}>Save big with half-year cycle extension</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '40px', fontWeight: 900, color: '#fff' }}>$549</span>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>/month</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'line-through' }}>$3,594</span>
                <span style={{ fontSize: '12px', color: '#25d366', fontWeight: 700 }}>$3,294 total (Save 10%)</span>
              </div>
            </div>
            <button
              onClick={() => handlePurchase('6')}
              disabled={submittingPlan !== null}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginBottom: '30px', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(168, 85, 247, 0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.2)'; }}
            >
              {submittingPlan === '6' ? 'Opening Stripe...' : 'Purchase Plan'}
            </button>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <PlanFeature text="Full Admin Panel Console" />
              <PlanFeature text="Custom Checkout gateways" />
              <PlanFeature text="Custom Invite Codes" />
              <PlanFeature text="24/7 Support Hotline" />
              <PlanFeature text="Priority Webhook validation" />
            </div>
          </div>

          {/* Plan 3: 12 Months */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '36px 30px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.3s' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#fff' }}>12 Month Plan</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0' }}>Ultimate value for professional managers</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '40px', fontWeight: 900, color: '#fff' }}>$499</span>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>/month</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'line-through' }}>$7,188</span>
                <span style={{ fontSize: '12px', color: '#25d366', fontWeight: 700 }}>$5,988 total (Save 16.7%)</span>
              </div>
            </div>
            <button
              onClick={() => handlePurchase('12')}
              disabled={submittingPlan !== null}
              style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginBottom: '30px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
            >
              {submittingPlan === '12' ? 'Opening Stripe...' : 'Purchase Plan'}
            </button>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <PlanFeature text="Full Admin Panel Console" />
              <PlanFeature text="Custom Checkout gateways" />
              <PlanFeature text="Custom Invite Codes" />
              <PlanFeature text="24/7 Support Hotline" />
              <PlanFeature text="Premium Hosting Bandwidth" />
              <PlanFeature text="Zero Commission Processing" />
            </div>
          </div>

        </div>

        {/* Feature Grid Details */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '24px', padding: '40px 30px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '30px', textAlign: 'center' }}>Features Included in All Administrative Subscriptions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#a855f7', marginBottom: '4px' }}><Shield size={22} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Secure Control</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>Complete ownership of linked players and message delivery history.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#a855f7', marginBottom: '4px' }}><CreditCard size={22} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Custom Gateways</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>Upload personalized QR codes for G-Cash, bank transfers, crypto, or custom portals.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#a855f7', marginBottom: '4px' }}><Zap size={22} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Fast Invite Codes</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>Automatically register and bind players to your support console via direct referral links.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#a855f7', marginBottom: '4px' }}><Lock size={22} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>End-to-End Encryption</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>Fully secure channels keeping your messages, documents, and attachments private.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
        <Check size={11} strokeWidth={3} />
      </div>
      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{text}</span>
    </div>
  );
}
