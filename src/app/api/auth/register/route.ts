import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { name, email, phone, password } = await req.json();

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

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      password: hashedPassword,
      role,
    });

    await newUser.save();

    // Create a system join message so admins see them in their inbox list immediately
    if (newUser.role === 'user') {
      try {
        const admin = await User.findOne({ role: { $in: ['super_admin', 'admin'] } }).sort({ createdAt: 1 });
        if (admin) {
          const Message = (await import('@/models/Message')).default;
          const systemMessage = new Message({
            senderId: newUser._id,
            recipientId: admin._id,
            chatUserId: newUser._id,
            content: `${newUser.name} joined support chat`,
            isRead: false,
            isSystem: true,
          });
          await systemMessage.save();

          const { chatEmitter } = await import('@/lib/events');
          chatEmitter.emit('message', systemMessage);

          // Send push notification to all administrators (Web & Mobile Push)
          try {
            const { sendPushNotification } = await import('@/lib/notifications');
            const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });
            const notificationPromises = admins.map((adminUser) =>
              sendPushNotification(adminUser._id.toString(), 'New User Joined', systemMessage)
            );
            await Promise.allSettled(notificationPromises);
          } catch (pushErr) {
            console.error('Error sending registration push notification to admins:', pushErr);
          }
        }
      } catch (err) {
        console.error('Error creating system join message on registration:', err);
      }
    }

    // Create session token
    const token = signToken({ userId: newUser._id.toString(), role: newUser.role });

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

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
