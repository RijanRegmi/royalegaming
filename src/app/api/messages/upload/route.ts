import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('type') as 'image' | 'voice' | 'document' | null;
    const content = formData.get('content') as string | null;
    const bodyChatUserId = formData.get('chatUserId') as string | null;
    const durationStr = formData.get('duration') as string | null;
    const replyTo = formData.get('replyTo') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file was provided' }, { status: 400 });
    }

    if (!fileType || !['image', 'voice', 'document'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid or missing file type' }, { status: 400 });
    }

    // Determine chat session routing
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
      recipientId = bodyChatUserId;
    }

    const originalName = file.name || 'upload';
    const buffer = Buffer.from(await file.arrayBuffer());
    const duration = durationStr ? parseFloat(durationStr) : undefined;
    
    let fileUrl = '';
    const isCloudinaryConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

    if (isCloudinaryConfigured) {
      try {
        let resourceType: 'image' | 'video' | 'raw' = 'raw';
        if (fileType === 'image') resourceType = 'image';
        else if (fileType === 'voice') resourceType = 'video';
        else if (fileType === 'document') resourceType = 'raw';

        const result = await uploadToCloudinary(buffer, 'chats', resourceType);
        fileUrl = result.secure_url;
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error, falling back to local disk:', cloudinaryError);
        fileUrl = await saveFileLocally(file, buffer, fileType);
      }
    } else {
      fileUrl = await saveFileLocally(file, buffer, fileType);
    }

    // Create the message in database
    const newMessage = new Message({
      senderId: payload.userId,
      recipientId,
      chatUserId,
      content: content?.trim() || '',
      isRead: false,
      fileUrl,
      fileType,
      fileName: originalName,
      fileSize: file.size,
      duration,
      replyTo: replyTo || null,
    });

    await newMessage.save();

    // Populate sender info for the SSE stream
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email role avatar')
      .populate('recipientId', 'name email role avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name' }
      });

    // Broadcast the new message in real-time
    chatEmitter.emit('message', populatedMessage);

    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error: any) {
    console.error('File upload message error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function saveFileLocally(file: File, buffer: Buffer, fileType: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'upload', 'chats');
  if (!fs.existsSync(uploadDir)) {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  }

  const originalName = file.name || 'upload';
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = path.extname(cleanName) || (fileType === 'voice' ? '.webm' : '');
  const baseName = path.basename(cleanName, ext);
  const uniqueName = `${baseName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

  const filePath = path.join(uploadDir, uniqueName);
  await fs.promises.writeFile(filePath, buffer);

  return `/upload/chats/${uniqueName}`;
}
