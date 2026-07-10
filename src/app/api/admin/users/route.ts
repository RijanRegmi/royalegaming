import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Message from '@/models/Message';
import Notice from '@/models/Notice';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';
import { sendPushNotification } from '@/lib/notifications';

// GET: Fetch list of users for admin sidebar
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let queryUsers: any = {};
    const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('_id email phone');
    const primarySuperAdminId = primarySuperAdmin ? primarySuperAdmin._id : null;

    if (payload.role === 'super_admin') {
      const chatUserIds = primarySuperAdminId
        ? await Message.find({ adminId: primarySuperAdminId }).distinct('chatUserId')
        : [];

      // Super admin sees all admins, plus other super admins, plus players with no linked admins, plus players who have messaged the unified support chat
      queryUsers = {
        $or: [
          { role: 'admin' },
          { role: 'super_admin' },
          { role: 'user', $or: [ { linkedAdmins: { $size: 0 } }, { linkedAdmins: { $exists: false } } ] },
          { _id: { $in: chatUserIds } }
        ]
      };
    } else {
      const currentAdmin = await User.findById(payload.userId);
      if (currentAdmin?.isFrozen) {
        // Frozen admin can only message/see the unified support chat
        queryUsers = primarySuperAdminId ? { _id: primarySuperAdminId } : { role: 'super_admin' };
      } else {
        // Standard admin sees players linked to them, plus the unified support chat (primary super admin)
        queryUsers = {
          $or: [
            { role: 'user', linkedAdmins: payload.userId }
          ]
        };
        if (primarySuperAdminId) {
          queryUsers.$or.push({ _id: primarySuperAdminId });
        } else {
          queryUsers.$or.push({ role: 'super_admin' });
        }
      }
    }

    const users = await User.find(queryUsers).select('-password');

    const adminUserId = new mongoose.Types.ObjectId(payload.userId);
    const primarySuperAdminObj = primarySuperAdminId ? new mongoose.Types.ObjectId(primarySuperAdminId.toString()) : null;

    const isSuperAdmin = payload.role === 'super_admin';
    const matchConditions: any[] = [
      { adminId: adminUserId },
      // Direct message between admin and super_admin
      { senderId: adminUserId, recipientId: { $exists: true } },
      { recipientId: adminUserId, senderId: { $exists: true } }
    ];

    if (primarySuperAdminObj) {
      if (isSuperAdmin) {
        matchConditions.push({ adminId: primarySuperAdminObj });
      } else {
        matchConditions.push({ adminId: primarySuperAdminObj, chatUserId: adminUserId });
      }
    }

    // 1. Fetch latest messages for each conversation partner in a single aggregation query
    const latestMessages = await Message.aggregate([
      {
        $match: {
          deletedFor: { $ne: adminUserId },
          $or: matchConditions,
          $and: [
            {
              $or: [
                { systemMessageFor: { $exists: false } },
                { systemMessageFor: null },
                { systemMessageFor: adminUserId }
              ]
            },
            {
              $or: [
                { isSystem: { $ne: true } },
                { content: { $not: /joined|connected/i } }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          conversationUserId: {
            $cond: {
              if: { $eq: ['$adminId', primarySuperAdminObj] },
              then: {
                $cond: {
                  if: { $in: [payload.role, ['super_admin']] },
                  then: '$chatUserId',
                  else: primarySuperAdminObj
                }
              },
              else: {
                $cond: {
                  if: { $eq: ['$chatUserId', adminUserId] },
                  then: '$senderId',
                  else: '$chatUserId'
                }
              }
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationUserId',
          latestMsg: { $first: '$$ROOT' }
        }
      }
    ]);

    // 2. Fetch unread counts for each conversation partner in a single aggregation query
    const unreadMatchConditions = [...matchConditions, { recipientId: adminUserId }];
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          isRead: false,
          senderId: { $ne: adminUserId },
          deletedFor: { $ne: adminUserId },
          $and: [
            {
              $or: unreadMatchConditions
            },
            {
              $or: [
                { recipientId: adminUserId },
                { $expr: { $eq: ['$senderId', '$chatUserId'] } }
              ]
            },
            {
              $or: [
                { isSystem: { $ne: true } },
                { content: { $not: /joined|connected/i } }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          conversationUserId: {
            $cond: {
              if: { $eq: ['$adminId', primarySuperAdminObj] },
              then: {
                $cond: {
                  if: { $in: [payload.role, ['super_admin']] },
                  then: '$chatUserId',
                  else: primarySuperAdminObj
                }
              },
              else: {
                $cond: {
                  if: { $eq: ['$chatUserId', adminUserId] },
                  then: '$senderId',
                  else: '$chatUserId'
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$conversationUserId',
          unreadCount: { $sum: 1 }
        }
      }
    ]);

    // Extract unique senderIds to populate sender info in one batch query
    const senderIds = latestMessages.map(item => item.latestMsg?.senderId).filter(id => id != null);
    const senders = await User.find({ _id: { $in: senderIds } }).select('name role');
    const senderMap = new Map();
    senders.forEach(sender => {
      senderMap.set(sender._id.toString(), sender);
    });

    // Build map for latest messages
    const latestMessageMap = new Map();
    latestMessages.forEach((item) => {
      const msg = item.latestMsg;
      if (!msg) return;
      const sender = msg.senderId ? senderMap.get(msg.senderId.toString()) : null;
      const isSuperAdminSender = sender && sender.role === 'super_admin';
      const shouldDisguiseSender = isSuperAdminSender && payload.role !== 'super_admin';

      latestMessageMap.set(item._id.toString(), {
        content: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId ? msg.senderId.toString() : null,
        senderName: shouldDisguiseSender ? 'Support Chat' : (sender ? sender.name : 'System'),
        senderRole: sender ? sender.role : 'user',
        fileType: msg.fileType || null,
        isSystem: msg.isSystem || false,
      });
    });

    // Build map for unread counts
    const unreadCountMap = new Map();
    unreadCounts.forEach((item) => {
      unreadCountMap.set(item._id.toString(), item.unreadCount);
    });

    // Map user list with activity details using our in-memory lookup maps
    const usersWithActivity = users.map((user) => {
      const userIdStr = user._id.toString();
      const isSuperAdmin = user.role === 'super_admin';
      const shouldDisguise = isSuperAdmin && payload.role !== 'super_admin';

      const primarySuperAdminEmail = primarySuperAdmin ? primarySuperAdmin.email : 'support@rilogram.com';
      const primarySuperAdminPhone = primarySuperAdmin ? (primarySuperAdmin.phone || '') : '';

      return {
        id: user._id,
        name: shouldDisguise ? 'Support Chat' : user.name,
        email: shouldDisguise ? primarySuperAdminEmail : user.email,
        username: shouldDisguise ? 'support' : (user.username || ''),
        phone: shouldDisguise ? primarySuperAdminPhone : (user.phone || ''),
        avatar: shouldDisguise ? '' : (user.avatar || ''),
        role: user.role,
        isVerified: shouldDisguise ? true : (user.isVerified || false),
        isFrozen: user.isFrozen || false,
        createdAt: user.createdAt,
        lastMessage: latestMessageMap.get(userIdStr) || null,
        unreadCount: unreadCountMap.get(userIdStr) || 0,
        linkedAdmins: user.linkedAdmins || [],
        isManuallyLinked: user.isManuallyLinked || false,
      };
    });

    // Sort by latest message date (users with no messages are sorted by profile creation date at the bottom)
    usersWithActivity.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, users: usersWithActivity });
  } catch (error) {
    console.error('Fetch admin users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update user account (Super Admin only)
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { userId, name, email, phone, role, password, username, isFrozen, isVerified, linkedAdmins, cyclePeriod } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      userToUpdate.name = name.trim();
    }

    // Update email if provided
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
      }
      if (cleanEmail !== userToUpdate.email) {
        const existingEmailUser = await User.findOne({ email: cleanEmail });
        if (existingEmailUser) {
          return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }
        userToUpdate.email = cleanEmail;
      }
    }

    // Update username slug if provided
    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername !== userToUpdate.username) {
        if (cleanUsername) {
          if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
            return NextResponse.json({ error: 'Username must contain only letters, numbers, hyphens, and underscores' }, { status: 400 });
          }
          const existingUsername = await User.findOne({ username: cleanUsername });
          if (existingUsername) {
            return NextResponse.json({ error: 'Username slug is already taken' }, { status: 409 });
          }
          userToUpdate.username = cleanUsername;
        } else {
          userToUpdate.username = undefined;
        }
      }
    }

    // Update phone if provided
    if (phone !== undefined) {
      userToUpdate.phone = phone.trim();
    }

    let hasFrozenChanged = false;
    let hasRoleChanged = false;

    // Update role if provided
    if (role !== undefined) {
      if (!['user', 'admin', 'super_admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      // Prevent changing own role (super admin demoting self)
      if (userId === payload.userId && role !== userToUpdate.role) {
        return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 400 });
      }
      if (role !== userToUpdate.role) {
        hasRoleChanged = true;
      }

      // If promoting to admin, require username slug and cyclePeriod
      if (role === 'admin' && userToUpdate.role !== 'admin') {
        if (!username) {
          return NextResponse.json({ error: 'Username slug is required when promoting a user to Admin' }, { status: 400 });
        }
        if (!cyclePeriod) {
          return NextResponse.json({ error: 'Billing cycle period is required when promoting a user to Admin' }, { status: 400 });
        }

        const cleanUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
          return NextResponse.json({ error: 'Username must contain only letters, numbers, hyphens, and underscores' }, { status: 400 });
        }
        const existingUsername = await User.findOne({ username: cleanUsername });
        if (existingUsername && existingUsername._id.toString() !== userId) {
          return NextResponse.json({ error: 'Username slug is already taken' }, { status: 409 });
        }

        const days = parseInt(cyclePeriod, 10);
        if (isNaN(days) || days <= 0) {
          return NextResponse.json({ error: 'Invalid cycle period' }, { status: 400 });
        }

        userToUpdate.username = cleanUsername;
        userToUpdate.billingStartDate = new Date();
        userToUpdate.extendedUntil = new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000);
        
        if (userToUpdate.isFrozen) {
          userToUpdate.isFrozen = false;
          hasFrozenChanged = true;
        }
      }

      userToUpdate.role = role;
      if (role === 'super_admin' && userToUpdate.isFrozen) {
        userToUpdate.isFrozen = false;
        hasFrozenChanged = true;
      }
    }

    // Update password if provided
    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
      userToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Update isFrozen if provided
    if (isFrozen !== undefined && isFrozen !== userToUpdate.isFrozen) {
      if (isFrozen === true && userToUpdate.role === 'super_admin') {
        return NextResponse.json({ error: 'Super Admin accounts cannot be frozen' }, { status: 400 });
      }
      if (isFrozen === false && userToUpdate.role === 'admin') {
        // Validate cycle has not ended
        const billingStart = userToUpdate.billingStartDate ? new Date(userToUpdate.billingStartDate) : new Date(userToUpdate.createdAt);
        const deadline = new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
        let effectiveDeadline = deadline;
        if (userToUpdate.extendedUntil && new Date(userToUpdate.extendedUntil) > deadline) {
          effectiveDeadline = new Date(userToUpdate.extendedUntil);
        }
        if (new Date() > effectiveDeadline) {
          return NextResponse.json({ 
            error: 'Cannot unfreeze: The billing cycle has ended. Please extend the subscription cycle period instead.' 
          }, { status: 400 });
        }
      }
      hasFrozenChanged = true;
      if (isFrozen === true) {
        try {
          // 1. Create persistent targeted Notice for account freeze
          await Notice.findOneAndUpdate(
            { targetUserId: userId, type: 'admin_warning', title: 'Account Frozen' },
            {
              title: 'Account Frozen',
              content: 'Your account has been frozen by the Super Admin due to outstanding payments. Please contact support.',
              type: 'admin_warning',
              targetUserId: userId,
              targetRole: userToUpdate.role === 'admin' ? 'admin' : 'user',
              isActive: true,
            },
            { upsert: true, new: true }
          );

          // 2. Send push notification for the Notice
          await sendPushNotification(userId, 'Account Frozen', {
            content: 'Your account has been frozen by the Super Admin due to outstanding payments. Please contact support.',
            isSystem: true,
            chatUserId: userId,
            type: 'notice',
          });

          // Deactivate any active unfreeze notices to avoid clutter
          await Notice.updateMany(
            { targetUserId: userId, title: { $in: ['Account Unfrozen', 'Subscription Activated'] } },
            { $set: { isActive: false } }
          );
        } catch (msgError) {
          console.error('Error auto-sending freeze notification message:', msgError);
        }
      } else {
        try {
          // 1. Deactivate outstanding billing freeze or warning notices
          await Notice.updateMany(
            { targetUserId: userId, type: 'admin_warning', title: 'Account Frozen' },
            { $set: { isActive: false } }
          );

          // 2. Create a system notification confirming the unfreeze
          const unfreezeNotice = new Notice({
            title: 'Subscription Activated',
            content: 'Your subscription has been activated successfully. Welcome back!',
            type: 'system',
            targetUserId: userId,
            targetRole: userToUpdate.role === 'admin' ? 'admin' : 'user',
            isActive: true,
          });
          await unfreezeNotice.save();

          // 3. Send push notification for the Notice
          await sendPushNotification(userId, 'Subscription Activated', {
            content: 'Your subscription has been activated successfully. Welcome back!',
            isSystem: true,
            chatUserId: userId,
            type: 'notice',
          });
        } catch (msgError) {
          console.error('Error auto-sending unfreeze notification message:', msgError);
        }
      }
      userToUpdate.isFrozen = isFrozen;
    }

    // Update isVerified if provided
    if (isVerified !== undefined) {
      userToUpdate.isVerified = isVerified;
    }

    // Update linkedAdmins if provided
    let newlyLinkedAdmins: string[] = [];
    if (linkedAdmins !== undefined) {
      if (Array.isArray(linkedAdmins)) {
        const previousAdmins = (userToUpdate.linkedAdmins || []).map((id: any) => id.toString());
        const targetAdmins = linkedAdmins.map((id: any) => id.toString());
        userToUpdate.linkedAdmins = linkedAdmins;
        newlyLinkedAdmins = targetAdmins.filter((id: string) => !previousAdmins.includes(id));
        if (newlyLinkedAdmins.length > 0) {
          userToUpdate.isManuallyLinked = true;
        }
      }
    }

    await userToUpdate.save();

    if (hasFrozenChanged) {
      chatEmitter.emit('user_freeze', { 
        userId: userToUpdate._id.toString(), 
        isFrozen: userToUpdate.isFrozen || false 
      });
    }

    if (hasRoleChanged) {
      chatEmitter.emit('user_role', { 
        userId: userToUpdate._id.toString(), 
        role: userToUpdate.role 
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        username: userToUpdate.username || '',
        phone: userToUpdate.phone || '',
        role: userToUpdate.role,
        isFrozen: userToUpdate.isFrozen || false,
        isVerified: userToUpdate.isVerified || false,
        createdAt: userToUpdate.createdAt,
        linkedAdmins: userToUpdate.linkedAdmins || [],
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new administrator/user account directly (Super Admin only)
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { name, email, phone, password, role, username, cyclePeriod } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Determine target role (default to admin)
    const targetRole = role && ['admin', 'super_admin', 'user'].includes(role) ? role : 'admin';

    if (targetRole === 'admin') {
      if (!username) {
        return NextResponse.json({ error: 'Username slug is required for admin accounts' }, { status: 400 });
      }
      if (!cyclePeriod) {
        return NextResponse.json({ error: 'Billing cycle period is required for admin accounts' }, { status: 400 });
      }
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Validate username slug if provided
    let cleanUsername = undefined;
    if (username) {
      cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
        return NextResponse.json({ error: 'Username must contain only letters, numbers, hyphens, and underscores' }, { status: 400 });
      }
      const existingUsername = await User.findOne({ username: cleanUsername });
      if (existingUsername) {
        return NextResponse.json({ error: 'Username slug is already taken' }, { status: 409 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine cycle end date if admin
    let billingStart = undefined;
    let extendedUntil = undefined;
    if (targetRole === 'admin') {
      const days = parseInt(cyclePeriod, 10);
      if (isNaN(days) || days <= 0) {
        return NextResponse.json({ error: 'Invalid cycle period' }, { status: 400 });
      }
      billingStart = new Date();
      extendedUntil = new Date(billingStart.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      phone: phone ? phone.trim() : '',
      password: hashedPassword,
      role: targetRole,
      billingStartDate: billingStart,
      extendedUntil: extendedUntil,
      isFrozen: false,
    });

    await newUser.save();

    // Notify super admins of the new join
    try {
      const { notifySuperAdminsOfJoin } = await import('@/lib/system');
      await notifySuperAdminsOfJoin(newUser);
    } catch (err) {
      console.error('Failed to notify super admins of join:', err);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username || '',
        phone: newUser.phone,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete user account (Super Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent deleting oneself
    if (userId === payload.userId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    await dbConnect();

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // Delete associated messages
    await Message.deleteMany({ chatUserId: userId });

    return NextResponse.json({
      success: true,
      message: 'User account and associated data deleted successfully.',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
