import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Generate a unique identifier for the guest
    const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const guestName = `Guest ${randomId}`;
    const guestEmail = `guest_${randomId.toLowerCase()}@royalegaming.com`;

    // Read pending admin cookie or fallback to oldest active admin
    const pendingAdminSlug = req.cookies.get('pending_admin_slug')?.value;
    let linkedAdmins: any[] = [];
    let primaryAdmin = null;

    if (pendingAdminSlug) {
      const cleanSlug = pendingAdminSlug.toLowerCase();
      const mongoose = (await import('mongoose')).default;
      const adminQuery: any = { role: { $in: ['admin', 'super_admin'] } };
      if (mongoose.Types.ObjectId.isValid(cleanSlug)) {
        adminQuery.$or = [
          { username: cleanSlug },
          { _id: cleanSlug }
        ];
      } else {
        adminQuery.username = cleanSlug;
      }
      primaryAdmin = await User.findOne(adminQuery);
    }

    if (!primaryAdmin) {
      primaryAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    }
    if (!primaryAdmin) {
      primaryAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 });
    }

    if (primaryAdmin) {
      linkedAdmins.push(primaryAdmin._id);
    }

    // Create the guest user
    const guestUser = new User({
      name: guestName,
      email: guestEmail,
      role: 'user',
      avatar: '',
      phone: '',
      linkedAdmins,
    });

    await guestUser.save();

    // Sign the token
    const token = signToken({ userId: guestUser._id.toString(), role: guestUser.role });

    const response = NextResponse.json({
      success: true,
      user: {
        id: guestUser._id,
        name: guestUser.name,
        email: guestUser.email,
        phone: '',
        role: guestUser.role,
        avatar: '',
      },
    });

    // Set cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Guest login handler error:', error);
    return NextResponse.json({ error: 'Failed to initiate guest session' }, { status: 500 });
  }
}
