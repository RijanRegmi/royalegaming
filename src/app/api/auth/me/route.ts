import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { encryptSlug } from '@/lib/crypto';
import { checkAndApplyFreeze } from '@/lib/billing';

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    await dbConnect();
    let user = await User.findById(payload.userId)
      .select('-password')
      .populate('linkedAdmins', 'name username avatar');
      
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 404 });
    }

    // Run dynamic billing freeze check
    user = await checkAndApplyFreeze(user);

    const inviteCode = (user.role === 'admin' || user.role === 'super_admin')
      ? encryptSlug(user.username || user._id.toString())
      : '';

    let adminsList = [...(user.linkedAdmins || [])];
    if (user.role === 'user') {
      const superAdmin = await User.findOne({ role: 'super_admin' }).select('name username avatar');
      if (superAdmin) {
        const hasSuperAdmin = adminsList.some((admin: any) => admin._id.toString() === superAdmin._id.toString());
        if (!hasSuperAdmin) {
          adminsList.push(superAdmin);
        }
      }
    }


    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar || '',
        username: user.username || '',
        inviteCode,
        linkedAdmins: adminsList,
        isFrozen: user.isFrozen || false,
        billingStartDate: user.billingStartDate || null,
        extendedUntil: user.extendedUntil || null,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
