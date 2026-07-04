import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import { getSafeJson } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await getSafeJson(req);
    const name = typeof body.name === 'string' ? body.name : '';
    const email = typeof body.email === 'string' ? body.email : '';
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine role - first registered user is super_admin, others are users
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'super_admin' : 'user';

    // Read pending admin and referrer cookies or fallback to oldest active admin
    const pendingAdminSlug = req.cookies.get('pending_admin_slug')?.value;
    const pendingReferrer = req.cookies.get('pending_referrer')?.value;
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




    if (primaryAdmin) {
      linkedAdmins.push(primaryAdmin._id);
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      password: hashedPassword,
      role,
      linkedAdmins,
    });

    await newUser.save();

    // Notify super admins of the new join
    try {
      const { notifySuperAdminsOfJoin } = await import('@/lib/system');
      await notifySuperAdminsOfJoin(newUser);
    } catch (err) {
      console.error('Failed to notify super admins of join:', err);
    }

    // Create a system join message so admins see them in their inbox list immediately
    if (newUser.role === 'user') {
      try {
        if (primaryAdmin) {
          const Message = (await import('@/models/Message')).default;
          const systemMessage = new Message({
            senderId: newUser._id,
            recipientId: primaryAdmin._id,
            chatUserId: newUser._id,
            adminId: primaryAdmin._id,
            content: `${newUser.name} joined support chat`,
            isRead: false,
            isSystem: true,
            systemMessageFor: primaryAdmin._id,
          });
          await systemMessage.save();

          const { chatEmitter } = await import('@/lib/events');
          chatEmitter.emit('message', systemMessage);

          // Send push notification to the linked admin (Web & Mobile Push)
          try {
            const { sendPushNotification } = await import('@/lib/notifications');
            await sendPushNotification(primaryAdmin._id.toString(), 'New User Joined', systemMessage);
          } catch (pushErr) {
            console.error('Error sending registration push notification to admin:', pushErr);
          }

          // Handle referral system message if pending referrer exists
          if (pendingReferrer) {
            try {
              const { handleReferralSystemMessage } = await import('@/lib/referral');
              await handleReferralSystemMessage(newUser._id.toString(), primaryAdmin._id.toString(), pendingReferrer);
            } catch (refErr) {
              console.error('Failed to create referral system message on registration:', refErr);
            }
          }
        }
      } catch (err) {
        console.error('Error creating system join message on registration:', err);
      }
    }

    const token = signToken({ 
      userId: newUser._id.toString(), 
      role: newUser.role,
      passwordHash: newUser.password ? newUser.password.substring(newUser.password.length - 10) : undefined
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
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

    // Clear pending referral/admin cookies
    response.cookies.delete('pending_admin_slug');
    response.cookies.delete('pending_referrer');

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
