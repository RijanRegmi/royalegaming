import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { getSafeQueryParam } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const username = getSafeQueryParam(req, 'username')?.trim().toLowerCase();
    const userId = getSafeQueryParam(req, 'userId')?.trim();

    if (!username) {
      return NextResponse.json({ available: false, error: 'Username parameter is required' }, { status: 400 });
    }

    // Username format check
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json({ available: false, error: 'Invalid format' });
    }

    // Find if username exists
    const query: any = { username };
    if (userId) {
      query._id = { $ne: userId };
    }

    const existingUser = await User.findOne(query);
    return NextResponse.json({ available: !existingUser });
  } catch (error) {
    console.error('Check username error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
