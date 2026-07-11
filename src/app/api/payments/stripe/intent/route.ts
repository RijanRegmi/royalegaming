import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import SubscriptionPlan from '@/models/SubscriptionPlan';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_to_avoid_build_error_if_not_present');

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planType, useSavedCard, saveCard } = await req.json();
    if (!planType) {
      return NextResponse.json({ error: 'Missing planType parameter' }, { status: 400 });
    }

    await dbConnect();

    // Fetch user details from database
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    let months = 1;
    let amount = 599.00; // in USD
    let planName = 'Rilogram Admin 1-Month Plan';

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
        }
      } else {
        months = plan.months;
        amount = plan.pricePerMonth * plan.months;
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
    } else {
      return NextResponse.json({ error: 'Invalid planType specified' }, { status: 400 });
    }

    // Handle $0 setup / free trial plans
    if (amount <= 0) {
      return NextResponse.json({
        success: true,
        isFreeSetup: true,
        amount: 0,
        planName,
        months
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
          savedCard: {
            brand: user.stripeCardBrand,
            last4: user.stripeCardLast4
          }
        });
      } catch (err) {
        // If card fails off-session, fall back to normal checkout creation below
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
      savedCard: user.stripePaymentMethodId ? {
        brand: user.stripeCardBrand,
        last4: user.stripeCardLast4
      } : null
    });
  } catch (error) {
    console.error('Stripe PaymentIntent creation error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to initiate payment intent' }, { status: 500 });
  }
}
