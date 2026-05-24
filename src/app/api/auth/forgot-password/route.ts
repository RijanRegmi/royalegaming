import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return NextResponse.json({ error: 'User with this email not found' }, { status: 404 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB with 15-minute expiration
    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(`\n==================================================`);
    console.log(`[PASSWORD RESET CODE] for user: ${cleanEmail}`);
    console.log(`CODE: ${code}`);
    console.log(`==================================================\n`);

    // Check if SMTP or Gmail is configured
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (emailUser && emailPass) {
      try {
        const smtpFrom = process.env.SMTP_FROM || emailUser;
        const cleanPass = emailPass.trim().replace(/\s+/g, '');

        let transporter;
        if (process.env.EMAIL_USER) {
          // Dedicated Gmail service config
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: emailUser,
              pass: cleanPass,
            },
          });
        } else {
          // Standard SMTP config
          const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
          const smtpPort = parseInt(process.env.SMTP_PORT || '587');
          transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: emailUser,
              pass: cleanPass,
            },
          });
        }

        await transporter.sendMail({
          from: `"RoyaleGaming Support" <${smtpFrom}>`,
          to: cleanEmail,
          subject: 'Your Password Reset Verification Code',
          text: `Hello ${user.name},\n\nYou requested a password reset. Your 6-digit verification code is:\n\n${code}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #00a884; text-align: center;">RoyaleGaming Password Reset</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>You requested a password reset. Please use the following 6-digit verification code to proceed:</p>
              <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #333; border-radius: 4px; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #666; font-size: 13px;">This code will expire in 15 minutes.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px; text-align: center;">If you did not request a password reset, please ignore this email.</p>
            </div>
          `,
        });

        return NextResponse.json({
          success: true,
          message: 'Verification code sent to your email.',
        });
      } catch (mailError) {
        console.error('SMTP/Gmail sending failed:', mailError);
        // Fallback to local success response since we logged it to the console
        return NextResponse.json({
          success: true,
          message: 'Verification code generated successfully (logged to server console).',
          devFallback: true,
        });
      }
    } else {
      // SMTP/Gmail not configured, return fallback success
      return NextResponse.json({
        success: true,
        message: 'Verification code generated (printed to server console for dev).',
        devFallback: true,
      });
    }
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
