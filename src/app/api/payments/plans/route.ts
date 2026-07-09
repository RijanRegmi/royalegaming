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
  },
  {
    planId: '6',
    name: '6 Month Plan',
    subtitle: 'Save big with half-year cycle extension',
    pricePerMonth: 549,
    months: 6,
    features: ['Full Admin Panel Console', 'Custom Checkout gateways', 'Custom Invite Codes', '24/7 Support Hotline', 'Priority Webhook validation'],
    isPopular: true,
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
  },
];

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    let plans = await SubscriptionPlan.find({}).sort({ months: 1 });

    if (plans.length === 0) {
      // Bootstrap default plans in database
      await SubscriptionPlan.insertMany(DEFAULT_PLANS);
      plans = await SubscriptionPlan.find({}).sort({ months: 1 });
    }

    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch billing plans' }, { status: 500 });
  }
}
