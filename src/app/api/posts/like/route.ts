import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await dbConnect();

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const likes = post.likes || [];
    const userIndex = likes.indexOf(payload.userId);
    let liked = false;

    if (userIndex > -1) {
      likes.splice(userIndex, 1);
    } else {
      likes.push(payload.userId);
      liked = true;
    }

    post.likes = likes;
    await post.save();

    return NextResponse.json({
      success: true,
      liked,
      likesCount: likes.length,
      likes,
    });
  } catch (error) {
    console.error('Toggle post like error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
