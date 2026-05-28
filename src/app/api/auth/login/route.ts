import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { emailOrPhone, password } = await req.json();

    if (!emailOrPhone || !password) {
      return NextResponse.json({ error: 'Email/Phone and password are required' }, { status: 400 });
    }

    const cleanIdentifier = emailOrPhone.trim();

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { phone: cleanIdentifier }
      ]
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Link user to pending admin or fallback admin
    if (user.role === 'user') {
      const pendingAdminSlug = req.cookies.get('pending_admin_slug')?.value;
      let didUpdate = false;
      user.linkedAdmins = user.linkedAdmins || [];

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
        const admin = await User.findOne(adminQuery);
        if (admin && !user.linkedAdmins.map((id: any) => id.toString()).includes(admin._id.toString())) {
          user.linkedAdmins.push(admin._id);
          didUpdate = true;
        }
      }

      if (user.linkedAdmins.length === 0) {
        const defaultAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
        if (defaultAdmin) {
          user.linkedAdmins.push(defaultAdmin._id);
          didUpdate = true;
        } else {
          const superAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 });
          if (superAdmin) {
            user.linkedAdmins.push(superAdmin._id);
            didUpdate = true;
          }
        }
      }

      if (didUpdate) {
        await user.save();
      }
    }

    // Create session token
    const token = signToken({ userId: user._id.toString(), role: user.role });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
