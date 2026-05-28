import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

async function savePostFileLocally(file: File, buffer: Buffer): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'upload', 'posts');
  if (!fs.existsSync(uploadDir)) {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  }

  const originalName = file.name || 'upload';
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = path.extname(cleanName) || '.jpg';
  const baseName = path.basename(cleanName, ext);
  const uniqueName = `${baseName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

  const filePath = path.join(uploadDir, uniqueName);
  await fs.promises.writeFile(filePath, buffer);

  return `/upload/posts/${uniqueName}`;
}

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let posts = [];
    if (payload.role === 'user') {
      const user = await User.findById(payload.userId);
      if (!user || !user.linkedAdmins || user.linkedAdmins.length === 0) {
        return NextResponse.json({ success: true, posts: [] });
      }
      posts = await Post.find({ adminId: { $in: user.linkedAdmins } })
        .sort({ createdAt: -1 })
        .populate('adminId', 'name username avatar role');
    } else {
      // Admins see their own posts
      posts = await Post.find({ adminId: payload.userId })
        .sort({ createdAt: -1 })
        .populate('adminId', 'name username avatar role');
    }

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error('Fetch posts error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const formData = await req.formData();
    const content = formData.get('content') as string | null;
    const file = formData.get('file') as File | null;

    if ((!content || content.trim() === '') && !file) {
      return NextResponse.json({ error: 'Post content or image is required' }, { status: 400 });
    }

    let imageUrl = '';
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const isCloudinaryConfigured = 
        process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

      if (isCloudinaryConfigured) {
        try {
          const result = await uploadToCloudinary(buffer, 'posts', 'image');
          imageUrl = result.secure_url;
        } catch (cloudinaryError) {
          console.error('Cloudinary upload error, falling back to local disk:', cloudinaryError);
          imageUrl = await savePostFileLocally(file, buffer);
        }
      } else {
        imageUrl = await savePostFileLocally(file, buffer);
      }
    }

    const newPost = new Post({
      adminId: payload.userId,
      content: content?.trim() || '',
      image: imageUrl || undefined,
      likes: [],
    });

    await newPost.save();

    const populatedPost = await Post.findById(newPost._id).populate('adminId', 'name username avatar role');
    return NextResponse.json({ success: true, post: populatedPost });
  } catch (error: any) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await dbConnect();

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Admins can only delete their own posts (unless they are super_admin)
    if (payload.role !== 'super_admin' && post.adminId.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Post.findByIdAndDelete(postId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
