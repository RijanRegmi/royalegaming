import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest, TokenPayload } from '@/lib/auth';
import { decryptSlug } from '@/lib/crypto';
import { getSafeJson, getSafeQueryParam } from '@/lib/security';

// Type for the admin query used in both GET and POST
interface AdminQuery {
  role: { $in: string[] };
  $or?: Array<{ username?: string; _id?: string }>;
  username?: string;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const adminSlug = getSafeQueryParam(req, 'slug');

    if (!adminSlug) {
      return NextResponse.json({ error: 'Admin slug is required' }, { status: 400 });
    }

    const decryptedSlug = decryptSlug(adminSlug.trim());
    const cleanSlug = decryptedSlug.toLowerCase();

    // Find the admin by username or _id (if valid ObjectId)
    const mongoose = (await import('mongoose')).default;
    const adminQuery: AdminQuery = { role: { $in: ['admin', 'super_admin'] } };
    if (mongoose.Types.ObjectId.isValid(cleanSlug)) {
      adminQuery.$or = [
        { username: cleanSlug },
        { _id: cleanSlug }
      ];
    } else {
      adminQuery.username = cleanSlug;
    }

    const admin = await User.findOne(adminQuery);

    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    const referredBy = getSafeQueryParam(req, 'referredBy');
    let referrerName = '';

    if (referredBy) {
      const referrerQuery: any = {};
      if (mongoose.Types.ObjectId.isValid(referredBy)) {
        referrerQuery.$or = [
          { username: referredBy },
          { _id: referredBy }
        ];
      } else {
        referrerQuery.username = referredBy;
      }
      const referrer = await User.findOne(referrerQuery);
      if (referrer) {
        referrerName = referrer.name || referrer.username || '';
      }
    }

    return NextResponse.json({ 
      success: true, 
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        username: admin.username,
        avatar: admin.avatar || '',
      },
      referrerName
    });
  } catch (error) {
    console.error('Fetch link admin error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await getSafeJson(req);
    const adminSlug = typeof body.adminSlug === 'string' ? body.adminSlug : '';
    const referredBy = typeof body.referredBy === 'string' ? body.referredBy : '';

    if (!adminSlug) {
      return NextResponse.json({ error: 'Admin slug is required' }, { status: 400 });
    }

    const decryptedSlug = decryptSlug(adminSlug.trim());
    const cleanSlug = decryptedSlug.toLowerCase();

    // Find the admin by username or _id (if valid ObjectId)
    const mongoose = (await import('mongoose')).default;
    const adminQuery: AdminQuery = { role: { $in: ['admin', 'super_admin'] } };
    if (mongoose.Types.ObjectId.isValid(cleanSlug)) {
      adminQuery.$or = [
        { username: cleanSlug },
        { _id: cleanSlug }
      ];
    } else {
      adminQuery.username = cleanSlug;
    }

    const admin = await User.findOne(adminQuery);

    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    const payload: TokenPayload | null = getUserFromRequest(req);
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
    response.cookies.set('pending_admin_slug', admin.username || admin._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    if (referredBy) {
      response.cookies.set('pending_referrer', referredBy, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    // If user is logged in, link immediately in the database
    if (payload && payload.userId) {
      const userRecord = await User.findById(payload.userId);
      if (userRecord) {
        const alreadyLinked = userRecord.linkedAdmins?.some((id: any) => id.toString() === admin._id.toString());
        if (!alreadyLinked) {
          // Link admin to the user in DB
          await User.findByIdAndUpdate(payload.userId, {
            $addToSet: { linkedAdmins: admin._id }
          });

          // Retrieve user details for notification (name)
          const userName = userRecord.name || 'A user';

          // Create a system join message so admins see them in their inbox list immediately
          try {
            const Message = (await import('@/models/Message')).default;
            const systemMessage = new Message({
              senderId: payload.userId,
              recipientId: admin._id,
              chatUserId: payload.userId,
              adminId: admin._id,
              content: `${userName} joined support chat`,
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
              console.error('Error sending link-admin push notification to admin:', pushErr);
            }
          } catch (msgErr) {
            console.error('Failed to create system join message in link-admin:', msgErr);
          }

          // Handle referral system message immediately since user is logged in
          if (referredBy) {
            try {
              const { handleReferralSystemMessage } = await import('@/lib/referral');
              await handleReferralSystemMessage(payload.userId, admin._id.toString(), referredBy);
            } catch (refErr) {
              console.error('Failed to create referral system message in link-admin:', refErr);
            }
          }
        }
      }
    }

    return response;
  } catch (error) {
    console.error('Link admin error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
