import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Memory cache for client IP rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function cleanExpiredLimits() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  
  // Prevent memory leaks by periodically cleaning the cache
  if (rateLimitMap.size > 1000) {
    cleanExpiredLimits();
  }

  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  record.count++;
  if (record.count > limit) {
    return true;
  }

  return false;
}

function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Use atob to decode base64 in Edge runtime
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(bytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Custom Content Security Policy restricting sources to local origin, fonts, and Stripe CDN assets
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' wss: ws: https://api.stripe.com; " +
    "img-src 'self' data: https: blob:; " +
    "frame-src 'self' https://js.stripe.com;"
  );
  
  return response;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;
  
  // Get remote IP address safely
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';

  // 1. IP Rate Limiting Guard for APIs
  if (pathname.startsWith('/api')) {
    const isSensitive = pathname.startsWith('/api/auth/login') ||
                        pathname.startsWith('/api/auth/register') ||
                        pathname.startsWith('/api/auth/guest') ||
                        pathname.startsWith('/api/payments/stripe/intent');

    const limit = isSensitive ? 15 : 60; // 15 requests/min for login/pay, 60 requests/min for other APIs
    const windowMs = 60 * 1000; // 1 minute

    if (isRateLimited(`${clientIp}:${isSensitive ? 'strict' : 'std'}`, limit, windowMs)) {
      const errorRes = new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down and try again later.' }),
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
      return applySecurityHeaders(errorRes);
    }
  }

  // 2. Strict Proxy Enforcement for Unlinked Players
  if (token) {
    const payload = decodeJwt(token);
    if (payload && payload.role === 'user' && !payload.hasLinkedAdmins) {
      // List of allowed API paths for unlinked users
      const allowedPaths = [
        '/api/auth/me',
        '/api/auth/link-admin',
        '/api/auth/logout',
        '/api/payments/stripe/webhook'
      ];
      
      const isAllowedApi = allowedPaths.some(p => pathname.startsWith(p));
      const isStaticOrAuthPage = pathname.startsWith('/_next') || 
                                 pathname.startsWith('/static') || 
                                 pathname.startsWith('/login') || 
                                 pathname.startsWith('/register') || 
                                 pathname.startsWith('/api/auth/login') || 
                                 pathname.startsWith('/api/auth/register') ||
                                 pathname.startsWith('/api/auth/guest');

      // Allow admin profile paths: /profile/[adminSlug]
      const isInviteOrLinkUrl = pathname.startsWith('/profile/') && !pathname.startsWith('/profile/become-admin');

      if (!isAllowedApi && !isStaticOrAuthPage && !isInviteOrLinkUrl) {
        // Secure API proxy blocker (returns 403 Forbidden JSON)
        if (pathname.startsWith('/api')) {
          const apiBlockRes = new NextResponse(
            JSON.stringify({ error: 'Access Denied: You must link your account using an administrator\'s invite link first.' }),
            { 
              status: 403, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
          return applySecurityHeaders(apiBlockRes);
        }

        // Secure frontend page proxy blocker (returns gorgeous Invite Link Required HTML directly from Edge proxy)
        const htmlBlockRes = new NextResponse(
          `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invite Link Required | Royale Gaming</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
            <style>
              :root {
                --bg: #000000;
                --primary: #00A884;
                --text: #ffffff;
                --text-muted: rgba(255, 255, 255, 0.6);
                --card-bg: rgba(18, 18, 18, 0.7);
                --border: rgba(255, 255, 255, 0.08);
              }
              body {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Outfit', sans-serif;
                background-color: var(--bg);
                color: var(--text);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                overflow: hidden;
                position: relative;
              }
              body::before {
                content: '';
                position: absolute;
                top: -20%;
                left: -20%;
                width: 60%;
                height: 60%;
                background: radial-gradient(circle, rgba(0, 168, 132, 0.15) 0%, transparent 70%);
                z-index: 0;
              }
              body::after {
                content: '';
                position: absolute;
                bottom: -20%;
                right: -20%;
                width: 60%;
                height: 60%;
                background: radial-gradient(circle, rgba(0, 168, 132, 0.15) 0%, transparent 70%);
                z-index: 0;
              }
              .card {
                background: var(--card-bg);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid var(--border);
                border-radius: 28px;
                padding: 40px;
                max-width: 440px;
                width: 90%;
                text-align: center;
                z-index: 10;
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05);
                transform: translateY(0);
                animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
              }
              @keyframes fadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .icon-wrapper {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: rgba(0, 168, 132, 0.1);
                border: 1px solid rgba(0, 168, 132, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                box-shadow: 0 8px 32px rgba(0, 168, 132, 0.15);
              }
              .icon-wrapper svg {
                width: 36px;
                height: 36px;
                color: var(--primary);
              }
              h1 {
                font-size: 28px;
                font-weight: 800;
                margin: 0 0 12px;
                letter-spacing: -0.5px;
              }
              p {
                font-size: 15px;
                line-height: 1.6;
                color: var(--text-muted);
                margin: 0 0 32px;
              }
              .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: var(--primary);
                color: #ffffff;
                font-weight: 600;
                font-size: 15px;
                padding: 14px 28px;
                border-radius: 16px;
                text-decoration: none;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
                box-shadow: 0 8px 24px rgba(0, 168, 132, 0.3);
                width: 100%;
                box-sizing: border-box;
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 30px rgba(0, 168, 132, 0.4);
              }
              .btn:active {
                transform: translateY(0);
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon-wrapper">
                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"></path>
                </svg>
              </div>
              <h1>Invite Link Required</h1>
              <p>Your account is successfully registered, but you must join using an administrator's unique invite link to unlock chats, data access, and support features.</p>
              <button onclick="handleLogout()" class="btn">Log Out & Try Again</button>
            </div>
            <script>
              function handleLogout() {
                // Delete auth_token cookie and redirect to login
                document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                window.location.href = '/login';
              }
            </script>
          </body>
          </html>`,
          {
            status: 403,
            headers: { 'Content-Type': 'text/html' }
          }
        );
        return applySecurityHeaders(htmlBlockRes);
      }
    }
  }

  // 3. If user is trying to access auth pages (login)
  if (pathname.startsWith('/login')) {
    if (token) {
      const payload = decodeJwt(token);
      if (payload) {
        // Already logged in, redirect to chat
        const redirectRes = NextResponse.redirect(new URL('/chat', request.url));
        return applySecurityHeaders(redirectRes);
      }
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // 4. If user is trying to access protected chat pages
  if (pathname.startsWith('/chat')) {
    if (!token) {
      const redirectRes = NextResponse.redirect(new URL('/login', request.url));
      return applySecurityHeaders(redirectRes);
    }
    
    const payload = decodeJwt(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return applySecurityHeaders(response);
    }
    
    return applySecurityHeaders(NextResponse.next());
  }

  // 5. If user is trying to access super admin control panel
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const redirectRes = NextResponse.redirect(new URL('/login', request.url));
      return applySecurityHeaders(redirectRes);
    }
    
    const payload = decodeJwt(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return applySecurityHeaders(response);
    }
    
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      // User is not authorized, redirect to main support chat
      const redirectRes = NextResponse.redirect(new URL('/chat', request.url));
      return applySecurityHeaders(redirectRes);
    }
    
    return applySecurityHeaders(NextResponse.next());
  }

  // 6. Root URL '/' is allowed for both authenticated and unauthenticated users.
  if (pathname === '/') {
    return applySecurityHeaders(NextResponse.next());
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/', '/login', '/chat/:path*', '/admin/:path*', '/api/:path*'],
};
