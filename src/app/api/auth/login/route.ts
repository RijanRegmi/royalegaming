import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import { encryptSlug } from '@/lib/crypto';
import { getSafeJson } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await getSafeJson(req);
    const emailOrPhone = typeof body.emailOrPhone === 'string' ? body.emailOrPhone : '';
    const password = typeof body.password === 'string' ? body.password : '';

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
      const pendingReferrer = req.cookies.get('pending_referrer')?.value;
      let triggerReferralAdminId: string | null = null;
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

          // Create a system join message so admins see them in their inbox list immediately
          try {
            const Message = (await import('@/models/Message')).default;
            const systemMessage = new Message({
              senderId: user._id,
              recipientId: admin._id,
              chatUserId: user._id,
              adminId: admin._id,
              content: `${user.name} joined support chat`,
              isRead: false,
              isSystem: true,
              systemMessageFor: admin._id,
            });
            await systemMessage.save();

            const { chatEmitter } = await import('@/lib/events');
            chatEmitter.emit('message', systemMessage);

            // Send push notification to the linked admin (Web & Mobile Push)
            try {
              const { sendPushNotification } = await import('@/lib/notifications');
              await sendPushNotification(admin._id.toString(), 'New User Joined', systemMessage);
            } catch (pushErr) {
              console.error('Error sending login push notification to admin:', pushErr);
            }
          } catch (err) {
            console.error('Error creating system join message on login:', err);
          }

          if (pendingReferrer) {
            triggerReferralAdminId = admin._id.toString();
          }
        }
      }

      if (didUpdate) {
        await user.save();
        if (triggerReferralAdminId && pendingReferrer) {
          try {
            const { handleReferralSystemMessage } = await import('@/lib/referral');
            await handleReferralSystemMessage(user._id.toString(), triggerReferralAdminId, pendingReferrer);
          } catch (refErr) {
            console.error('Failed to create referral system message on login:', refErr);
          }
        }
      }
    }

    const token = signToken({ 
      userId: user._id.toString(), 
      role: user.role,
      hasLinkedAdmins: user.role !== 'user' || (user.linkedAdmins && user.linkedAdmins.length > 0),
      passwordHash: user.password ? user.password.substring(user.password.length - 10) : undefined
    });

    const inviteCode = (user.role === 'admin' || user.role === 'super_admin')
      ? encryptSlug(user.username || user._id.toString())
      : '';

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        username: user.username || '',
        inviteCode,
      },
    });

    // Set cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Clear pending referral/admin cookies
    response.cookies.delete('pending_admin_slug');
    response.cookies.delete('pending_referrer');

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
