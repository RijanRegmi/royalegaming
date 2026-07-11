import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Only super admins can customize default subscription prices' }, { status: 401 });
    }

    await dbConnect();
    const { planId, pricePerMonth, includesVerification } = await req.json();

    if (!planId || pricePerMonth === undefined || pricePerMonth === null) {
      return NextResponse.json({ error: 'Missing planId or pricePerMonth' }, { status: 400 });
    }

    const numPrice = parseFloat(pricePerMonth);
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json({ error: 'Invalid price value' }, { status: 400 });
    }

    const updateData: any = { pricePerMonth: numPrice };
    if (includesVerification !== undefined) {
      updateData.includesVerification = !!includesVerification;
    }

    const updatedPlan = await SubscriptionPlan.findOneAndUpdate(
      { planId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (error) {
    console.error('Error updating plan price:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
