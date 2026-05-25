import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fcmToken } = await req.json();
    if (fcmToken === undefined) {
      return NextResponse.json({ error: 'fcmToken is required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { fcmToken },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'FCM token updated successfully' });
  } catch (error) {
    console.error('FCM token update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
