'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, Shield, Check, Loader2, CreditCard, HelpCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder_key_to_avoid_build_error_if_not_present');

function CheckoutForm({ 
  clientSecret, 
  paymentIntentId, 
  planName, 
  amount, 
  months, 
  isFreeSetup 
}: { 
  clientSecret: string | null; 
  paymentIntentId: string | null;
  planName: string; 
  amount: number; 
  months: number; 
  isFreeSetup: boolean; 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [cardholderName, setCardholderName] = useState('');
  const [country, setCountry] = useState('US');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCardFocused, setIsCardFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (isFreeSetup) {
        // For $0 setup plans, directly verify with the backend
        const verifyRes = await fetch(`/api/payments/stripe/verify?session_id=${paymentIntentId}`);
        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          router.push('/payment/success?session_id=' + paymentIntentId);
        } else {
          throw new Error(verifyData.error || 'Failed to complete free setup');
        }
        return;
      }

      if (!stripe || !elements || !clientSecret || !paymentIntentId) {
        throw new Error('Stripe is not fully initialized. Please try again.');
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Payment input elements not found.');
      }

      // Confirm payment with Stripe directly (Card details never touch our server)
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName || undefined,
            address: {
              country: country,
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment confirmation failed');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Send PaymentIntent ID to our backend for verification and role upgrade
        const verifyRes = await fetch(`/api/payments/stripe/verify?payment_intent_id=${paymentIntent.id}`);
        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.success) {
          router.push(`/payment/success?session_id=${paymentIntent.id}`);
        } else {
          throw new Error(verifyData.error || 'Failed to verify transaction on server');
        }
      } else {
        throw new Error('Payment is still pending. Please contact support.');
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
      setSubmitting(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontSmoothing: 'antialiased',
        fontSize: '15px',
        '::placeholder': {
          color: '#6b7280',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  // Calculate renewal date
  const getRenewalDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Order Summary Details */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, letterSpacing: '0.25px', color: '#94a3b8', textTransform: 'uppercase' }}>
          Order details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{planName}</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>${amount.toFixed(2)}</span>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Subtotal</span>
            <span style={{ fontSize: '14px', color: '#cbd5e1' }}>${amount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Total due today</span>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#c084fc' }}>${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Auto-renew warning message */}
      {!isFreeSetup && (
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '14px', fontSize: '12.5px', color: '#c084fc', lineHeight: '1.5' }}>
          <Shield size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            Your subscription will auto-renew on <strong>{getRenewalDate()}</strong>. You will be charged ${amount.toFixed(2)} / cycle. Cancel anytime in your profile settings.
          </span>
        </div>
      )}

      {/* Payment details form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
          Payment method
        </h3>

        {/* Cardholder Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Cardholder Name</label>
          <input
            type="text"
            required
            placeholder="Name on card"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
          />
        </div>

        {/* Stripe CardElement input */}
        {!isFreeSetup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Card details</label>
            <div 
              style={{ 
                padding: '14px 16px', 
                background: 'rgba(255,255,255,0.03)', 
                border: isCardFocused ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.06)', 
                borderRadius: '12px', 
                transition: 'border-color 0.2s' 
              }}
            >
              <CardElement 
                options={cardElementOptions} 
                onFocus={() => setIsCardFocused(true)}
                onBlur={() => setIsCardFocused(false)}
              />
            </div>
          </div>
        )}

        {/* Country Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Country or region</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }}
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="PH">Philippines</option>
            <option value="NP">Nepal</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '14px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting || (!isFreeSetup && (!stripe || !elements))}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)', transition: 'transform 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Processing secure payment...</span>
          </>
        ) : (
          <>
            <Lock size={15} />
            <span>Pay ${amount.toFixed(2)}</span>
          </>
        )}
      </button>

      {/* SSL / Privacy notice */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#8fa0b5', opacity: 0.8, marginTop: '-8px' }}>
        <Shield size={12} style={{ color: '#10b981' }} />
        <span>End-to-end encrypted | Secure transaction</span>
      </div>
    </form>
  );
}

function CustomCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planType = searchParams.get('planType') || '1';
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. If auth token is present in the URL (mobile WebView app flow), save to cookies
    if (token) {
      document.cookie = `auth_token=${token}; path=/; max-age=604800; Secure; SameSite=Strict`;
    }

    const initCheckout = async () => {
      try {
        const res = await fetch('/api/payments/stripe/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planType }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to initialize payment gateway.');
        }
        setInitData(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    initCheckout();
  }, [planType, token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
        <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={40} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Establishing secure connection...</span>
      </div>
    );
  }

  if (error || !initData) {
    return (
      <div style={{ maxWidth: '440px', margin: '100px auto', padding: '30px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', marginBottom: '12px' }}>Initialization Failed</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>{error || 'Failed to authenticate your session.'}</p>
        <button
          onClick={() => router.push('/profile/become-admin')}
          style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          Return to Plans
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      
      {/* Header Info */}
      <div style={{ marginBottom: '32px' }}>
        <button 
          onClick={() => router.push('/profile/become-admin')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px 0' }}
        >
          <ArrowLeft size={14} /> Back to plans
        </button>
        <h1 style={{ fontSize: '26px', fontWeight: 900, margin: '0 0 6px 0', background: 'linear-gradient(135deg, #ffffff 40%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Secure Checkout
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Review details and finalize your administrator subscription.</p>
      </div>

      {initData.isFreeSetup ? (
        <CheckoutForm
          clientSecret={null}
          paymentIntentId={initData.paymentIntentId || 'free_setup_' + Date.now()}
          planName={initData.planName}
          amount={0}
          months={initData.months}
          isFreeSetup={true}
        />
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret: initData.clientSecret }}>
          <CheckoutForm
            clientSecret={initData.clientSecret}
            paymentIntentId={initData.paymentIntentId}
            planName={initData.planName}
            amount={initData.amount}
            months={initData.months}
            isFreeSetup={false}
          />
        </Elements>
      )}
    </div>
  );
}

export default function CustomCheckoutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at center, #0b0f19 0%, #030712 100%)', color: '#fff', padding: '40px 20px', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <Suspense fallback={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
          <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={40} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Loading secure page...</span>
        </div>
      }>
        <CustomCheckoutContent />
      </Suspense>
    </div>
  );
}
