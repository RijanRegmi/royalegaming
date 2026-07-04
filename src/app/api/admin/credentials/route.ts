import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import GameCredential from '@/models/GameCredential';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Retrieve all secure game credentials for this admin
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Route Super Admins to the unified primary Super Admin account
    const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('_id');
    const primarySuperAdminId = primarySuperAdmin ? primarySuperAdmin._id.toString() : payload.userId;
    const targetAdminId = payload.role === 'super_admin' ? primarySuperAdminId : payload.userId;

    const credentials = await GameCredential.find({ adminId: targetAdminId }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, credentials });
  } catch (error) {
    console.error('Fetch credentials error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add a new secure game credential (accessible only by admin)
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { gameName, gameId, password } = body;

    if (!gameName || !gameId || !password) {
      return NextResponse.json({ error: 'Game Name, Game ID, and Password are required' }, { status: 400 });
    }

    const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('_id');
    const primarySuperAdminId = primarySuperAdmin ? primarySuperAdmin._id.toString() : payload.userId;
    const targetAdminId = payload.role === 'super_admin' ? primarySuperAdminId : payload.userId;

    const newCredential = new GameCredential({
      adminId: targetAdminId,
      gameName: gameName.trim(),
      gameId: gameId.trim(),
      password: password.trim()
    });

    await newCredential.save();

    return NextResponse.json({ success: true, credential: newCredential });
  } catch (error) {
    console.error('Create credential error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing game credential (accessible only by admin)
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { id, gameName, gameId, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('_id');
    const primarySuperAdminId = primarySuperAdmin ? primarySuperAdmin._id.toString() : payload.userId;
    const targetAdminId = payload.role === 'super_admin' ? primarySuperAdminId : payload.userId;

    const credentialToUpdate = await GameCredential.findOne({ _id: id, adminId: targetAdminId });
    if (!credentialToUpdate) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (gameName) credentialToUpdate.gameName = gameName.trim();
    if (gameId) credentialToUpdate.gameId = gameId.trim();
    if (password) credentialToUpdate.password = password.trim();

    await credentialToUpdate.save();

    return NextResponse.json({ success: true, credential: credentialToUpdate });
  } catch (error) {
    console.error('Update credential error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a game credential (accessible only by admin)
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const primarySuperAdmin = await User.findOne({ role: 'super_admin' }).sort({ createdAt: 1 }).select('_id');
    const primarySuperAdminId = primarySuperAdmin ? primarySuperAdmin._id.toString() : payload.userId;
    const targetAdminId = payload.role === 'super_admin' ? primarySuperAdminId : payload.userId;

    const deleted = await GameCredential.findOneAndDelete({ _id: id, adminId: targetAdminId });
    if (!deleted) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Game credential deleted successfully' });
  } catch (error) {
    console.error('Delete credential error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
