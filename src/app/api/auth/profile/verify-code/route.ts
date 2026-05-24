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

    await dbConnect();
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.resetCode || user.resetCode !== code.trim()) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (!user.resetCodeExpires || new Date() > user.resetCodeExpires) {
      return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Code verified successfully.',
    });
  } catch (error: any) {
    console.error('Verify profile reset code error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
