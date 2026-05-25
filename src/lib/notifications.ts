import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';
import dbConnect from './mongodb';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:rijanregmi8@gmail.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('Web Push VAPID keys are not configured. Notifications will not be sent.');
}

/**
 * Sends a push notification to all devices registered by the recipient.
 * @param recipientId The user ID of the notification recipient
 * @param senderName The name of the sender
 * @param message The populated message object from Mongoose
 */
export async function sendPushNotification(
  recipientId: string,
  senderName: string,
  message: any
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return;
  }

  try {
    await dbConnect();

    // Fetch all active subscriptions for the recipient
    const subscriptions = await PushSubscription.find({ userId: recipientId });
    if (subscriptions.length === 0) {
      return;
    }

    // Determine content text
    let bodyText = '';
    if (message.isUnsent) {
      bodyText = 'This message was unsent.';
    } else if (message.fileUrl) {
      if (message.fileType === 'image') bodyText = 'Sent an image 📷';
      else if (message.fileType === 'voice') bodyText = 'Sent a voice message 🎙️';
      else if (message.fileType === 'document') bodyText = `Sent a document: ${message.fileName || 'file'} 📄`;
      else bodyText = 'Sent an attachment 📎';
    } else {
      bodyText = message.content || '';
    }

    // Check if recipient is admin/super_admin to build targeted redirect URL
    const isRecipientAdmin =
      message.recipientId &&
      (message.recipientId.role === 'admin' || message.recipientId.role === 'super_admin');

    const redirectUrl = isRecipientAdmin
      ? `/chat?userId=${message.chatUserId}`
      : '/chat';

    // Construct the push payload
    const payload = JSON.stringify({
      title: senderName,
      body: bodyText,
      icon: message.senderId?.avatar || '/games/default-icon.png', // custom icon if available
      badge: '/games/default-badge.png',
      url: redirectUrl,
    });

    // Send to all subscriptions in parallel
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        // If the push service returns 404 or 410, the subscription is expired or invalid.
        // We should remove it from our database.
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`Push subscription expired (Status: ${err.statusCode}). Deleting subscription for user ${recipientId}.`);
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error(`Failed to send push notification to subscription:`, err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
}
