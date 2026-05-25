import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (payload && payload.userId) {
      await dbConnect();
      await User.findByIdAndUpdate(payload.userId, { $set: { fcmToken: null } });
    }
  } catch (err) {
    console.error('Logout clearing FCM token error:', err);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}
