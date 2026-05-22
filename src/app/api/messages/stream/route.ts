import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { chatEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let keepAliveInterval: ReturnType<typeof setInterval> | undefined;
  let onMessage: ((message: any) => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      try {
        // Send an initial handshake
        controller.enqueue(encoder.encode('retry: 1500\n\n'));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ connected: true, userId: payload.userId, role: payload.role })}\n\n`));
      } catch (err) {
        console.error('SSE initialization error:', err);
      }

      // Keep-alive heartbeat to prevent timeouts (every 15 seconds)
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch (err) {
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
          }
        }
      }, 15000);

      // Event handler callback
      onMessage = (message: any) => {
        // If the recipient is a user, only stream messages belonging to their conversation
        if (payload.role === 'user' && message.chatUserId.toString() !== payload.userId) {
          return;
        }
        // Admins and Super Admins receive all message events to update sidebar feeds and current chat panes
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        } catch (e) {
          // Stream might be closed already or controller closed
        }
      };

      chatEmitter.on('message', onMessage);
    },
    cancel() {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      if (onMessage) {
        chatEmitter.off('message', onMessage);
      }
    },
  });

  // Listen for client disconnect/abort
  req.signal.addEventListener('abort', () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    if (onMessage) {
      chatEmitter.off('message', onMessage);
    }
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
