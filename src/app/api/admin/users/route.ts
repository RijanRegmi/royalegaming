import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

    // Find all users except the currently logged-in admin/super_admin
    const users = await User.find({ _id: { $ne: payload.userId } }).select('-password');

    // For each user, fetch the latest message in their chat thread and unread message count
    const usersWithActivity = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          chatUserId: user._id,
          deletedFor: { $ne: payload.userId },
          $or: [
            { systemMessageFor: { $exists: false } },
            { systemMessageFor: null },
            { systemMessageFor: payload.userId }
          ]
        })
          .sort({ createdAt: -1 })
          .populate('senderId', 'name role');

        const unreadCount = await Message.countDocuments({
          chatUserId: user._id,
          senderId: user._id, // Message was sent by the user to the admin team
          isRead: false,
          deletedFor: { $ne: payload.userId },
        });

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          avatar: user.avatar || '',
          role: user.role,
          createdAt: user.createdAt,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderName: lastMessage.senderId ? lastMessage.senderId.name : 'System',
            senderRole: lastMessage.senderId ? lastMessage.senderId.role : 'user',
            fileType: lastMessage.fileType || null,
          } : null,
          unreadCount,
        };
      })
    );

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

// PUT: Change user roles (Super Admin only)
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'Missing userId or newRole' }, { status: 400 });
    }

    if (!['user', 'admin', 'super_admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent changing own role (super admin demoting self) to prevent locking out
    if (userId === payload.userId) {
      return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 400 });
    }

    userToUpdate.role = newRole;
    await userToUpdate.save();

    return NextResponse.json({
      success: true,
      user: {
        id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        role: userToUpdate.role,
      },
    });
  } catch (error) {
    console.error('Update user role error:', error);
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
    const { name, email, phone, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Determine target role (default to admin)
    const targetRole = role && ['admin', 'super_admin', 'user'].includes(role) ? role : 'admin';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
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
