import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_to_avoid_build_error_if_not_present');

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planType } = await req.json();
    if (!planType) {
      return NextResponse.json({ error: 'Missing planType parameter' }, { status: 400 });
    }

    await dbConnect();

    // Fetch user details from database
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let months = 1;
    let amount = 599.00; // in USD
    let planName = 'Rilogram Admin 1-Month Plan';

    if (planType === '1') {
      months = 1;
      amount = 599.00;
      planName = 'Rilogram Admin 1-Month Plan';
    } else if (planType === '6') {
      months = 6;
      amount = 3294.00;
      planName = 'Rilogram Admin 6-Month Plan';
    } else if (planType === '12') {
      months = 12;
      amount = 5988.00;
      planName = 'Rilogram Admin 12-Month Plan';
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

    const origin = req.headers.get('origin') || 'https://royalegamingg.com';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planName,
              description: `Access to administrative panel, custom payment gateways, and custom user invites for ${months} month(s).`,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: payload.userId,
        planType: planType.toString(),
        months: months.toString(),
      },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
    });

    return NextResponse.json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to initiate checkout session' }, { status: 500 });
  }
}
