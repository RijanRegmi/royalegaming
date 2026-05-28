import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Message from '@/models/Message';
import { getUserFromRequest } from '@/lib/auth';

// GET: Fetch list of users for admin sidebar
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let queryUsers: any = {};
    if (payload.role === 'super_admin') {
      // Super admin sees all admins
      queryUsers = { role: 'admin' };
    } else {
      // Standard admin sees players linked to them, plus the super admin
      queryUsers = {
        $or: [
          { role: 'user', linkedAdmins: payload.userId },
          { role: 'super_admin' }
        ]
      };
    }

    const users = await User.find(queryUsers).select('-password');

    const adminUserId = new mongoose.Types.ObjectId(payload.userId);

    // 1. Fetch latest messages for each conversation partner in a single aggregation query
    const latestMessages = await Message.aggregate([
      {
        $match: {
          deletedFor: { $ne: adminUserId },
          $or: [
            // User support chat: adminId matches the logged-in admin
            { adminId: adminUserId },
            // Direct message between admin and super_admin
            { senderId: adminUserId, recipientId: { $exists: true } },
            { recipientId: adminUserId, senderId: { $exists: true } }
          ],
          $and: [
            {
              $or: [
                { systemMessageFor: { $exists: false } },
                { systemMessageFor: null },
                { systemMessageFor: adminUserId }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          conversationUserId: {
            $cond: {
              if: { $eq: ['$chatUserId', adminUserId] },
              then: '$senderId',
              else: '$chatUserId'
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
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          isRead: false,
          deletedFor: { $ne: adminUserId },
          $and: [
            {
              $or: [
                { adminId: adminUserId },
                { recipientId: adminUserId }
              ]
            },
            {
              $or: [
                { recipientId: adminUserId },
                { $expr: { $eq: ['$senderId', '$chatUserId'] } }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          conversationUserId: {
            $cond: {
              if: { $eq: ['$chatUserId', adminUserId] },
              then: '$senderId',
              else: '$chatUserId'
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
      latestMessageMap.set(item._id.toString(), {
        content: msg.content,
        createdAt: msg.createdAt,
        senderName: sender ? sender.name : 'System',
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
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        role: user.role,
        createdAt: user.createdAt,
        lastMessage: latestMessageMap.get(userIdStr) || null,
        unreadCount: unreadCountMap.get(userIdStr) || 0,
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
    const { userId, name, email, phone, role, password, username } = await req.json();

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

    // Update role if provided
    if (role !== undefined) {
      if (!['user', 'admin', 'super_admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      // Prevent changing own role (super admin demoting self)
      if (userId === payload.userId && role !== userToUpdate.role) {
        return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 400 });
      }
      userToUpdate.role = role;
    }

    // Update password if provided
    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
      userToUpdate.password = await bcrypt.hash(password, 10);
    }

    await userToUpdate.save();

    return NextResponse.json({
      success: true,
      user: {
        id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        username: userToUpdate.username || '',
        phone: userToUpdate.phone || '',
        role: userToUpdate.role,
        createdAt: userToUpdate.createdAt,
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
    const { name, email, phone, password, role, username } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
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

    // Determine target role (default to admin)
    const targetRole = role && ['admin', 'super_admin', 'user'].includes(role) ? role : 'admin';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      phone: phone ? phone.trim() : '',
      password: hashedPassword,
      role: targetRole,
    });

    await newUser.save();

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
