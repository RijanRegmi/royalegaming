import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. If user is trying to access auth pages (login)
  if (pathname.startsWith('/login')) {
    if (token) {
      const payload = decodeJwt(token);
      if (payload) {
        // Already logged in, redirect to chat
        return NextResponse.redirect(new URL('/chat', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. If user is trying to access protected chat pages
  if (pathname.startsWith('/chat')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const payload = decodeJwt(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
    
    return NextResponse.next();
  }

  // 3. If user is trying to access super admin control panel
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const payload = decodeJwt(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
    
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      // User is not authorized, redirect to main support chat
      return NextResponse.redirect(new URL('/chat', request.url));
    }
    
    return NextResponse.next();
  }

  // 4. Root URL '/' is allowed for both authenticated and unauthenticated users.
  if (pathname === '/') {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/chat/:path*', '/admin/:path*'],
};
