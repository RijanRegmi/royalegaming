import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return NextResponse.json({ error: 'User with this email not found' }, { status: 404 });
    }

    if (!user.resetCode || user.resetCode !== code.trim()) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (!user.resetCodeExpires || new Date() > user.resetCodeExpires) {
      return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Code verified successfully',
    });
  } catch (error: any) {
    console.error('Verify reset code error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
