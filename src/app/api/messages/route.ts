import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';

// GET: Fetch messages for a conversation
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    
    let chatUserId = '';

    if (payload.role === 'user') {
      // Users can only access their own messages
      chatUserId = payload.userId;
    } else {
      // Admins can request messages for a specific user
      const targetUserId = searchParams.get('userId');
      if (!targetUserId) {
        return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
      }
      chatUserId = targetUserId;
    }

    const messages = await Message.find({ chatUserId })
      .populate('senderId', 'name email role avatar')
      .populate('recipientId', 'name email role avatar')
      .sort({ createdAt: 1 });

    // Mark messages as read:
    // If it's the user viewing, mark admin messages in this chat as read.
    // If it's an admin viewing, mark the user's messages as read.
    if (payload.role === 'user') {
      await Message.updateMany(
        { chatUserId, senderId: { $ne: payload.userId }, isRead: false },
        { $set: { isRead: true } }
      );
    } else {
      await Message.updateMany(
        { chatUserId, senderId: chatUserId, isRead: false },
        { $set: { isRead: true } }
      );
    }

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error('Fetch messages error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Send a message
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { content, chatUserId: bodyChatUserId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    let chatUserId = '';
    let recipientId = '';

    if (payload.role === 'user') {
      // Users can only send to admins
      chatUserId = payload.userId;

      // Find the first admin or super_admin to receive the message
      const admin = await User.findOne({ role: { $in: ['super_admin', 'admin'] } }).sort({ createdAt: 1 });
      if (!admin) {
        return NextResponse.json({ error: 'No administrator available to receive messages' }, { status: 503 });
      }
      recipientId = admin._id.toString();
    } else {
      // Admins must specify which user's chat they are replying to
      if (!bodyChatUserId) {
        return NextResponse.json({ error: 'Missing chatUserId' }, { status: 400 });
      }
      chatUserId = bodyChatUserId;
      recipientId = bodyChatUserId; // The user is the recipient
    }

    const newMessage = new Message({
      senderId: payload.userId,
      recipientId,
      chatUserId,
      content,
      isRead: false,
    });

    await newMessage.save();

    // Populate sender info for the SSE broadcast
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email role avatar')
      .populate('recipientId', 'name email role avatar');

    // Broadcast the new message
    chatEmitter.emit('message', populatedMessage);

    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
