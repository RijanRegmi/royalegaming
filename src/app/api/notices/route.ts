import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notice from '@/models/Notice';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { sendPushNotification } from '@/lib/notifications';

// GET: Fetch notices relevant to the logged-in user
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    let query: any = { isActive: true };

    if (!payload) {
      // Guests/unauthenticated users see notices targeted to "all" only
      query = {
        isActive: true,
        targetRole: 'all',
        targetUserId: { $exists: false }
      };
    } else if (payload.role === 'super_admin') {
      // Super admins see all active notices, and can manage them
      query = {}; // Super admin sees all, even inactive for log viewing
    } else if (payload.role === 'admin') {
      // Admins see notices targeted to "admin" or "all", plus their own targeted notices
      query = {
        isActive: true,
        $or: [
          { targetRole: 'admin' },
          { targetRole: 'all' },
          { targetUserId: payload.userId }
        ]
      };
    } else {
      // Standard players/users see notices targeted to "user" or "all", plus their own targeted ones
      query = {
        isActive: true,
        $or: [
          { targetRole: 'user' },
          { targetRole: 'all' },
          { targetUserId: payload.userId }
        ]
      };
    }

    const notices = await Notice.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name avatar role');

    return NextResponse.json({ success: true, notices });
  } catch (error) {
    console.error('Fetch notices error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new notice (Super Admin only)
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { title, content, type, targetRole, targetUserId } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const newNotice = new Notice({
      title: title.trim(),
      content: content.trim(),
      type: type || 'global',
      targetRole: targetRole || 'all',
      targetUserId: targetUserId || undefined,
      createdBy: payload.userId,
      isActive: true,
    });

    await newNotice.save();

    // Trigger push notifications
    if (targetUserId) {
      // Targeted push notification
      try {
        await sendPushNotification(targetUserId, title.trim(), {
          content: content.trim(),
          isSystem: true,
          chatUserId: targetUserId,
        });
      } catch (err) {
        console.error('Push notification error for target user:', err);
      }
    } else {
      // Broadcast push notifications to users based on role
      const roleFilter = targetRole === 'all' ? {} : { role: targetRole };
      const usersToNotify = await User.find({ ...roleFilter, fcmToken: { $ne: null } }).select('_id');
      
      const notifyPromises = usersToNotify.map(async (u) => {
        try {
          await sendPushNotification(u._id.toString(), title.trim(), {
            content: content.trim(),
            isSystem: true,
            chatUserId: u._id.toString(),
          });
        } catch (err) {
          console.error(`Failed broadcast push to user ${u._id}:`, err);
        }
      });

      // Execute in parallel without blocking the primary HTTP response
      Promise.allSettled(notifyPromises);
    }

    return NextResponse.json({ success: true, notice: newNotice });
  } catch (error) {
    console.error('Create notice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete/Deactivate a notice (Super Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });
    }

    await dbConnect();
    
    // We can delete it from the DB entirely
    const deletedNotice = await Notice.findByIdAndDelete(id);
    if (!deletedNotice) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
