import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Notice from '@/models/Notice';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';
import { sendPushNotification } from '@/lib/notifications';

// PUT: Extend subscription time for an admin (Super Admin only)
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { userId, extendDays, customDate } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminUser = await User.findById(userId);
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin accounts can be extended' }, { status: 400 });
    }

    const now = new Date();
    let newExtendedUntil: Date;

    if (customDate) {
      newExtendedUntil = new Date(customDate);
      if (isNaN(newExtendedUntil.getTime())) {
        return NextResponse.json({ error: 'Invalid custom date format' }, { status: 400 });
      }
    } else if (extendDays) {
      const days = parseInt(extendDays, 10);
      if (isNaN(days) || days <= 0) {
        return NextResponse.json({ error: 'Invalid extend days count' }, { status: 400 });
      }
      
      // Calculate from current expiration or now, whichever is later
      const currentExpiry = adminUser.extendedUntil 
        ? new Date(adminUser.extendedUntil) 
        : new Date(new Date(adminUser.billingStartDate || adminUser.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
        
      const baseDate = currentExpiry > now ? currentExpiry : now;
      newExtendedUntil = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    } else {
      // Default extension is reset billing start to now (which gives 30 fresh days)
      newExtendedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // Update admin user fields
    adminUser.extendedUntil = newExtendedUntil;
    adminUser.billingStartDate = now; // Reset cycle start to today
    adminUser.isFrozen = false;       // Explicitly unfreeze

    await adminUser.save();

    // 1. Deactivate outstanding billing freeze or warning notices
    await Notice.updateMany(
      { targetUserId: userId, type: 'admin_warning' },
      { $set: { isActive: false } }
    );

    // 2. Create a system notification confirming the extension
    const extensionNotice = new Notice({
      title: 'Account Extended',
      content: `Your account has been successfully extended by the Super Admin until ${newExtendedUntil.toLocaleDateString()}.`,
      type: 'system',
      targetUserId: userId,
      targetRole: 'admin',
      isActive: true,
    });
    await extensionNotice.save();

    // 3. Emit freeze live updates to instantly restore layout without page reload
    chatEmitter.emit('user_freeze', {
      userId: userId,
      isFrozen: false,
    });

    // 4. Send push notification to user
    try {
      await sendPushNotification(userId, 'Account Re-activated', {
        content: `Your account subscription has been extended until ${newExtendedUntil.toLocaleDateString()}. Thank you!`,
        isSystem: true,
        chatUserId: userId,
        type: 'notice',
      });
    } catch (err) {
      console.error('Failed to send push notification on extension:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription successfully extended and activated',
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        isFrozen: adminUser.isFrozen,
        billingStartDate: adminUser.billingStartDate,
        extendedUntil: adminUser.extendedUntil,
      }
    });
  } catch (error) {
    console.error('Extend admin time error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
