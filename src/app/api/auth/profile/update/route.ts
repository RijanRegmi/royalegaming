import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { encryptSlug } from '@/lib/crypto';

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { name, phone, username } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.name = name.trim();
    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    // Check for username updates if user is admin or super_admin
    if (username !== undefined && (user.role === 'admin' || user.role === 'super_admin')) {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
        return NextResponse.json({ error: 'Username can only contain alphanumeric characters, underscores, and dashes' }, { status: 400 });
      }

      const existing = await User.findOne({
        username: cleanUsername,
        _id: { $ne: user._id }
      });
      if (existing) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
      }
      user.username = cleanUsername;
    }

    await user.save();

    const inviteCode = (user.role === 'admin' || user.role === 'super_admin')
      ? encryptSlug(user.username || user._id.toString())
      : '';

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar || '',
        username: user.username || '',
        inviteCode,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
