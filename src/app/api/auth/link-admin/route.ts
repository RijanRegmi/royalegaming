import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { adminSlug } = await req.json();

    if (!adminSlug) {
      return NextResponse.json({ error: 'Admin slug is required' }, { status: 400 });
    }

    const cleanSlug = adminSlug.trim().toLowerCase();

    // Find the admin
    const admin = await User.findOne({ 
      username: cleanSlug, 
      role: { $in: ['admin', 'super_admin'] } 
    });

    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    const payload = getUserFromRequest(req);
    const response = NextResponse.json({ 
      success: true, 
      admin: {
        id: admin._id,
        name: admin.name,
        username: admin.username,
        avatar: admin.avatar || '',
      }
    });

    // Set cookie to remember the admin association (valid for 30 days)
    response.cookies.set('pending_admin_slug', admin.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // If user is logged in, link immediately in the database
    if (payload && payload.userId) {
      await User.findByIdAndUpdate(payload.userId, {
        $addToSet: { linkedAdmins: admin._id }
      });
    }

    return response;
  } catch (error) {
    console.error('Link admin error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
