import Message from '@/models/Message';
import User from '@/models/User';
import { chatEmitter } from '@/lib/events';
import mongoose from 'mongoose';

export async function handleReferralSystemMessage(
  userId: string,
  adminId: string,
  referredBy: string
) {
  try {
    if (!referredBy || !userId || !adminId) return;

    // Find the referrer by ID or username
    const referrerQuery: any = {};
    if (mongoose.Types.ObjectId.isValid(referredBy)) {
      referrerQuery.$or = [
        { username: referredBy },
        { _id: referredBy }
      ];
    } else {
      referrerQuery.username = referredBy;
    }

    const referrer = await User.findOne(referrerQuery);
    if (!referrer) {
      console.log(`Referrer not found for value: ${referredBy}`);
      return;
    }

    // Double check if a system message for this referral already exists
    const referrerName = referrer.username || referrer.name;
    const expectedContent = `${referrerName} referred this user`;
    
    const existingMsg = await Message.findOne({
      chatUserId: userId,
      adminId: adminId,
      isSystem: true,
      content: expectedContent
    });

    if (existingMsg) {
      console.log('Referral system message already exists.');
      return;
    }

    // Create system message
    const systemMsg = new Message({
      senderId: userId,
      recipientId: adminId,
      chatUserId: userId,
      adminId: adminId,
      content: expectedContent,
      isRead: false,
      isSystem: true,
      systemMessageFor: adminId, // restricted only to the admin
    });

    await systemMsg.save();

    const populatedSystemMsg = await Message.findById(systemMsg._id)
      .populate('senderId', 'name email role avatar')
      .populate('recipientId', 'name email role avatar');

    // Broadcast the new message to SSE
    chatEmitter.emit('message', populatedSystemMsg);
    console.log(`Successfully recorded referral notification: ${expectedContent}`);
  } catch (error) {
    console.error('Error in handleReferralSystemMessage:', error);
  }
}
