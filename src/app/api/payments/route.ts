import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let reqAdminId = searchParams.get('adminId');

    await dbConnect();

    if (!reqAdminId) {
      const user = await User.findById(payload.userId);
      if (user && user.linkedAdmins && user.linkedAdmins.length > 0) {
        reqAdminId = user.linkedAdmins[0].toString();
      }
    }

    if (!reqAdminId) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    const payments = await Payment.find({ isActive: true, adminId: reqAdminId }).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('Fetch public active payments error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
