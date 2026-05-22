import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Fetch all profiles
    const profiles = await User.find({}).select('-password').sort({ createdAt: -1 });

    return NextResponse.json({ success: true, profiles });
  } catch (error) {
    console.error('Fetch all profiles error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
