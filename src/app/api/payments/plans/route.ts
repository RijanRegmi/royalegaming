import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SubscriptionPlan from '@/models/SubscriptionPlan';

const DEFAULT_PLANS = [
  {
    planId: '1',
    name: '1 Month Plan',
    subtitle: 'Perfect for testing administrative tools',
    pricePerMonth: 599,
    months: 1,
    features: ['Full Admin Panel Console', 'Custom Checkout gateways', 'Custom Invite Codes', '24/7 Support Hotline'],
    isPopular: false,
    includesVerification: false,
  },
  {
    planId: '6',
    name: '6 Month Plan',
    subtitle: 'Save big with half-year cycle extension',
    pricePerMonth: 549,
    months: 6,
    features: ['Full Admin Panel Console', 'Custom Checkout gateways', 'Custom Invite Codes', '24/7 Support Hotline', 'Priority Webhook validation'],
    isPopular: true,
    includesVerification: false,
  },
  {
    planId: '12',
    name: '12 Month Plan',
    subtitle: 'Ultimate value for professional managers',
    pricePerMonth: 499,
    months: 12,
    features: [
      'Full Admin Panel Console',
      'Custom Checkout gateways',
      'Custom Invite Codes',
      '24/7 Support Hotline',
      'Premium Hosting Bandwidth',
      'Zero Commission Processing',
    ],
    isPopular: false,
    includesVerification: true, // Default to true for the 12 Month Plan
  },
  // Verification Badge Add-ons
  {
    planId: 'v1',
    name: '1 Month Verification Badge',
    subtitle: 'Obtain a verified account badge for 30 days',
    pricePerMonth: 49,
    months: 1,
    features: [],
    isPopular: false,
    includesVerification: true,
  },
  {
    planId: 'v6',
    name: '6 Month Verification Badge',
    subtitle: 'Obtain a verified account badge for 180 days',
    pricePerMonth: 39,
    months: 6,
    features: [],
    isPopular: false,
    includesVerification: true,
  },
  {
    planId: 'v12',
    name: '12 Month Verification Badge',
    subtitle: 'Obtain a verified account badge for 360 days',
    pricePerMonth: 29,
    months: 12,
    features: [],
    isPopular: false,
    includesVerification: true,
  }
];

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    let plans = await SubscriptionPlan.find({}).sort({ months: 1 });

    // Bootstrap default plans in database if collection is empty
    if (plans.length === 0) {
      await SubscriptionPlan.insertMany(DEFAULT_PLANS);
      plans = await SubscriptionPlan.find({}).sort({ months: 1 });
    } else {
      // If plans exist, check if the verification plans are missing, and bootstrap them too
      const hasVerification = plans.some(p => p.planId.startsWith('v'));
      if (!hasVerification) {
        const verificationDefaults = DEFAULT_PLANS.filter(p => p.planId.startsWith('v'));
        await SubscriptionPlan.insertMany(verificationDefaults);
        plans = await SubscriptionPlan.find({}).sort({ months: 1 });
      }
    }

    const standardPlans = plans.filter(p => ['1', '6', '12'].includes(p.planId));
    const verificationPlans = plans.filter(p => ['v1', 'v6', 'v12'].includes(p.planId));

    return NextResponse.json({ success: true, plans: standardPlans, verificationPlans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch billing plans' }, { status: 500 });
  }
}
