import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';
import { sendPushNotification } from '@/lib/notifications';
import { getSafeJson, getSafeQueryParam } from '@/lib/security';


// GET: Fetch messages for a conversation
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Check if the current user is frozen
    const currentUserObj = await User.findById(payload.userId);
    if (currentUserObj?.isFrozen) {
      const targetId = payload.role === 'user' 
        ? getSafeQueryParam(req, 'adminId') 
        : getSafeQueryParam(req, 'userId');
        
      if (!targetId) {
        return NextResponse.json({ error: 'Target user is required' }, { status: 400 });
      }
      
      const targetUserObj = await User.findById(targetId);
      if (!targetUserObj || targetUserObj.role !== 'super_admin') {
        return NextResponse.json({ error: 'Your account is frozen. You can only message the Super Admin.' }, { status: 403 });
      }
    }
    
    let chatUserId = '';
    let adminIdStr = '';

    const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('_id email phone');
    const primarySuperAdminId = primarySuperAdmin ? primarySuperAdmin._id.toString() : payload.userId;

    if (payload.role === 'user') {
      // Users can only access their own messages, but must target a specific admin
      chatUserId = payload.userId;
      
      let reqAdminId = getSafeQueryParam(req, 'adminId');
      const userObj = await User.findById(payload.userId);
      if (!reqAdminId) {
        // Fallback: use first linked admin
        if (userObj && userObj.linkedAdmins && userObj.linkedAdmins.length > 0) {
          reqAdminId = userObj.linkedAdmins[0].toString();
        } else {
          reqAdminId = primarySuperAdminId;
        }
      }

      // If the target admin is a super admin, map it to the unified primarySuperAdminId
      if (reqAdminId) {
        const targetAdminObj = await User.findById(reqAdminId);
        if (targetAdminObj && targetAdminObj.role === 'super_admin') {
          reqAdminId = primarySuperAdminId;
        }
      }

      if (!reqAdminId) {
        return NextResponse.json({ error: 'No associated administrator found. Please link with an admin.' }, { status: 400 });
      }

      // Verify player is linked to this admin (allow if target is super_admin)
      if (!userObj || !userObj.linkedAdmins.map((id: any) => id.toString()).includes(reqAdminId)) {
        const targetAdmin = await User.findById(reqAdminId);
        if (!targetAdmin || targetAdmin.role !== 'super_admin') {
          return NextResponse.json({ error: 'You are not linked to this administrator' }, { status: 403 });
        }
      }
      adminIdStr = reqAdminId;
    } else {
      // Admins (or super admin) must specify which user's chat they are viewing
      const targetUserId = getSafeQueryParam(req, 'userId');
      if (!targetUserId) {
        return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
      }

      const targetUser = await User.findById(targetUserId);
      const isTargetSuperAdmin = targetUser && targetUser.role === 'super_admin';
      const isCurrentSuperAdmin = payload.role === 'super_admin';

      if (isCurrentSuperAdmin) {
        if (isTargetSuperAdmin) {
          // Super-to-Super DM: direct routing
          chatUserId = targetUserId;
          adminIdStr = primarySuperAdminId;
        } else {
          // Super admin viewing user/admin's support chat
          chatUserId = targetUserId;
          adminIdStr = primarySuperAdminId;
        }
      } else {
        // Logged-in is standard admin
        if (isTargetSuperAdmin) {
          // Standard admin viewing Support Chat:
          // The standard admin is the "user" in this support conversation!
          chatUserId = payload.userId;
          adminIdStr = primarySuperAdminId;
        } else {
          // Standard admin viewing player
          chatUserId = targetUserId;
          adminIdStr = payload.userId;
        }
      }
    }

    // Determine target user role to distinguish Admin-to-Admin chat based on original target
    const originalTargetId = payload.role === 'user' ? getSafeQueryParam(req, 'adminId') : getSafeQueryParam(req, 'userId');
    const targetUser = originalTargetId ? await User.findById(originalTargetId) : null;
    const isTargetAdmin = targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin');
    const isCurrentAdmin = payload.role === 'admin' || payload.role === 'super_admin';

    // Determine if it is a private DM (Admin-to-Admin DM or Super-to-Super DM)
    const isPrivateDM = isCurrentAdmin && isTargetAdmin && (
      (payload.role === 'admin' && targetUser.role === 'admin') ||
      (payload.role === 'super_admin' && targetUser.role === 'super_admin')
    );

    let query: any = {};
    if (isPrivateDM) {
      // Admin to Admin Direct Message query
      query = {
        deletedFor: { $ne: payload.userId },
        $or: [
          { senderId: payload.userId, recipientId: chatUserId },
          { senderId: chatUserId, recipientId: payload.userId }
        ]
      };
    } else {
      // User support chat thread query: scoped to chatUserId and adminId to retain separate threads
      query = {
        chatUserId,
        adminId: adminIdStr,
        deletedFor: { $ne: payload.userId },
        $or: [
          { systemMessageFor: { $exists: false } },
          { systemMessageFor: null },
          { systemMessageFor: payload.userId }
        ]
      };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email role avatar isVerified')
      .populate('recipientId', 'name email role avatar isVerified')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name' }
      })
      .sort({ createdAt: 1 });

    // Mark messages as read (only if markAsRead query parameter is not false)
    const markAsRead = getSafeQueryParam(req, 'markAsRead') !== 'false';
    if (markAsRead) {
      if (payload.role === 'super_admin') {
        // Super admin viewing user/admin support chat: mark user/admin's messages as read
        await Message.updateMany(
          {
            chatUserId,
            adminId: primarySuperAdminId,
            senderId: chatUserId,
            isRead: false,
            deletedFor: { $ne: payload.userId }
          },
          { $set: { isRead: true } }
        );
      } else {
        // Player or standard admin viewing their chat: mark incoming messages as read
        await Message.updateMany(
          {
            chatUserId,
            adminId: adminIdStr,
            senderId: { $ne: payload.userId },
            isRead: false,
            deletedFor: { $ne: payload.userId }
          },
          { $set: { isRead: true } }
        );
      }
    }

    let sanitizedMessages = messages;
    if (payload.role !== 'super_admin') {
      const primarySuperAdminEmail = primarySuperAdmin ? primarySuperAdmin.email : 'support@rilogram.com';
      const primarySuperAdminPhone = primarySuperAdmin ? (primarySuperAdmin.phone || '') : '';

      sanitizedMessages = messages.map((msg: any) => {
        const msgObj = msg.toObject ? msg.toObject() : msg;
        if (msgObj.senderId && msgObj.senderId.role === 'super_admin') {
          msgObj.senderId = {
            ...msgObj.senderId,
            name: 'Support Chat',
            email: primarySuperAdminEmail,
            phone: primarySuperAdminPhone,
            avatar: '',
            isVerified: true,
          };
        }
        if (msgObj.recipientId && msgObj.recipientId.role === 'super_admin') {
          msgObj.recipientId = {
            ...msgObj.recipientId,
            name: 'Support Chat',
            email: primarySuperAdminEmail,
            phone: primarySuperAdminPhone,
            avatar: '',
            isVerified: true,
          };
        }
        return msgObj;
      });
    }

    return NextResponse.json({ success: true, messages: sanitizedMessages });
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
    const body = await getSafeJson(req);
    const content = typeof body.content === 'string' ? body.content : '';
    const bodyChatUserId = typeof body.chatUserId === 'string' ? body.chatUserId : '';
    const bodyAdminId = typeof body.adminId === 'string' ? body.adminId : '';
    const replyTo = typeof body.replyTo === 'string' ? body.replyTo : undefined;
    const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl : undefined;
    const fileType = typeof body.fileType === 'string' ? body.fileType : undefined;
    const fileName = typeof body.fileName === 'string' ? body.fileName : undefined;
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : undefined;

    if ((!content || !content.trim()) && !fileUrl) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    let chatUserId = '';
    let recipientId = '';
    let adminIdStr = '';

    const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('_id');
    const primarySuperAdminId = primarySuperAdmin ? primarySuperAdmin._id.toString() : payload.userId;

    if (payload.role === 'user') {
      // Users can only send to their linked admins
      chatUserId = payload.userId;

      let reqAdminId = bodyAdminId;
      const userObj = await User.findById(payload.userId);
      if (!reqAdminId) {
        // Fallback: use first linked admin
        if (userObj && userObj.linkedAdmins && userObj.linkedAdmins.length > 0) {
          reqAdminId = userObj.linkedAdmins[0].toString();
        } else {
          reqAdminId = primarySuperAdminId;
        }
      }

      // If the target admin is a super admin, map it to the unified primarySuperAdminId
      if (reqAdminId) {
        const targetAdminObj = await User.findById(reqAdminId);
        if (targetAdminObj && targetAdminObj.role === 'super_admin') {
          reqAdminId = primarySuperAdminId;
        }
      }

      if (!reqAdminId) {
        return NextResponse.json({ error: 'No associated administrator found. Please link with an admin.' }, { status: 400 });
      }

      // Verify link (allow if target is super_admin)
      const targetAdmin = await User.findById(reqAdminId);
      const isTargetSuperAdmin = targetAdmin && targetAdmin.role === 'super_admin';

      if (!isTargetSuperAdmin) {
        if (!userObj || !userObj.linkedAdmins.map((id: any) => id.toString()).includes(reqAdminId)) {
          return NextResponse.json({ error: 'You are not linked to this administrator' }, { status: 403 });
        }
        if (userObj && userObj.isManuallyLinked) {
          return NextResponse.json({ error: 'Messaging this administrator is disabled.' }, { status: 403 });
        }
      }

      recipientId = reqAdminId;
      adminIdStr = reqAdminId;
    } else {
      // Admins/Super Admins must specify which user's chat they are replying to
      if (!bodyChatUserId) {
        return NextResponse.json({ error: 'Missing chatUserId' }, { status: 400 });
      }
      chatUserId = bodyChatUserId;
      recipientId = bodyChatUserId;

      const targetUser = await User.findById(chatUserId);
      const isTargetSuperAdmin = targetUser && targetUser.role === 'super_admin';
      const isCurrentSuperAdmin = payload.role === 'super_admin';

      if (isCurrentSuperAdmin) {
        // Super admin sending support message or DM
        adminIdStr = primarySuperAdminId;
      } else {
        // Logged-in is standard admin
        if (isTargetSuperAdmin) {
          // Standard admin to Super Admin: unified support chat
          chatUserId = payload.userId;
          recipientId = primarySuperAdminId;
          adminIdStr = primarySuperAdminId;
        } else {
          // Standard admin to player
          // Verify standard admin is linked to this player
          if (!targetUser || !targetUser.linkedAdmins.map((id: any) => id.toString()).includes(payload.userId)) {
            return NextResponse.json({ error: 'This user is not linked to you' }, { status: 403 });
          }
          adminIdStr = payload.userId;
        }
      }
    }

    // Check if the current user is frozen
    const currentUserObj = await User.findById(payload.userId);
    if (currentUserObj?.isFrozen) {
      const recipientUser = await User.findById(recipientId);
      if (!recipientUser || recipientUser.role !== 'super_admin') {
        return NextResponse.json({ error: 'Your account is frozen. You can only message the Super Admin.' }, { status: 403 });
      }
    }

    const newMessage = new Message({
      senderId: payload.userId,
      recipientId,
      chatUserId,
      adminId: adminIdStr,
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
      .populate('senderId', 'name email role avatar isVerified')
      .populate('recipientId', 'name email role avatar isVerified')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name' }
      });

    // Broadcast the new message
    chatEmitter.emit('message', populatedMessage);

    // Send push notification to the specific recipient (non-blocking for immediate sender response)
    const senderName = (populatedMessage.senderId as any)?.name || 'Support Chat';
    sendPushNotification(recipientId, senderName, populatedMessage).catch((err) => {
      console.error('Error sending push notification:', err);
    });

    let sanitizedMsg = populatedMessage.toObject ? populatedMessage.toObject() : populatedMessage;
    if (payload.role !== 'super_admin') {
      if (sanitizedMsg.senderId && sanitizedMsg.senderId.role === 'super_admin') {
        sanitizedMsg.senderId = {
          ...sanitizedMsg.senderId,
          name: 'Support Chat',
          email: 'support@rilogram.com',
          avatar: '',
          isVerified: true,
        };
      }
      if (sanitizedMsg.recipientId && sanitizedMsg.recipientId.role === 'super_admin') {
        sanitizedMsg.recipientId = {
          ...sanitizedMsg.recipientId,
          name: 'Support Chat',
          email: 'support@rilogram.com',
          avatar: '',
          isVerified: true,
        };
      }
    }

    return NextResponse.json({ success: true, message: sanitizedMsg });
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
        .populate('senderId', 'name email role avatar isVerified')
        .populate('recipientId', 'name email role avatar isVerified');

      // Broadcast update
      chatEmitter.emit('message_update', updatedMessage);

      return NextResponse.json({ success: true, messageId });
    } else {
      // Clear the whole chat
      let chatUserId = '';
      let adminIdStr = '';

      if (payload.role === 'user') {
        // Users can only delete their own chat
        chatUserId = payload.userId;
        adminIdStr = searchParams.get('adminId') || '';
      } else {
        // Admins can specify which user's chat to delete
        const targetUserId = searchParams.get('userId');
        if (!targetUserId) {
          return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
        }
        chatUserId = targetUserId;
        if (payload.role === 'admin') {
          adminIdStr = payload.userId;
        } else {
          adminIdStr = searchParams.get('adminId') || '';
        }
      }

      // Soft delete all messages in the chat for this user under this admin
      const deleteQuery: any = { chatUserId };
      if (adminIdStr) {
        deleteQuery.adminId = adminIdStr;
      }

      await Message.updateMany(
        deleteQuery,
        { $addToSet: { deletedFor: payload.userId } }
      );

      // Insert system trace message specifically for this user
      const systemMessage = new Message({
        senderId: payload.userId,
        recipientId: chatUserId,
        chatUserId,
        adminId: adminIdStr || undefined,
        content: payload.role === 'user' ? 'Chat history cleared.' : 'Chat history cleared by admin.',
        isSystem: true,
        isRead: true,
        systemMessageFor: payload.userId,
      });
      await systemMessage.save();

      const populatedSystemMsg = await Message.findById(systemMessage._id)
        .populate('senderId', 'name email role avatar isVerified')
        .populate('recipientId', 'name email role avatar isVerified');

      // Broadcast clear chat event with system trace message
      chatEmitter.emit('message_update', {
        chatUserId,
        adminId: adminIdStr,
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
