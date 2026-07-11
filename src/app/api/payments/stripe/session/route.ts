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

    const { planType, verificationCycle } = await req.json();
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
    } else if (planType === 'verification') {
      planName = 'Verification Badge';
    } else {
      return NextResponse.json({ error: 'Invalid planType specified' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://royalegamingg.com';

    // Retrieve the authorization token from headers or cookies
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies.get('auth_token')?.value;

    let sessionUrl = `${origin}/payment/custom-checkout?planType=${planType}${token ? `&token=${token}` : ''}`;
    if (verificationCycle) {
      sessionUrl += `&verificationCycle=${verificationCycle}`;
    }

    return NextResponse.json({
      success: true,
      sessionUrl,
      sessionId: `pi_temp_${Date.now()}`, // Send placeholder sessionId
    });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to initiate checkout session' }, { status: 500 });
  }
}
