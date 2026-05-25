import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';
import { sendPushNotification } from '@/lib/notifications';


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

    const messages = await Message.find({
      chatUserId,
      deletedFor: { $ne: payload.userId },
      $or: [
        { systemMessageFor: { $exists: false } },
        { systemMessageFor: null },
        { systemMessageFor: payload.userId }
      ]
    })
      .populate('senderId', 'name email role avatar')
      .populate('recipientId', 'name email role avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name' }
      })
      .sort({ createdAt: 1 });

    // Mark messages as read:
    // If it's the user viewing, mark admin messages in this chat as read.
    // If it's an admin viewing, mark the user's messages as read.
    if (payload.role === 'user') {
      await Message.updateMany(
        { chatUserId, senderId: { $ne: payload.userId }, isRead: false, deletedFor: { $ne: payload.userId } },
        { $set: { isRead: true } }
      );
    } else {
      await Message.updateMany(
        { chatUserId, senderId: chatUserId, isRead: false, deletedFor: { $ne: payload.userId } },
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
    const { content, chatUserId: bodyChatUserId, replyTo, fileUrl, fileType, fileName, fileSize } = await req.json();

    if ((!content || !content.trim()) && !fileUrl) {
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
      content: content ? content.trim() : '',
      isRead: false,
      replyTo: replyTo || null,
      fileUrl: fileUrl || undefined,
      fileType: fileType || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
    });

    await newMessage.save();

    // Populate sender info for the SSE broadcast
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email role avatar')
      .populate('recipientId', 'name email role avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name' }
      });

    // Broadcast the new message
    chatEmitter.emit('message', populatedMessage);

    // Send push notification to the recipient (non-blocking)
    const senderName = (populatedMessage.senderId as any)?.name || 'Support Chat';
    sendPushNotification(recipientId, senderName, populatedMessage).catch((err) => {
      console.error('Error sending push notification:', err);
    });

    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Unsend a message or clear the entire chat
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (messageId) {
      // Unsend or delete a specific message
      const message = await Message.findById(messageId);
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      const forMe = searchParams.get('forMe') === 'true';

      if (forMe) {
        // Delete only for oneself
        const isParticipant = 
          payload.role === 'admin' || 
          payload.role === 'super_admin' || 
          message.chatUserId.toString() === payload.userId;

        if (!isParticipant) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await Message.updateOne(
          { _id: messageId },
          { $addToSet: { deletedFor: payload.userId } }
        );

        return NextResponse.json({ success: true, messageId, deletedForMe: true });
      }

      // Check permissions for unsend (delete for everyone)
      // Users can only delete their own messages.
      // Admins/Super admins can delete any message.
      const isSender = message.senderId.toString() === payload.userId;
      const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';

      if (!isSender && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Soft delete/unsend the message
      await Message.updateOne(
        { _id: messageId },
        {
          $set: {
            isUnsent: true,
            content: 'This message was unsent.',
            fileUrl: null,
            fileType: null,
            fileName: null,
            fileSize: null,
            duration: null,
            reactions: [],
            replyTo: null
          }
        }
      );

      // Clean up references to this message in replyTo
      await Message.updateMany({ replyTo: messageId }, { $set: { replyTo: null } });

      const updatedMessage = await Message.findById(messageId)
        .populate('senderId', 'name email role avatar')
        .populate('recipientId', 'name email role avatar');

      // Broadcast update
      chatEmitter.emit('message_update', updatedMessage);

      return NextResponse.json({ success: true, messageId });
    } else {
      // Clear the whole chat
      let chatUserId = '';

      if (payload.role === 'user') {
        // Users can only delete their own chat
        chatUserId = payload.userId;
      } else {
        // Admins can specify which user's chat to delete
        const targetUserId = searchParams.get('userId');
        if (!targetUserId) {
          return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
        }
        chatUserId = targetUserId;
      }

      // Soft delete all messages in the chat for this user
      await Message.updateMany(
        { chatUserId },
        { $addToSet: { deletedFor: payload.userId } }
      );

      // Insert system trace message specifically for this user
      const systemMessage = new Message({
        senderId: payload.userId,
        recipientId: chatUserId,
        chatUserId,
        content: payload.role === 'user' ? 'Chat history cleared.' : 'Chat history cleared by admin.',
        isSystem: true,
        isRead: true,
        systemMessageFor: payload.userId,
      });
      await systemMessage.save();

      const populatedSystemMsg = await Message.findById(systemMessage._id)
        .populate('senderId', 'name email role avatar')
        .populate('recipientId', 'name email role avatar');

      // Broadcast clear chat event with system trace message
      chatEmitter.emit('message_update', {
        chatUserId,
        isChatCleared: true,
        clearedByUserId: payload.userId,
        systemMessage: populatedSystemMsg
      });

      return NextResponse.json({ success: true, chatUserId });
    }
  } catch (error: any) {
    console.error('Delete message/chat error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
