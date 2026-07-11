import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import { getUserFromRequest } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const planType = body.planType || '1';
    const useSavedCard = body.useSavedCard || false;
    const verificationCycle = body.verificationCycle || null; // '1', '6', '12' or null
    const saveCard = body.saveCard || false;

    // 1. Ensure a Stripe Customer exists for this user
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const isAllowedVerification = user.role === 'admin' || user.role === 'super_admin';
    let months = 1;
    let amount = 599.00; // in USD
    let planName = 'Rilogram Admin 1-Month Plan';
    let planIncludesVerification = false;

    if (planType === '1' || planType === '6' || planType === '12') {
      const plan = await SubscriptionPlan.findOne({ planId: planType });
      if (!plan) {
        // Fallback to bootstrap defaults if not found in db yet
        if (planType === '1') {
          months = 1;
          amount = 599.00;
        } else if (planType === '6') {
          months = 6;
          amount = 3294.00;
        } else {
          months = 12;
          amount = 5988.00;
          planIncludesVerification = true;
        }
      } else {
        months = plan.months;
        amount = plan.pricePerMonth * plan.months;
        planIncludesVerification = !!plan.includesVerification;
      }
      planName = `Rilogram Admin ${months}-Month Plan`;
    } else if (planType === 'special') {
      const discount = user.specialDiscount;
      if (!discount || discount.pricePerMonth === null || discount.months === null) {
        return NextResponse.json({ error: 'No special discount configured for your account' }, { status: 400 });
      }
      months = discount.months;
      amount = discount.totalPrice || (discount.months * discount.pricePerMonth);
      planName = `Rilogram Admin Special ${months}-Month Plan`;
    } else if (planType === 'verification') {
      if (!isAllowedVerification) {
        return NextResponse.json({ error: 'Forbidden: Standard users cannot buy verification badges' }, { status: 403 });
      }
      months = 0;
      amount = 0;
      planName = 'Verification Badge';
    } else {
      return NextResponse.json({ error: 'Invalid planType specified' }, { status: 400 });
    }

    // Handle Verification Add-on calculation (Only if role is admin or super_admin)
    let verificationMonths = 0;
    let verificationIncluded = 'false';

    if (isAllowedVerification) {
      if (planIncludesVerification) {
        verificationMonths = months;
        verificationIncluded = 'true';
        planName += ' (Includes Verification)';
      } else if (verificationCycle === '1' || verificationCycle === '6' || verificationCycle === '12') {
        const vPlan = await SubscriptionPlan.findOne({ planId: `v${verificationCycle}` });
        let vMonths = parseInt(verificationCycle, 10);
        let vAmount = 0;
        if (vPlan) {
          vAmount = vPlan.pricePerMonth * vPlan.months;
        } else {
          if (verificationCycle === '1') vAmount = 49.00;
          else if (verificationCycle === '6') vAmount = 234.00; // 39 * 6
          else vAmount = 348.00; // 29 * 12
        }
        amount += vAmount;
        verificationMonths = vMonths;
        planName += ` + ${vMonths}-Month Verification Badge`;
      }
    }

    // Handle $0 setup / free trial plans
    if (amount <= 0) {
      return NextResponse.json({
        success: true,
        isFreeSetup: true,
        amount: 0,
        planName,
        months,
        userRole: user.role,
        specialDiscount: user.specialDiscount && user.specialDiscount.pricePerMonth !== null ? {
          pricePerMonth: user.specialDiscount.pricePerMonth,
          totalPrice: user.specialDiscount.totalPrice,
          months: user.specialDiscount.months,
          expiresAt: user.specialDiscount.expiresAt
        } : null
      });
    }

    // 2. Handle payment with Saved Card
    if (useSavedCard && user.stripePaymentMethodId) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          customer: customerId,
          payment_method: user.stripePaymentMethodId,
          off_session: false,
          confirm: true, // Auto-confirm payment using the saved card!
          payment_method_types: ['card'],
          metadata: {
            userId: payload.userId,
            planType: planType.toString(),
            months: months.toString(),
            verificationMonths: verificationMonths.toString(),
            verificationIncluded,
            savedCardUsed: 'true',
          },
        });

        return NextResponse.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          requiresAction: paymentIntent.status === 'requires_action',
          amount,
          planName,
          months,
          userRole: user.role,
          savedCard: {
            brand: user.stripeCardBrand,
            last4: user.stripeCardLast4
          }
        });
      } catch (err) {
        // If card fails off-session, fall back to normal elements checkout below
        console.warn('Saved card confirm failed, falling back to elements form:', err);
      }
    }

    // 3. Normal payment intent creation (For new card or fallback)
    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        userId: payload.userId,
        planType: planType.toString(),
        months: months.toString(),
        verificationMonths: verificationMonths.toString(),
        verificationIncluded,
        saveCard: saveCard ? 'true' : 'false',
      },
    };

    // If user checks the box to save card info, configure future usage
    if (saveCard) {
      intentParams.setup_future_usage = 'off_session';
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      planName,
      months,
      userRole: user.role,
      savedCard: user.stripePaymentMethodId ? {
        brand: user.stripeCardBrand,
        last4: user.stripeCardLast4
      } : null,
      specialDiscount: user.specialDiscount && user.specialDiscount.pricePerMonth !== null ? {
        pricePerMonth: user.specialDiscount.pricePerMonth,
        totalPrice: user.specialDiscount.totalPrice,
        months: user.specialDiscount.months,
        expiresAt: user.specialDiscount.expiresAt
      } : null
    });
  } catch (error) {
    console.error('Stripe PaymentIntent creation error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to initiate payment intent' }, { status: 500 });
  }
}
