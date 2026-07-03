import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { postId, text } = body;

    if (!postId || !text || text.trim() === '') {
      return NextResponse.json({ error: 'Post ID and comment text are required' }, { status: 400 });
    }

    await dbConnect();

    // Fetch user details to get latest name/avatar/username
    const userDetail = await User.findById(payload.userId);
    if (!userDetail) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const newComment = {
      userId: payload.userId,
      userName: userDetail.name || userDetail.username || 'User',
      userAvatar: userDetail.avatar || '',
      text: text.trim(),
      createdAt: new Date()
    };

    if (!post.comments) {
      post.comments = [];
    }
    post.comments.push(newComment);
    await post.save();

    return NextResponse.json({
      success: true,
      comments: post.comments
    });
  } catch (error) {
    console.error('Comment on post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const commentId = searchParams.get('commentId');

    if (!postId || !commentId) {
      return NextResponse.json({ error: 'Post ID and Comment ID are required' }, { status: 400 });
    }

    await dbConnect();

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const commentIndex = post.comments.findIndex(
      (c: any) => c._id.toString() === commentId || c.id === commentId
    );
    if (commentIndex === -1) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const comment = post.comments[commentIndex];

    const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
    const isCommentOwner = comment.userId && comment.userId.toString() === payload.userId;

    if (!isAdmin && !isCommentOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    return NextResponse.json({
      success: true,
      comments: post.comments
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
