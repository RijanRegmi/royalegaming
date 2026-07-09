'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Sparkles, Shield, Zap, CreditCard, Lock, Gift } from 'lucide-react';

function PlanCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Offer expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
      ].join(':');

      setTimeLeft(`Expires in ${formatted}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ff4b6b', fontWeight: 800, background: 'rgba(255, 75, 107, 0.1)', padding: '4px 12px', borderRadius: '20px', marginTop: '8px', border: '1px solid rgba(255, 75, 107, 0.2)' }}>
      <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ff4b6b', animation: 'pulse 1.5s infinite' }} />
      {timeLeft}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default function BecomeAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndPlans = async (isSilent = false) => {
      try {
        const userRes = await fetch('/api/auth/me');
        const userData = await userRes.json();
        if (userRes.ok && userData.authenticated) {
          setUser(userData.user);
        } else if (!isSilent) {
          router.push('/login');
          return;
        }

        const plansRes = await fetch('/api/payments/plans');
        const plansData = await plansRes.json();
        if (plansRes.ok && plansData.success) {
          setPlans(plansData.plans || []);
        }
      } catch (err) {
        console.error('Fetch user or plans error:', err);
        if (!isSilent) {
          setError('Failed to load profile or subscription plan details.');
        }
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    };

    fetchUserAndPlans();

    // Poll for real-time special discount and plan pricing updates every 5 seconds
    const interval = setInterval(() => {
      fetchUserAndPlans(true);
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
  const hasSpecialDiscount = user?.specialDiscount && 
    user.specialDiscount.pricePerMonth !== null && 
    user.specialDiscount.months !== null &&
    (!user.specialDiscount.expiresAt || new Date(user.specialDiscount.expiresAt) > new Date());

  const specialMonths = hasSpecialDiscount ? user.specialDiscount.months : null;

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
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0', color: '#fff', letterSpacing: '-0.5px' }}>
            {isAlreadyAdmin ? 'Extend Subscription' : 'Become Administrator'}
          </h1>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '16px', color: '#fca5a5', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>
            {error}
          </div>
        )}

        {/* Pricing Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '64px' }}>
          {plans.map((plan: any) => {
              const isSpecial = specialMonths === plan.months;
              const price = isSpecial ? user.specialDiscount.pricePerMonth : plan.pricePerMonth;
              const totalPrice = isSpecial ? user.specialDiscount.totalPrice : (plan.pricePerMonth * plan.months);
              const showPopular = plan.isPopular && !isSpecial;

              return (
                <div 
                  key={plan.planId}
                  style={{ 
                    background: isSpecial ? 'rgba(168, 85, 247, 0.03)' : (showPopular ? 'rgba(168, 85, 247, 0.02)' : 'rgba(255,255,255,0.02)'), 
                    border: isSpecial ? '2px solid #a855f7' : (showPopular ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.05)'), 
                    borderRadius: '24px', 
                    padding: '36px 30px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    position: 'relative', 
                    transition: 'all 0.3s',
                    boxShadow: (isSpecial || showPopular) ? '0 10px 30px rgba(168, 85, 247, 0.15)' : 'none'
                  }}
                >
                  {(isSpecial || showPopular) && (
                    <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#a855f7', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '4px 14px', borderRadius: '12px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                      {isSpecial ? 'Special Offer For You' : 'Most Popular'}
                    </div>
                  )}
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#fff' }}>{plan.name}</h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0' }}>{plan.subtitle}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '40px', fontWeight: 900, color: '#fff' }}>${price}</span>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>/month</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isSpecial ? (
                        <>
                          <span style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'line-through' }}>${plan.pricePerMonth * plan.months}</span>
                          <span style={{ fontSize: '12px', color: '#25d366', fontWeight: 700 }}>${totalPrice} total</span>
                        </>
                      ) : (
                        plan.months > 1 && (
                          <>
                            <span style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'line-through' }}>${599 * plan.months}</span>
                            <span style={{ fontSize: '12px', color: '#25d366', fontWeight: 700 }}>${totalPrice} total (Save {Math.round((1 - (plan.pricePerMonth / 599)) * 100)}%)</span>
                          </>
                        )
                      )}
                    </div>
                    {isSpecial && user.specialDiscount.expiresAt && <PlanCountdown expiresAt={user.specialDiscount.expiresAt} />}
                  </div>

                  <button
                    onClick={() => handlePurchase(isSpecial ? 'special' : plan.planId)}
                    disabled={submittingPlan !== null}
                    style={{ 
                      width: '100%', 
                      padding: '14px', 
                      background: (isSpecial || showPopular) ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' : 'rgba(255,255,255,0.06)', 
                      border: (isSpecial || showPopular) ? 'none' : '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '14px', 
                      color: '#fff', 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      cursor: 'pointer', 
                      transition: 'all 0.2s', 
                      marginBottom: '30px',
                      boxShadow: (isSpecial || showPopular) ? '0 4px 15px rgba(168, 85, 247, 0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => { 
                      if (isSpecial || showPopular) {
                        e.currentTarget.style.transform = 'translateY(-1px)'; 
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(168, 85, 247, 0.3)'; 
                      } else {
                        e.currentTarget.style.background = '#fff'; 
                        e.currentTarget.style.color = '#000'; 
                      }
                    }}
                    onMouseLeave={(e) => { 
                      if (isSpecial || showPopular) {
                        e.currentTarget.style.transform = 'translateY(0)'; 
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.2)'; 
                      } else {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; 
                        e.currentTarget.style.color = '#fff'; 
                      }
                    }}
                  >
                    {submittingPlan === plan.planId || (isSpecial && submittingPlan === 'special') ? 'Opening Stripe...' : 'Purchase Plan'}
                  </button>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {plan.features.map((feature: string, idx: number) => (
                      <PlanFeature key={idx} text={feature} />
                    ))}
                  </div>
                </div>
              );
            })}
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
