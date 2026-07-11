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
    const paymentIntentId = searchParams.get('payment_intent_id') || (sessionId?.startsWith('pi_') ? sessionId : null);
    const setupIntentId = searchParams.get('setup_intent_id') || (sessionId?.startsWith('seti_') ? sessionId : null);

    const txId = paymentIntentId || setupIntentId || sessionId;
    if (!txId) {
      return NextResponse.json({ error: 'Missing session_id, payment_intent_id or setup_intent_id' }, { status: 400 });
    }

    await dbConnect();

    let isPaid = false;
    let targetUserId = '';
    let months = 1;
    let verificationMonths = 0;
    let paymentMethodToSave: string | null = null;

    if (setupIntentId) {
      // Verify via SetupIntent ($0 trial/special card collection)
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      if (!setupIntent) {
        return NextResponse.json({ error: 'Setup Intent not found' }, { status: 404 });
      }
      isPaid = setupIntent.status === 'succeeded';
      targetUserId = setupIntent.metadata?.userId || '';
      months = parseInt(setupIntent.metadata?.months || '1', 10);
      verificationMonths = parseInt(setupIntent.metadata?.verificationMonths || '0', 10);
      
      if (setupIntent.payment_method) {
        paymentMethodToSave = typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;
      }
    } else if (paymentIntentId) {
      // Verify via PaymentIntent
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (!intent) {
        return NextResponse.json({ error: 'Payment Intent not found' }, { status: 404 });
      }
      isPaid = intent.status === 'succeeded';
      targetUserId = intent.metadata?.userId || '';
      months = parseInt(intent.metadata?.months || '1', 10);
      verificationMonths = parseInt(intent.metadata?.verificationMonths || '0', 10);
      
      const shouldSaveCard = intent.metadata?.saveCard === 'true';
      if (shouldSaveCard && intent.payment_method) {
        paymentMethodToSave = typeof intent.payment_method === 'string' 
          ? intent.payment_method 
          : intent.payment_method.id;
      }
    } else {
      // Verify via Checkout Session
      const session = await stripe.checkout.sessions.retrieve(sessionId!);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const isFreeSetup = session.metadata?.isFreeSetup === 'true';
      if (isFreeSetup) {
        isPaid = session.status === 'complete';
      } else {
        isPaid = session.payment_status === 'paid';
      }
      targetUserId = session.metadata?.userId || '';
      months = parseInt(session.metadata?.months || '1', 10);
      verificationMonths = parseInt(session.metadata?.verificationMonths || '0', 10);
    }

    if (!isPaid) {
      return NextResponse.json({ success: false, message: 'Transaction not completed yet' });
    }

    if (targetUserId !== payload.userId) {
      return NextResponse.json({ error: 'Session user mismatch' }, { status: 403 });
    }

    // Apply upgrade/extension logic
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent double verification / replay attacks
    if (user.processedPayments && user.processedPayments.includes(txId)) {
      return NextResponse.json({
        success: true,
        message: 'Transaction already processed and applied successfully.',
        user: {
          role: user.role,
          isFrozen: user.isFrozen,
          extendedUntil: user.extendedUntil,
        }
      });
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

    // Apply verification badge update if requested
    if (verificationMonths > 0) {
      user.isVerified = true;
      const vDate = user.verifiedUntil && new Date(user.verifiedUntil) > now 
        ? new Date(user.verifiedUntil) 
        : now;
      user.verifiedUntil = new Date(vDate.getTime() + verificationMonths * 30 * 24 * 60 * 60 * 1000);
    }

    // Save card info details to profile if requested
    if (paymentMethodToSave) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodToSave);
        if (pm && pm.card) {
          user.stripePaymentMethodId = paymentMethodToSave;
          user.stripeCardBrand = pm.card.brand;
          user.stripeCardLast4 = pm.card.last4;
        }
      } catch (pmErr) {
        console.error('[Stripe Verify] Error retrieving/saving payment method details:', pmErr);
      }
    }

    // Clear one-time special discount
    user.specialDiscount = {
      pricePerMonth: null,
      totalPrice: null,
      months: null,
      expiresAt: null,
    };

    if (!user.processedPayments) {
      user.processedPayments = [txId];
    } else if (!user.processedPayments.includes(txId)) {
      user.processedPayments.push(txId);
    }

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
