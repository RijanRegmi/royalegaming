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
      .populate('linkedAdmins', 'name username avatar role isVerified');
      
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 404 });
    }

    const tokenPasswordHash = payload.passwordHash;
    const dbPasswordHash = user.password ? user.password.substring(user.password.length - 10) : '';

    if (payload.role !== user.role || (tokenPasswordHash && tokenPasswordHash !== dbPasswordHash)) {
      return NextResponse.json({ authenticated: false, error: 'Session expired' }, { status: 401 });
    }

    // Run dynamic billing freeze check
    user = await checkAndApplyFreeze(user);

    const inviteCode = (user.role === 'admin' || user.role === 'super_admin')
      ? encryptSlug(user.username || user._id.toString())
      : '';

    // Filter out any super_admins from the player's linkedAdmins database list
    let filteredAdmins = (user.linkedAdmins || []).filter((admin: any) => admin.role !== 'super_admin');
    
    if (user.role === 'user') {
      const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('name username avatar role isVerified');
      if (primarySuperAdmin) {
        filteredAdmins.push(primarySuperAdmin);
      }
    }

    // If the account is frozen, only show the Super Admin support chat
    if (user.isFrozen) {
      filteredAdmins = filteredAdmins.filter((admin: any) => admin.role === 'super_admin');
    }

    // Disguise any super_admin in the adminsList as "Support Chat"
    const disguisedAdminsList = filteredAdmins.map((admin: any) => {
      const adminObj = admin.toObject ? admin.toObject() : admin;
      if (adminObj.role === 'super_admin') {
        return {
          ...adminObj,
          name: 'Support Chat',
          username: 'support',
          avatar: '',
          isVerified: true,
        };
      }
      return adminObj;
    });


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
        linkedAdmins: disguisedAdminsList,
        isFrozen: user.isFrozen || false,
        isManuallyLinked: user.isManuallyLinked || false,
        billingStartDate: user.billingStartDate || null,
        extendedUntil: user.extendedUntil || null,
        specialDiscount: user.specialDiscount || null,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
