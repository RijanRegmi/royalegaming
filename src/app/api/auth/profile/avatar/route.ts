import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

// PUT: upload or replace avatar
export async function PUT(req: Request) {
  try {
    const payload = getUserFromRequest(req as any);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Expect multipart/form-data with field 'avatar'
    const formData = await (req as any).formData();
    const file = formData.get('avatar') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No avatar file provided' }, { status: 400 });
    }

    await dbConnect();
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToCloudinary(buffer, 'avatars', 'image');

    const user = await User.findByIdAndUpdate(
      payload.userId,
      { avatar: result.secure_url },
      { new: true, fields: '-password' }
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: remove avatar (reset to empty string)
export async function DELETE(req: Request) {
  try {
    const payload = getUserFromRequest(req as any);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { $unset: { avatar: '' } },
      { new: true, fields: '-password' }
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
