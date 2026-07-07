import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { getSafeQueryParam } from '@/lib/security';

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

    const filterAdminId = getSafeQueryParam(req, 'adminId');

    let posts = [];
    if (filterAdminId) {
      if (payload.role === 'user') {
        const user = await User.findById(payload.userId);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const isLinked = user.linkedAdmins?.some((id: any) => id.toString() === filterAdminId);
        if (!isLinked) {
          return NextResponse.json({ error: 'Forbidden: You are not connected to this administrator' }, { status: 403 });
        }
      }
      posts = await Post.find({ adminId: filterAdminId })
        .sort({ createdAt: -1 })
        .populate('adminId', 'name username avatar role isVerified');
    } else if (payload.role === 'user') {
      const user = await User.findById(payload.userId);
      if (!user || !user.linkedAdmins || user.linkedAdmins.length === 0) {
        return NextResponse.json({ success: true, posts: [] });
      }
      posts = await Post.find({ adminId: { $in: user.linkedAdmins } })
        .sort({ createdAt: -1 })
        .populate('adminId', 'name username avatar role isVerified');
    } else if (payload.role === 'super_admin') {
      // Super admins see all posts from all administrators
      posts = await Post.find({})
        .sort({ createdAt: -1 })
        .populate('adminId', 'name username avatar role isVerified');
    } else {
      // Admins see their own posts
      posts = await Post.find({ adminId: payload.userId })
        .sort({ createdAt: -1 })
        .populate('adminId', 'name username avatar role isVerified');
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

    const user = await User.findById(payload.userId);
    if (user?.isFrozen) {
      return NextResponse.json({ error: 'Your account is frozen. You cannot create posts.' }, { status: 403 });
    }

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

    const populatedPost = await Post.findById(newPost._id).populate('adminId', 'name username avatar role isVerified');

    // Send push notifications to all users connected to this admin
    try {
      let linkedUsers = [];
      if (payload.role === 'super_admin') {
        linkedUsers = await User.find({ role: 'user' }).select('_id');
      } else {
        linkedUsers = await User.find({ role: 'user', linkedAdmins: payload.userId }).select('_id');
      }

      const adminName = (populatedPost?.adminId as any)?.name || 'Support Chat';
      const notifyPromises = linkedUsers.map(async (u: any) => {
        try {
          const { sendPushNotification } = await import('@/lib/notifications');
          await sendPushNotification(u._id.toString(), adminName, {
            content: content?.trim() || 'New post published',
            isSystem: true,
            chatUserId: u._id.toString(),
          });
        } catch (err) {
          console.error(`Failed to send post push notification to user ${u._id}:`, err);
        }
      });
      // Execute asynchronously in parallel
      Promise.allSettled(notifyPromises);
    } catch (err) {
      console.error('Failed to notify users of new post:', err);
    }

    return NextResponse.json({ success: true, post: populatedPost });
  } catch (error: any) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const user = await User.findById(payload.userId);
    if (user?.isFrozen) {
      return NextResponse.json({ error: 'Your account is frozen. You cannot update posts.' }, { status: 403 });
    }

    const formData = await req.formData();
    const postId = formData.get('postId') as string | null;
    const content = formData.get('content') as string | null;
    const file = formData.get('file') as File | null;
    const deleteImageStr = formData.get('deleteImage') as string | null;
    const deleteImage = deleteImageStr === 'true';

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Admins can only edit their own posts (unless they are super_admin)
    if (payload.role !== 'super_admin' && post.adminId.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (content !== null) {
      post.content = content.trim();
    }

    if (deleteImage) {
      post.image = undefined;
    }

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const isCloudinaryConfigured = 
        process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

      let imageUrl = '';
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
      post.image = imageUrl;
    }

    await post.save();

    const populatedPost = await Post.findById(post._id).populate('adminId', 'name username avatar role isVerified');
    return NextResponse.json({ success: true, post: populatedPost });
  } catch (error: any) {
    console.error('Edit post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      console.error('Delete post unauthorized payload:', payload);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const postId = getSafeQueryParam(req, 'postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(payload.userId);
    if (user?.isFrozen) {
      return NextResponse.json({ error: 'Your account is frozen. You cannot delete posts.' }, { status: 403 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Admins can only delete their own posts (unless they are super_admin)
    const postAdminIdStr = post.adminId?.toString();
    if (payload.role !== 'super_admin' && postAdminIdStr !== payload.userId) {
      console.error(`Forbidden post delete attempt: postAdminId=${postAdminIdStr}, payload.userId=${payload.userId}`);
      return NextResponse.json({ error: 'Forbidden: You can only delete your own posts' }, { status: 403 });
    }

    await Post.findByIdAndDelete(postId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
