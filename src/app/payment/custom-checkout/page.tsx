'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, Shield, Check, Loader2, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder_key_to_avoid_build_error_if_not_present');

// Inline SVGs for Card Brands
function VisaLogo() {
  return (
    <svg width="28" height="18" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px' }}>
      <rect width="28" height="18" rx="2" fill="#1434CB"/>
      <path d="M7.7 12.8L9.2 6H11.2L9.7 12.8H7.7ZM15.1 6.2C14.7 6 14 5.9 13.3 5.9C11.3 5.9 9.9 6.8 9.9 8.2C9.9 9.2 10.9 9.8 11.6 10.1C12.3 10.4 12.5 10.6 12.5 10.9C12.5 11.4 11.9 11.6 11.3 11.6C10.5 11.6 10.1 11.4 9.7 11.2L9.3 12.6C9.8 12.8 10.5 13 11.2 13C13.3 13 14.7 12.1 14.7 10.7C14.7 9.6 13.9 9.1 12.8 8.6C12.1 8.3 11.8 8.1 11.8 7.8C11.8 7.4 12.3 7.2 12.9 7.2C13.5 7.2 14 7.3 14.4 7.5L14.7 6.2H15.1ZM19.2 8.7L20.2 6H22.1L20.4 12.8H18.7L16.2 6.8H18.2L19.2 8.7ZM5.2 6H2L1.8 6.9C3.1 7.2 4.1 7.6 4.9 8.2L4 12.8H6L9.1 6H7.1L5.2 6Z" fill="white"/>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg width="28" height="18" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px' }}>
      <rect width="28" height="18" rx="2" fill="#222222"/>
      <circle cx="11" cy="9" r="6" fill="#EB001B"/>
      <circle cx="17" cy="9" r="6" fill="#F79E1B" fillOpacity="0.85"/>
      <path d="M14 5.3C13 6.3 12.5 7.6 12.5 9C12.5 10.4 13 11.7 14 12.7C15 11.7 15.5 10.4 15.5 9C15.5 7.6 15 6.3 14 5.3Z" fill="#FF5F00"/>
    </svg>
  );
}

function AmexLogo() {
  return (
    <svg width="28" height="18" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px' }}>
      <rect width="28" height="18" rx="2" fill="#0070CD"/>
      <path d="M2.5 12.8L4.3 6H6.1L4.3 12.8H2.5ZM13.8 6.2C13.4 6 12.8 5.9 12 5.9C9.8 5.9 8.2 6.8 8.2 8.5C8.2 9.7 9.4 10.3 10.3 10.7C11.1 11.1 11.4 11.3 11.4 11.7C11.4 12.3 10.7 12.6 9.9 12.6C9 12.6 8.5 12.4 8 12.1L7.5 13.7C8.2 14 9.1 14.2 9.9 14.2C12.3 14.2 13.9 13.1 13.9 11.4C13.9 10.1 13 9.5 11.7 8.9C10.9 8.5 10.6 8.3 10.6 7.9C10.6 7.4 11.2 7.2 11.8 7.2C12.5 7.2 13.1 7.4 13.5 7.6L13.8 6.2H13.8ZM21.2 10L22.2 6H24.3L22.4 12.8H20.4L17.7 6.8H19.8L21.2 10ZM15 6H17.8L16.2 12.8H13.4L15 6Z" fill="white"/>
    </svg>
  );
}

function DiscoverLogo() {
  return (
    <svg width="28" height="18" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px' }}>
      <rect width="28" height="18" rx="2" fill="#F4F4F4"/>
      <path d="M2 13V6H3.8C4.8 6 5.5 6.6 5.5 7.5V11.5C5.5 12.4 4.8 13 3.8 13H2ZM3 12H3.7C4.1 12 4.5 11.7 4.5 11.3V7.7C4.5 7.3 4.1 7 3.7 7H3V12ZM6.5 13V6H7.5V13H6.5ZM11.5 6.2C11.1 6 10.5 5.9 9.7 5.9C7.5 5.9 5.9 6.8 5.9 8.5C5.9 9.7 7.1 10.3 8 10.7C8.8 11.1 9.1 11.3 9.1 11.7C9.1 12.3 8.4 12.6 7.6 12.6C6.7 12.6 6.2 12.4 5.7 12.1L5.2 13.7C5.9 14 6.8 14.2 7.6 14.2C10 14.2 11.6 13.1 11.6 11.4C11.6 10.1 10.7 9.5 9.4 8.9C8.6 8.5 8.3 8.3 8.3 7.9C8.3 7.9 8.3 7.8 8.3 7.8C8.3 7.4 8.9 7.2 9.5 7.2C10.2 7.2 10.8 7.4 11.2 7.6L11.5 6.2H11.5ZM15.5 13V6H17.3C18.3 6 19 6.6 19 7.5V11.5C19 12.4 18.3 13 17.3 13H15.5ZM16.5 12H17.2C17.6 12 18 11.7 18 11.3V7.7C18 7.3 17.6 7 17.2 7H16.5V12ZM20 13V6H23.5V7H21V9H23V10H21V12H23.5V13H20ZM24.5 13V6H25.5V13H24.5Z" fill="#111111"/>
      <circle cx="13" cy="9.5" r="2.5" fill="#FF6600"/>
    </svg>
  );
}

function CheckoutForm({ 
  clientSecret, 
  paymentIntentId, 
  planName, 
  amount, 
  months, 
  isFreeSetup,
  savedCard,
  planType,
  plans,
  verificationPlans,
  specialDiscount,
  userRole,
  verificationCycle,
  onChangePlan,
  onChangeVerification
}: { 
  clientSecret: string | null; 
  paymentIntentId: string | null;
  planName: string; 
  amount: number; 
  months: number; 
  isFreeSetup: boolean; 
  savedCard: { brand: string; last4: string } | null;
  planType: string;
  plans: any[];
  verificationPlans: any[];
  specialDiscount: any;
  userRole: string;
  verificationCycle: string | null;
  onChangePlan: (type: string) => void;
  onChangeVerification: (cycle: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [cardholderName, setCardholderName] = useState('');
  const [country, setCountry] = useState('US');
  const [address, setAddress] = useState('');
  const [saveCardChecked, setSaveCardChecked] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View state: If they have a saved card, start in "saved card view"
  const [useSavedCardView, setUseSavedCardView] = useState(!!savedCard);

  // States to handle border styling dynamically on focus
  const [isNumFocused, setIsNumFocused] = useState(false);
  const [isExpFocused, setIsExpFocused] = useState(false);
  const [isCvcFocused, setIsCvcFocused] = useState(false);

  // Find standard 1-Month, 6-Month, and 12-Month pricing dynamically from database plans
  const dbMonthlyPlan = plans.find(p => p.planId === '1');
  const db6MonthPlan = plans.find(p => p.planId === '6');
  const dbYearlyPlan = plans.find(p => p.planId === '12');

  const monthlyPricePerMonth = dbMonthlyPlan ? dbMonthlyPlan.pricePerMonth : 299;
  const sixMonthPricePerMonth = db6MonthPlan ? db6MonthPlan.pricePerMonth : 249;
  const sixMonthTotalCost = db6MonthPlan ? db6MonthPlan.pricePerMonth * db6MonthPlan.months : 1494;
  const yearlyPricePerMonth = dbYearlyPlan ? dbYearlyPlan.pricePerMonth : 199;
  const yearlyTotalCost = dbYearlyPlan ? dbYearlyPlan.pricePerMonth * dbYearlyPlan.months : 2388;

  // Calculate discount percentages based on monthly rate
  const sixMonthDiscountPercent = Math.round((1 - (sixMonthPricePerMonth / monthlyPricePerMonth)) * 100);
  const discountPercent = Math.round((1 - (yearlyPricePerMonth / monthlyPricePerMonth)) * 100);

  // Parse special discount details if available
  const hasSpecialDiscount = !!specialDiscount;
  const specialPrice = specialDiscount 
    ? specialDiscount.totalPrice || (specialDiscount.pricePerMonth * specialDiscount.months)
    : 0;
  const specialMonths = specialDiscount ? specialDiscount.months : 1;

  // Check if current subscription plan already includes verification
  const currentPlan = plans.find(p => p.planId === planType);
  const planIncludesVerification = currentPlan ? !!currentPlan.includesVerification : false;

  // Load verification options from database
  const v1Plan = verificationPlans.find(vp => vp.planId === 'v1');
  const v6Plan = verificationPlans.find(vp => vp.planId === 'v6');
  const v12Plan = verificationPlans.find(vp => vp.planId === 'v12');

  const v1Cost = v1Plan ? v1Plan.pricePerMonth : 49;
  const v6Cost = v6Plan ? v6Plan.pricePerMonth * v6Plan.months : 234;
  const v12Cost = v12Plan ? v12Plan.pricePerMonth * v12Plan.months : 348;

  const isAllowedVerification = userRole === 'admin' || userRole === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isFreeSetup && !agreeTerms) {
      setErrorMessage('You must agree to the subscription terms to proceed.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (isFreeSetup) {
        const verifyRes = await fetch(`/api/payments/stripe/verify?session_id=${paymentIntentId}`);
        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          router.push('/payment/success?session_id=' + paymentIntentId);
        } else {
          throw new Error(verifyData.error || 'Failed to complete free setup');
        }
        return;
      }

      // A. Confirm with Saved Card
      if (useSavedCardView && savedCard) {
        const payRes = await fetch('/api/payments/stripe/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planType, useSavedCard: true, verificationCycle }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) {
          throw new Error(payData.error || 'Failed to authorize payment on saved card.');
        }

        if (payData.requiresAction && payData.clientSecret) {
          const { paymentIntent, error } = await stripe!.confirmCardPayment(payData.clientSecret);
          if (error) {
            throw new Error(error.message || 'Verification challenge failed.');
          }
          if (paymentIntent && paymentIntent.status === 'succeeded') {
            const verifyRes = await fetch(`/api/payments/stripe/verify?payment_intent_id=${paymentIntent.id}`);
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              router.push(`/payment/success?session_id=${paymentIntent.id}`);
              return;
            }
          }
          throw new Error('Verification completed but status mismatch.');
        } else if (payData.success) {
          router.push(`/payment/success?session_id=${payData.paymentIntentId}`);
        }
        return;
      }

      // B. Confirm with Split Elements
      if (!stripe || !elements || !clientSecret || !paymentIntentId) {
        throw new Error('Stripe is not fully initialized. Please try again.');
      }

      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card Number element not found.');
      }

      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: cardholderName || undefined,
            address: {
              country: country,
              line1: address || undefined,
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment confirmation failed');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
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

  const elementOptions = {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontSmoothing: 'antialiased',
        fontSize: '15px',
        '::placeholder': {
          color: '#555f7d',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  const getRenewalDate = () => {
    const d = new Date();
    const activeMonths = planType === 'verification' ? parseInt(verificationCycle || '1', 10) : months;
    d.setMonth(d.getMonth() + activeMonths);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {planType === 'verification' ? (
        /* Render Verification Only Primary Selection Toggles */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            Select Verification Badge Cycle
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {/* v1 card */}
            <div 
              onClick={() => onChangeVerification('1')}
              style={{ 
                cursor: 'pointer', 
                padding: '16px 12px', 
                borderRadius: '16px', 
                background: 'rgba(255,255,255,0.01)', 
                border: verificationCycle === '1' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>1 Month</span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>${v1Cost} total</span>
            </div>

            {/* v6 card */}
            <div 
              onClick={() => onChangeVerification('6')}
              style={{ 
                cursor: 'pointer', 
                padding: '16px 12px', 
                borderRadius: '16px', 
                background: 'rgba(255,255,255,0.01)', 
                border: verificationCycle === '6' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>6 Months</span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>${v6Cost} total</span>
            </div>

            {/* v12 card */}
            <div 
              onClick={() => onChangeVerification('12')}
              style={{ 
                cursor: 'pointer', 
                padding: '16px 12px', 
                borderRadius: '16px', 
                background: 'rgba(255,255,255,0.01)', 
                border: verificationCycle === '12' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>12 Months</span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>${v12Cost} total</span>
            </div>
          </div>
        </div>
      ) : (
        /* Plan Selection Toggles Grid */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          
          {/* Monthly Card Option */}
          <div 
            onClick={() => onChangePlan('1')}
            style={{ 
              cursor: 'pointer', 
              padding: '16px', 
              borderRadius: '16px', 
              background: 'rgba(255,255,255,0.01)', 
              border: planType === '1' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
              transition: 'border-color 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                border: planType === '1' ? '5px solid #a855f7' : '2px solid rgba(255,255,255,0.2)',
                background: '#0b0f19',
                transition: 'border-color 0.2s'
              }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Monthly</span>
            </div>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>${monthlyPricePerMonth}/month</span>
          </div>

          {/* 6 Month Card Option */}
          <div 
            onClick={() => onChangePlan('6')}
            style={{ 
              cursor: 'pointer', 
              padding: '16px', 
              borderRadius: '16px', 
              background: 'rgba(255,255,255,0.01)', 
              border: planType === '6' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
              transition: 'border-color 0.2s'
            }}
          >
            {sixMonthDiscountPercent > 0 && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px' }}>
                Save {sixMonthDiscountPercent}%
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                border: planType === '6' ? '5px solid #a855f7' : '2px solid rgba(255,255,255,0.2)',
                background: '#0b0f19',
                transition: 'border-color 0.2s'
              }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>6 Months</span>
            </div>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>${sixMonthTotalCost} total</span>
          </div>

          {/* Yearly Card Option */}
          <div 
            onClick={() => onChangePlan('12')}
            style={{ 
              cursor: 'pointer', 
              padding: '16px', 
              borderRadius: '16px', 
              background: 'rgba(255,255,255,0.01)', 
              border: planType === '12' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
              transition: 'border-color 0.2s'
            }}
          >
            {discountPercent > 0 && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px' }}>
                Save {discountPercent}%
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                border: planType === '12' ? '5px solid #a855f7' : '2px solid rgba(255,255,255,0.2)',
                background: '#0b0f19',
                transition: 'border-color 0.2s'
              }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Yearly</span>
            </div>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>${yearlyTotalCost} total</span>
          </div>

          {/* Special Offer Card Option (Render dynamically if user has a special discount) */}
          {hasSpecialDiscount && (
            <div 
              onClick={() => onChangePlan('special')}
              style={{ 
                cursor: 'pointer', 
                padding: '16px', 
                borderRadius: '16px', 
                background: planType === 'special' ? 'rgba(16,185,129,0.02)' : 'rgba(255,255,255,0.01)', 
                border: planType === 'special' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                position: 'relative',
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px' }}>
                Special Offer
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '50%', 
                  border: planType === 'special' ? '5px solid #10b981' : '2px solid rgba(255,255,255,0.2)',
                  background: '#0b0f19',
                  transition: 'border-color 0.2s'
                }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Special</span>
              </div>
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>${specialPrice} total ({specialMonths} mo)</span>
            </div>
          )}
        </div>
      )}

      {/* Verification Badge Option for Admins */}
      {planType !== 'verification' && isAllowedVerification && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {planIncludesVerification ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13.5px', fontWeight: 700 }}>
              <Check size={16} style={{ strokeWidth: 3 }} />
              <span>Verified Account Badge included automatically in this plan!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>
                <input 
                  type="checkbox"
                  checked={verificationCycle !== null}
                  onChange={(e) => onChangeVerification(e.target.checked ? '1' : null)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Add Verified Account Badge
                </span>
              </label>

              {verificationCycle !== null && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  {/* v1 toggle */}
                  <div 
                    onClick={() => onChangeVerification('1')}
                    style={{ 
                      cursor: 'pointer', 
                      padding: '12px 10px', 
                      borderRadius: '12px', 
                      background: 'rgba(0,0,0,0.15)',
                      border: verificationCycle === '1' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>1 Month</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>${v1Cost}</span>
                  </div>

                  {/* v6 toggle */}
                  <div 
                    onClick={() => onChangeVerification('6')}
                    style={{ 
                      cursor: 'pointer', 
                      padding: '12px 10px', 
                      borderRadius: '12px', 
                      background: 'rgba(0,0,0,0.15)',
                      border: verificationCycle === '6' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>6 Months</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>${v6Cost}</span>
                  </div>

                  {/* v12 toggle */}
                  <div 
                    onClick={() => onChangeVerification('12')}
                    style={{ 
                      cursor: 'pointer', 
                      padding: '12px 10px', 
                      borderRadius: '12px', 
                      background: 'rgba(0,0,0,0.15)',
                      border: verificationCycle === '12' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>12 Months</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>${v12Cost}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Order Summary Details */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px 24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '13.5px', fontWeight: 700, letterSpacing: '0.25px', color: '#6b7280', textTransform: 'uppercase' }}>
          Order details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{planName}</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>${amount.toFixed(2)}</span>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', color: '#94a3b8' }}>Subtotal</span>
            <span style={{ fontSize: '13.5px', color: '#cbd5e1' }}>${amount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Total due today</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Auto-renew warning message */}
      {!isFreeSetup && (
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>
          <Shield size={16} style={{ flexShrink: 0, marginTop: '2px', color: planType === 'verification' ? '#10b981' : '#a855f7' }} />
          {planType === 'verification' ? (
            <span>
              Your verification status badge will remain active on your profile until <strong>{getRenewalDate()}</strong>.
            </span>
          ) : (
            <span>
              Your subscription will auto renew on <strong>{getRenewalDate()}</strong>. You will be charged ${amount.toFixed(2)}/{months === 12 ? 'year' : 'month'} + tax.
            </span>
          )}
        </div>
      )}

      {/* Payment Method Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h3 style={{ margin: '0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
          Payment method
        </h3>

        {useSavedCardView && savedCard ? (
          /* Render Saved Card UI */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '16px 20px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.06)', 
                borderRadius: '16px' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {savedCard.brand === 'visa' ? <VisaLogo /> : 
                 savedCard.brand === 'mastercard' ? <MastercardLogo /> : 
                 savedCard.brand === 'amex' ? <AmexLogo /> : 
                 savedCard.brand === 'discover' ? <DiscoverLogo /> : 
                 <CreditCard size={18} style={{ color: '#94a3b8' }} />}
                
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>
                  {savedCard.brand} •••• {savedCard.last4}
                </span>
              </div>
              
              <button 
                type="button" 
                onClick={() => setUseSavedCardView(false)} 
                style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
                </svg>
              </button>
            </div>

            {/* Checkbox: terms agreement for saved card */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5', marginTop: '4px' }}>
              <input 
                type="checkbox" 
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer', width: '15px', height: '15px', accentColor: '#a855f7' }}
              />
              <span>
                You agree that Rilogram will charge your card in the amount above now and on a recurring {months === 12 ? 'annual' : 'monthly'} basis until you cancel in accordance with our terms. You can cancel at any time in your account settings.
              </span>
            </label>
          </div>
        ) : (
          /* Render Split Card Input Elements */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {savedCard && (
              <button
                type="button"
                onClick={() => setUseSavedCardView(true)}
                style={{ alignSelf: 'flex-start', padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: '#cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginBottom: '8px' }}
              >
                Use saved card info
              </button>
            )}

            {/* Full Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Full name</label>
              <input
                type="text"
                required
                placeholder="Rijan Regmi"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
              />
            </div>

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

            {/* Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Address</label>
              <input
                type="text"
                placeholder="Billing street address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
              />
            </div>

            {!isFreeSetup && (
              <>
                {/* Card Number Input with Brand Logos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Card number</label>
                  <div 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 16px', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: isNumFocused ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.06)', 
                      borderRadius: '12px', 
                      transition: 'border-color 0.2s' 
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <CardNumberElement 
                        options={elementOptions} 
                        onFocus={() => setIsNumFocused(true)}
                        onBlur={() => setIsNumFocused(false)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px', opacity: 0.85, flexShrink: 0 }}>
                      <VisaLogo />
                      <MastercardLogo />
                      <AmexLogo />
                      <DiscoverLogo />
                    </div>
                  </div>
                </div>

                {/* Expiration and CVC side-by-side */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  
                  {/* Expiration date */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Expiration date</label>
                    <div 
                      style={{ 
                        padding: '14px 16px', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: isExpFocused ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: '12px', 
                        transition: 'border-color 0.2s' 
                      }}
                    >
                      <CardExpiryElement 
                        options={elementOptions}
                        onFocus={() => setIsExpFocused(true)}
                        onBlur={() => setIsExpFocused(false)}
                      />
                    </div>
                  </div>

                  {/* Security code */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 600 }}>Security code</label>
                    <div 
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '14px 16px', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: isCvcFocused ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: '12px', 
                        transition: 'border-color 0.2s' 
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <CardCvcElement 
                          options={elementOptions}
                          onFocus={() => setIsCvcFocused(true)}
                          onBlur={() => setIsCvcFocused(false)}
                        />
                      </div>
                      <svg width="20" height="13" viewBox="0 0 20 13" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '8px', opacity: 0.5 }}>
                        <rect width="20" height="13" rx="2" fill="#555F7D"/>
                        <rect y="3" width="20" height="2" fill="#1F2937"/>
                        <rect x="14" y="7" width="4" height="4" rx="0.5" fill="#E5E7EB"/>
                        <path d="M12.5 9.5H13" stroke="white" strokeWidth="0.75" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>

                </div>

                {/* Save card info option checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#cbd5e1', marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={saveCardChecked}
                    onChange={(e) => setSaveCardChecked(e.target.checked)}
                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#a855f7' }}
                  />
                  <span>Save payment method for future use</span>
                </label>

                {/* Checkboxes: terms agreement */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                    <input 
                      type="checkbox" 
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      style={{ marginTop: '3px', cursor: 'pointer', width: '15px', height: '15px', accentColor: '#a855f7' }}
                    />
                    <span>
                      You agree that Rilogram will charge your card in the amount above now and on a recurring {months === 12 ? 'annual' : 'monthly'} basis until you cancel in accordance with our terms. You can cancel at any time in your account settings.
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '14px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting || (!isFreeSetup && !useSavedCardView && (!stripe || !elements))}
        style={{ width: '100%', padding: '16px', background: '#e2e8f0', border: 'none', borderRadius: '16px', color: '#0f172a', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Processing secure payment...</span>
          </>
        ) : (
          <span>Subscribe</span>
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
  const [planType, setPlanType] = useState(searchParams.get('planType') || '1');
  const [verificationCycle, setVerificationCycle] = useState<string | null>(
    searchParams.get('verificationCycle') || (searchParams.get('planType') === 'verification' ? '1' : null)
  );
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [initData, setInitData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [verificationPlans, setVerificationPlans] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If auth token is present in the URL (mobile WebView app flow), save to cookies
    if (token) {
      document.cookie = `auth_token=${token}; path=/; max-age=604800; Secure; SameSite=Strict`;
    }

    const initCheckout = async () => {
      try {
        // Fetch all plans dynamically from the database
        const plansRes = await fetch('/api/payments/plans');
        const plansData = await plansRes.json();
        if (plansRes.ok && plansData.success) {
          setPlans(plansData.plans || []);
          setVerificationPlans(plansData.verificationPlans || []);
        }

        // Fetch PaymentIntent init details with standard plan and verification cycle parameters
        const res = await fetch('/api/payments/stripe/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planType, verificationCycle }),
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
        setSubmittingPlan(false);
      }
    };

    initCheckout();
  }, [planType, token, verificationCycle]);

  const handleChangePlan = (newPlanType: string) => {
    if (newPlanType === planType || submittingPlan) return;
    setSubmittingPlan(true);
    setPlanType(newPlanType);
    if (newPlanType === 'verification') {
      setVerificationCycle(verificationCycle || '1');
    } else {
      setVerificationCycle(null);
    }
  };

  const handleChangeVerification = (newCycle: string | null) => {
    if (newCycle === verificationCycle || submittingPlan) return;
    setSubmittingPlan(true);
    setVerificationCycle(newCycle);
  };

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
    <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
      
      {/* Loading overlay when toggling between plans */}
      {submittingPlan && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(2px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '24px' }}>
          <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={32} />
        </div>
      )}

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
          savedCard={initData.savedCard}
          planType={planType}
          plans={plans}
          verificationPlans={verificationPlans}
          specialDiscount={initData.specialDiscount}
          userRole={initData.userRole}
          verificationCycle={verificationCycle}
          onChangePlan={handleChangePlan}
          onChangeVerification={handleChangeVerification}
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
            savedCard={initData.savedCard}
            planType={planType}
            plans={plans}
            verificationPlans={verificationPlans}
            specialDiscount={initData.specialDiscount}
            userRole={initData.userRole}
            verificationCycle={verificationCycle}
            onChangePlan={handleChangePlan}
            onChangeVerification={handleChangeVerification}
          />
        </Elements>
      )}
    </div>
  );
}

export default function CustomCheckoutPage() {
  useEffect(() => {
    // Enable body scrolling by overriding global layout overflow: hidden
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#111111', color: '#fff', padding: '40px 20px', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
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
