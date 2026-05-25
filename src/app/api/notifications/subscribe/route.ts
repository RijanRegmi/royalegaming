import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Retrieve the VAPID public key
export async function GET(req: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID public key not configured' }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
}

// POST: Subscribe or unsubscribe from push notifications
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { subscription, action } = body;

    // Handle Unsubscribe Action
    if (action === 'unsubscribe') {
      if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ error: 'Missing subscription details for unsubscription' }, { status: 400 });
      }

      await PushSubscription.deleteOne({
        userId: payload.userId,
        endpoint: subscription.endpoint,
      });

      return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
    }

    // Handle Subscribe Action
    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    // Upsert subscription
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: payload.userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error: any) {
    console.error('Subscription API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Alternative method to unsubscribe
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint query parameter' }, { status: 400 });
    }

    await PushSubscription.deleteOne({
      userId: payload.userId,
      endpoint: endpoint,
    });

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error: any) {
    console.error('Unsubscription API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
