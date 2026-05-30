import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!(global as any).onlineUsers) {
    (global as any).onlineUsers = new Map<string, { count: number; role: string }>();
  }

  const encoder = new TextEncoder();
  let keepAliveInterval: ReturnType<typeof setInterval> | undefined;
  let onMessage: ((message: any) => void) | undefined;
  let onMessageUpdate: ((message: any) => void) | undefined;
  let onPresence: ((presence: any) => void) | undefined;
  let onUserFreeze: ((data: any) => void) | undefined;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    if (onMessage) chatEmitter.off('message', onMessage);
    if (onMessageUpdate) chatEmitter.off('message_update', onMessageUpdate);
    if (onPresence) chatEmitter.off('presence', onPresence);
    if (onUserFreeze) chatEmitter.off('user_freeze', onUserFreeze);

    // Decrement connection count for this user
    const onlineUsers = (global as any).onlineUsers;
    const userRecord = onlineUsers.get(payload.userId);
    if (userRecord) {
      if (userRecord.count <= 1) {
        onlineUsers.delete(payload.userId);
        chatEmitter.emit('presence', { userId: payload.userId, role: payload.role, online: false });
      } else {
        onlineUsers.set(payload.userId, { count: userRecord.count - 1, role: payload.role });
      }
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      try {
        const onlineUsers = (global as any).onlineUsers;
        const userRecord = onlineUsers.get(payload.userId) || { count: 0, role: payload.role };
        onlineUsers.set(payload.userId, { count: userRecord.count + 1, role: payload.role });

        // Retrieve current list of online users to return in handshake
        const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, info]: any) => ({
          userId: id,
          role: info.role
        }));

        // Send handshake
        controller.enqueue(encoder.encode('retry: 1500\n\n'));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          connected: true, 
          userId: payload.userId, 
          role: payload.role,
          onlineUsers: onlineUsersList
        })}\n\n`));

        if (userRecord.count === 0) {
          // Broadcast user going online
          chatEmitter.emit('presence', { userId: payload.userId, role: payload.role, online: true });
        }
      } catch (err) {
        console.error('SSE initialization error:', err);
      }

      // Heartbeat
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch (err) {
          cleanup();
        }
      }, 15000);

      // Listen for message broadcasts
      onMessage = (message: any) => {
        if (payload.role === 'user' && message.chatUserId.toString() !== payload.userId) {
          return;
        }
        if (message.systemMessageFor && message.systemMessageFor.toString() !== payload.userId) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        } catch (e) {}
      };

      // Listen for message updates (reactions, read status, replies)
      onMessageUpdate = (message: any) => {
        if (message.isChatCleared && message.clearedByUserId !== payload.userId) {
          return;
        }
        if (payload.role === 'user' && message.chatUserId?.toString() !== payload.userId) {
          return;
        }
        if (message.systemMessageFor && message.systemMessageFor.toString() !== payload.userId) {
          return;
        }
        try {
          const plainMsg = message.toJSON ? message.toJSON() : message;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...plainMsg, isUpdate: true })}\n\n`));
        } catch (e) {}
      };

      // Listen for presence notifications
      onPresence = (presence: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'presence', ...presence })}\n\n`));
        } catch (e) {}
      };

      // Listen for user freeze/unfreeze notifications
      onUserFreeze = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'user_freeze', ...data })}\n\n`));
        } catch (e) {}
      };

      chatEmitter.on('message', onMessage);
      chatEmitter.on('message_update', onMessageUpdate);
      chatEmitter.on('presence', onPresence);
      chatEmitter.on('user_freeze', onUserFreeze);
    },
    cancel() {
      cleanup();
    },
  });

  req.signal.addEventListener('abort', () => {
    cleanup();
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
    },
  });
}
