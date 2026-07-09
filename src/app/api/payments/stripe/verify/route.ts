import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Notice from '@/models/Notice';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_to_avoid_build_error_if_not_present');

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    await dbConnect();

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Handle both payment mode and setup mode ($0 plans)
    const isFreeSetup = session.metadata?.isFreeSetup === 'true';

    if (isFreeSetup) {
      // For setup mode, verify setup_intent status
      if (session.status !== 'complete') {
        return NextResponse.json({ success: false, message: 'Card setup not completed yet' });
      }
    } else {
      // For payment mode, verify payment status
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ success: false, message: 'Payment not completed yet' });
      }
    }

    const sessionUserId = session.metadata?.userId;
    const months = parseInt(session.metadata?.months || '1', 10);

    if (sessionUserId !== payload.userId) {
      return NextResponse.json({ error: 'Session user mismatch' }, { status: 403 });
    }

    // Apply upgrade/extension logic
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    let newExtendedUntil: Date;

    // Subscription extension stacking logic:
    if (user.role === 'admin' && user.extendedUntil && new Date(user.extendedUntil) > now) {
      newExtendedUntil = new Date(new Date(user.extendedUntil).getTime() + months * 30 * 24 * 60 * 60 * 1000);
    } else {
      // New upgrade or already expired/frozen cycle: starts immediately from now
      newExtendedUntil = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
      user.billingStartDate = now;
    }

    user.role = 'admin';
    user.cyclePeriod = months;
    user.isFrozen = false;
    user.extendedUntil = newExtendedUntil;

    // Clear one-time special discount
    user.specialDiscount = {
      pricePerMonth: null,
      totalPrice: null,
      months: null,
      expiresAt: null,
    };

    await user.save();

    // Deactivate warning and frozen notices
    await Notice.updateMany(
      { targetUserId: user._id, type: 'admin_warning' },
      { $set: { isActive: false } }
    );

    // Emit live real-time event via SSE to notify all clients instantly
    chatEmitter.emit('user_freeze', {
      userId: user._id.toString(),
      isFrozen: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Account successfully upgraded/extended',
      user: {
        role: user.role,
        isFrozen: user.isFrozen,
        extendedUntil: user.extendedUntil,
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to verify transaction' }, { status: 500 });
  }
}
