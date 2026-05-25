import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: 'Credential token is required' }, { status: 400 });
    }

    let name = '';
    let email = '';
    let googleId = '';
    let avatar = '';

    // If client ID is placeholder, allow development mock verification for testing
    const isGoogleConfigured = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && 
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== 'your_google_client_id.apps.googleusercontent.com';

    if (!isGoogleConfigured && process.env.NODE_ENV !== 'production') {
      // Decode JWT without verification just for mock testing
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          name = payload.name || 'Mock User';
          email = payload.email || 'mock@example.com';
          googleId = payload.sub || 'mock_google_id_123';
          avatar = payload.picture || '';
          console.warn('Using mock Google token verification in development');
        } else {
          throw new Error('Invalid mock JWT structure');
        }
      } catch (err) {
        return NextResponse.json({ error: 'Failed to decode mock token' }, { status: 400 });
      }
    } else {
      // Real Google verification
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
          return NextResponse.json({ error: 'Invalid Google token' }, { status: 400 });
        }
        name = payload.name || '';
        email = payload.email || '';
        googleId = payload.sub || '';
        avatar = payload.picture || '';
      } catch (err: any) {
        console.error('Google verification error:', err);
        return NextResponse.json({ error: 'Google authentication failed: ' + err.message }, { status: 400 });
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Email not provided by Google' }, { status: 400 });
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // If user exists but has no googleId, link it
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      // Create new user
      const userCount = await User.countDocuments();
      const role = userCount === 0 ? 'super_admin' : 'user';

      user = new User({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar,
        role,
      });
      await user.save();
    }

    // Create session token
    const token = signToken({ userId: user._id.toString(), role: user.role });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar || '',
      },
    });

    // Set cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Google auth handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
