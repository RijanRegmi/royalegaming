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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    const interval = setInterval(() => {
      fetchUserAndPlans(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const handlePurchase = (planType: string) => {
    router.push(`/payment/custom-checkout?planType=${planType}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#030712', color: '#fff' }}>
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
    <div style={{ height: '100vh', overflowY: 'auto', background: 'radial-gradient(circle at center, #0b0f19 0%, #030712 100%)', color: '#fff', padding: '50px 20px', fontFamily: "'Outfit', 'Inter', sans-serif", position: 'relative', overflowX: 'hidden' }}>
      
      {/* CSS Stylesheet Injector for Premium Effects */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 10px 30px rgba(168, 85, 247, 0.12), inset 0 0 15px rgba(168, 85, 247, 0.05); }
          50% { box-shadow: 0 10px 45px rgba(168, 85, 247, 0.25), inset 0 0 25px rgba(168, 85, 247, 0.1); }
        }

        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }

        .premium-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          margin-bottom: 64px;
        }

        .pricing-card {
          background: rgba(17, 24, 39, 0.45);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 28px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pricing-card:hover {
          transform: translateY(-8px);
          border-color: rgba(168, 85, 247, 0.3);
          box-shadow: 0 20px 40px rgba(168, 85, 247, 0.1);
        }

        .pricing-card.special-offer {
          background: rgba(168, 85, 247, 0.03);
          border: 2px solid #a855f7;
          animation: pulseGlow 4s infinite ease-in-out;
        }

        .pricing-card.special-offer:hover {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 20px 50px rgba(168, 85, 247, 0.3);
        }

        .badge-tag {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(90deg, #a855f7 0%, #6366f1 100%);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          padding: 5px 16px;
          border-radius: 12px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35);
        }

        .btn-checkout {
          width: 100%;
          padding: 15px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          margin-bottom: 28px;
        }

        .btn-checkout.primary {
          background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
          border: none;
          color: #fff;
          box-shadow: 0 4px 20px rgba(168, 85, 247, 0.25);
        }

        .btn-checkout.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(168, 85, 247, 0.45);
        }

        .btn-checkout.secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .btn-checkout.secondary:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
        }

        .feature-card {
          background: rgba(17, 24, 39, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          background: rgba(17, 24, 39, 0.4);
          border-color: rgba(168, 85, 247, 0.15);
          transform: translateY(-3px);
        }

        .feature-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(168, 85, 247, 0.08);
          color: #a855f7;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .feature-card:hover .feature-icon-box {
          background: #a855f7;
          color: #fff;
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
        }
      ` }} />
      
      {/* Background Glowing Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0, 168, 132, 0.06) 0%, transparent 70%)', filter: 'blur(90px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        {/* Back Button */}
        <button 
          onClick={() => router.push('/profile')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '10px 22px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: '40px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        >
          <ArrowLeft size={16} /> Back to Profile
        </button>

        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '6px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            <Shield size={14} /> Administrative Privileges
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, margin: '0 0 14px 0', background: 'linear-gradient(135deg, #ffffff 40%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.75px' }}>
            {isAlreadyAdmin ? 'Extend Admin Subscription' : 'Upgrade to Administrator'}
          </h1>
          <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '580px', margin: '0 auto', lineHeight: '1.6' }}>
            Unlock powerful management tools, design custom checkout setups, and support client rooms securely with a premium service plan.
          </p>
        </div>

        {error && (
          <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '16px', padding: '18px', color: '#fca5a5', fontSize: '14px', textAlign: 'center', marginBottom: '40px', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '16px', padding: '18px', color: '#6ee7b7', fontSize: '14px', textAlign: 'center', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 600 }}>
            <Check size={20} style={{ color: '#10b981' }} />
            {successMessage}
          </div>
        )}

        {/* Plans Selection Grid */}
        <div className="premium-pricing-grid">
          {plans.map((plan: any) => {
            const isSpecial = specialMonths === plan.months;
            const price = isSpecial ? user.specialDiscount.pricePerMonth : plan.pricePerMonth;
            const totalPrice = isSpecial ? user.specialDiscount.totalPrice : (plan.pricePerMonth * plan.months);
            const showPopular = plan.isPopular && !isSpecial;

            return (
              <div 
                key={plan.planId}
                className={`pricing-card ${isSpecial ? 'special-offer' : ''}`}
                style={showPopular ? { border: '1.5px solid rgba(168, 85, 247, 0.6)', background: 'rgba(168, 85, 247, 0.015)' } : {}}
              >
                {isSpecial && (
                  <div className="badge-tag" style={{ background: 'linear-gradient(90deg, #ff4b6b 0%, #ff7b5c 100%)', boxShadow: '0 4px 15px rgba(255, 75, 107, 0.35)' }}>
                    <Gift size={11} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} /> Special Offer
                  </div>
                )}
                {showPopular && (
                  <div className="badge-tag">
                    <Sparkles size={11} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} /> Most Popular
                  </div>
                )}
                
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', color: '#fff' }}>{plan.name}</h2>
                <p style={{ fontSize: '13px', color: '#8fa0b5', margin: '0 0 28px 0', lineHeight: '1.4' }}>{plan.subtitle}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '42px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>${price}</span>
                    <span style={{ fontSize: '14px', color: '#8fa0b5', fontWeight: 600 }}>/month</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isSpecial ? (
                      <>
                        <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>${plan.pricePerMonth * plan.months}</span>
                        <span style={{ fontSize: '12.5px', color: '#00a884', fontWeight: 800 }}>${totalPrice} total payment</span>
                      </>
                    ) : (
                      plan.months > 1 && (
                        <>
                          <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>${599 * plan.months}</span>
                          <span style={{ fontSize: '12.5px', color: '#00a884', fontWeight: 800 }}>${totalPrice} total (Save {Math.round((1 - (plan.pricePerMonth / 599)) * 100)}%)</span>
                        </>
                      )
                    )}
                  </div>
                  {isSpecial && user.specialDiscount.expiresAt && <PlanCountdown expiresAt={user.specialDiscount.expiresAt} />}
                </div>

                <button
                  onClick={() => handlePurchase(isSpecial ? 'special' : plan.planId)}
                  disabled={submittingPlan !== null}
                  className={`btn-checkout ${(isSpecial || showPopular) ? 'primary' : 'secondary'}`}
                >
                  {submittingPlan === plan.planId || (isSpecial && submittingPlan === 'special') ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                      Opening Secure Stripe...
                    </span>
                  ) : (
                    'Purchase Plan'
                  )}
                </button>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: 'auto' }}>
                  {plan.features.map((feature: string, idx: number) => (
                    <PlanFeature key={idx} text={feature} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Features Section */}
        <div style={{ background: 'rgba(17, 24, 39, 0.2)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '32px', padding: '48px 36px', backdropFilter: 'blur(20px)' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '36px', textAlign: 'center', letterSpacing: '-0.25px' }}>Features Included in All Administrative Subscriptions</h3>
          <div className="features-grid">
            
            <div className="feature-card">
              <div className="feature-icon-box"><Shield size={20} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Secure Panel Control</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#8fa0b5', lineHeight: '1.6' }}>
                Take complete ownership of linked accounts, system notifications, and messaging configurations.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box"><CreditCard size={20} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Custom Gateways</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#8fa0b5', lineHeight: '1.6' }}>
                Upload personalized QR codes and set customized gateway URLs for checkout operations.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box"><Zap size={20} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Fast Invite Links</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#8fa0b5', lineHeight: '1.6' }}>
                Automatically map and bind new users directly to your dashboard utilizing dynamic referral links.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box"><Lock size={20} /></div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>End-to-End Privacy</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#8fa0b5', lineHeight: '1.6' }}>
                Every communication and media file shared remains completely encrypted to guarantee user confidentiality.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0, 168, 132, 0.12)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#00a884', flexShrink: 0 }}>
        <Check size={11} strokeWidth={3.5} />
      </div>
      <span style={{ fontSize: '13.5px', color: '#d1d5db', fontWeight: 500 }}>{text}</span>
    </div>
  );
}
