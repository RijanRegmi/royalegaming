import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { messageId, emoji } = await req.json();

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Missing messageId or emoji' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex(
      (r: any) => r.userId.toString() === payload.userId
    );

    if (existingIndex > -1) {
      if (reactions[existingIndex].emoji === emoji) {
        // Toggle off: remove the reaction
        reactions.splice(existingIndex, 1);
      } else {
        // Update reaction to new emoji
        reactions[existingIndex].emoji = emoji;
      }
    } else {
      // Toggle on: add the reaction
      reactions.push({ userId: payload.userId, emoji });
    }

    message.reactions = reactions;
    await message.save();

    // Populate the full message details so that the clients can render sender names, etc.
    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email role avatar')
      .populate('recipientId', 'name email role avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name' }
      });

    // Broadcast the update via the chatEmitter (SSE stream will pick this up)
    chatEmitter.emit('message_update', populatedMessage);

    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error: any) {
    console.error('React to message error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
