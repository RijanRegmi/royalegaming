import User from '@/models/User';
import Notice from '@/models/Notice';
import { chatEmitter } from '@/lib/events';
import { sendPushNotification } from '@/lib/notifications';

/**
 * Checks a standard admin's billing cycle and automatically updates their freeze/warning status.
 * Evaluates standard 30-day cycle + 3 days grace period.
 * @param user Mongoose user document or plain user object
 */
export async function checkAndApplyFreeze(user: any) {
  if (!user || user.role !== 'admin') {
    return user;
  }

  const now = new Date();
  
  // Calculate billing cycle start
  const billingStart = user.billingStartDate ? new Date(user.billingStartDate) : new Date(user.createdAt);
  
  // 30 days billing period
  const standardDeadline = new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // If Super Admin set an extended date, use that if it extends beyond the standard deadline
  let effectiveDeadline = standardDeadline;
  if (user.extendedUntil && new Date(user.extendedUntil) > standardDeadline) {
    effectiveDeadline = new Date(user.extendedUntil);
  }
  
  // 3 days grace period
  const graceDeadline = new Date(effectiveDeadline.getTime() + 3 * 24 * 60 * 60 * 1000);

  let isFrozen = false;
  let warningMessage: string | null = null;

  if (now > graceDeadline) {
    isFrozen = true;
  } else if (now > effectiveDeadline) {
    const daysRemaining = Math.max(0, Math.ceil((graceDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    warningMessage = `Your billing cycle has ended. You are in a grace period. Your account will be frozen in ${daysRemaining} day(s). Please check your due payments.`;
  } else {
    const msToDeadline = effectiveDeadline.getTime() - now.getTime();
    const daysToDeadline = Math.ceil(msToDeadline / (24 * 60 * 60 * 1000));
    if (daysToDeadline <= 3 && daysToDeadline > 0) {
      warningMessage = `Your account billing cycle ends in ${daysToDeadline} day(s). Please clear your dues soon to avoid service freezing.`;
    }
  }

  // Detect state change or if we need to update
  if (isFrozen !== user.isFrozen) {
    await User.findByIdAndUpdate(user._id, { $set: { isFrozen } });
    user.isFrozen = isFrozen;

    // Emit live event for real-time UI updates
    chatEmitter.emit('user_freeze', { 
      userId: user._id.toString(), 
      isFrozen 
    });

    if (isFrozen) {
      // 1. Create a persistent target notice for account freeze
      await Notice.findOneAndUpdate(
        { targetUserId: user._id, type: 'admin_warning', title: 'Account Frozen' },
        {
          title: 'Account Frozen',
          content: 'Your account is frozen. Please check your due payments.',
          type: 'admin_warning',
          targetUserId: user._id,
          targetRole: 'admin',
          isActive: true,
        },
        { upsert: true, new: true }
      );

      // Deactivate any active billing warnings since they are now frozen
      await Notice.updateMany(
        { targetUserId: user._id, type: 'admin_warning', title: 'Billing Warning' },
        { $set: { isActive: false } }
      );

      // 2. Trigger push notification for FCM
      try {
        await sendPushNotification(user._id.toString(), 'System Billing', {
          content: 'Your account is frozen. Please check your due payments.',
          isSystem: true,
          chatUserId: user._id.toString(),
        });
      } catch (err) {
        console.error('Failed to send push notification on auto-freeze:', err);
      }
    } else {
      // If unfreezing, deactivate the freeze notice
      await Notice.updateMany(
        { targetUserId: user._id, type: 'admin_warning', title: 'Account Frozen' },
        { $set: { isActive: false } }
      );
    }
  }

  // Handle billing warning notices
  if (warningMessage) {
    // Upsert the warning notice
    const existingWarning = await Notice.findOne({ targetUserId: user._id, type: 'admin_warning', title: 'Billing Warning', isActive: true });
    
    if (!existingWarning || existingWarning.content !== warningMessage) {
      await Notice.findOneAndUpdate(
        { targetUserId: user._id, type: 'admin_warning', title: 'Billing Warning' },
        {
          title: 'Billing Warning',
          content: warningMessage,
          type: 'admin_warning',
          targetUserId: user._id,
          targetRole: 'admin',
          isActive: true,
        },
        { upsert: true, new: true }
      );

      // Send push notification for warning reminder if it's new or content changed
      try {
        await sendPushNotification(user._id.toString(), 'Billing Reminder', {
          content: warningMessage,
          isSystem: true,
          chatUserId: user._id.toString(),
        });
      } catch (err) {
        console.error('Failed to send push notification on warning:', err);
      }
    }
  } else {
    // If no warnings are active, deactivate them
    await Notice.updateMany(
      { targetUserId: user._id, type: 'admin_warning', title: 'Billing Warning' },
      { $set: { isActive: false } }
    );
  }

  return user;
}
