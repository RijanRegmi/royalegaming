import User from '@/models/User';
import Message from '@/models/Message';
import { chatEmitter } from './events';
import { sendPushNotification } from './notifications';

export async function notifySuperAdminsOfJoin(newUser: any) {
  try {
    const superAdmins = await User.find({ role: 'super_admin' });
    for (const superAdmin of superAdmins) {
      // Don't notify a super admin about their own registration/joining
      if (newUser._id.toString() === superAdmin._id.toString()) continue;

      const systemMessage = new Message({
        senderId: newUser._id,
        recipientId: superAdmin._id,
        chatUserId: newUser._id,
        adminId: superAdmin._id,
        content: `${newUser.role === 'admin' ? 'Admin' : newUser.role === 'super_admin' ? 'Super Admin' : 'User'} ${newUser.name} joined the platform`,
        isRead: false,
        isSystem: true,
      });
      await systemMessage.save();

      chatEmitter.emit('message', systemMessage);

      // Send push notification in background without blocking
      sendPushNotification(superAdmin._id.toString(), 'New User Joined', systemMessage).catch((pushErr) => {
        console.error('Error sending registration push notification to super admin:', pushErr);
      });
    }
  } catch (err) {
    console.error('Error in notifySuperAdminsOfJoin:', err);
  }
}
