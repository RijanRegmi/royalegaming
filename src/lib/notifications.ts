import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import admin from './firebaseAdmin';
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
 * Sends a push notification to all devices registered by the recipient (both Web Push and FCM).
 * @param recipientId The user ID of the notification recipient
 * @param senderName The name of the sender
 * @param message The populated message object from Mongoose
 */
export async function sendPushNotification(
  recipientId: string,
  senderName: string,
  message: any
) {
  try {
    await dbConnect();

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

    // 1. Send Mobile Push (FCM)
    const recipientUser = await User.findById(recipientId);
    if (recipientUser && recipientUser.fcmToken && admin.apps.length > 0) {
      const isRecipientAdmin = recipientUser.role === 'admin' || recipientUser.role === 'super_admin';
      const notificationTitle = isRecipientAdmin
        ? `${senderName} sent you a message`
        : senderName;

      const fcmPayload = {
        notification: {
          title: notificationTitle,
          body: bodyText,
        },
        android: {
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            icon: 'ic_notification',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          chatUserId: message.chatUserId?.toString() || '',
          messageId: message._id?.toString() || '',
        },
        token: recipientUser.fcmToken,
      };

      try {
        await admin.messaging().send(fcmPayload);
        console.log(`FCM push notification sent successfully to user ${recipientId}`);
      } catch (err: any) {
        console.error('Error sending FCM push notification:', err);
        // Clear token if invalid or unregistered
        if (
          err.code === 'messaging/registration-token-not-registered' ||
          err.code === 'messaging/invalid-argument'
        ) {
          console.log(`FCM token expired or invalid. Clearing token for user ${recipientId}.`);
          await User.findByIdAndUpdate(recipientId, { $set: { fcmToken: null } });
        }
      }
    }

    // 2. Send Web Push
    if (!vapidPublicKey || !vapidPrivateKey) {
      return;
    }

    // Fetch all active subscriptions for the recipient
    const subscriptions = await PushSubscription.find({ userId: recipientId });
    if (subscriptions.length === 0) {
      return;
    }

    // Determine if the recipient is an admin or super_admin using the user record
    const isRecipientAdmin = recipientUser && (recipientUser.role === 'admin' || recipientUser.role === 'super_admin');

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
