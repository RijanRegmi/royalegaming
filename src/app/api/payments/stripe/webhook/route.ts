import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Notice from '@/models/Notice';
import { chatEmitter } from '@/lib/events';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_to_avoid_build_error_if_not_present');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      throw new Error('Missing stripe-signature or webhook secret configuration');
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 });
  }

  let userId: string | undefined;
  let months: number | undefined;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    userId = session.metadata?.userId;
    months = session.metadata?.months ? parseInt(session.metadata.months, 10) : undefined;
  } else if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    userId = paymentIntent.metadata?.userId;
    months = paymentIntent.metadata?.months ? parseInt(paymentIntent.metadata.months, 10) : undefined;
  }

  if (userId && months) {
    try {
      await dbConnect();

      const user = await User.findById(userId);
      if (user) {
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

        console.log(`[Stripe Webhook] [${event.type}] Successfully upgraded/extended user ${userId} to admin for ${months} months. ExtendedUntil: ${newExtendedUntil.toISOString()}`);
      } else {
        console.error(`[Stripe Webhook] User ${userId} not found in database.`);
      }
    } catch (dbErr) {
      console.error('[Stripe Webhook] Database update failed:', dbErr);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
