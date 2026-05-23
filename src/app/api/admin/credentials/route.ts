import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GameCredential from '@/models/GameCredential';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Retrieve all secure game credentials (accessible by admin and super_admin)
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const credentials = await GameCredential.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, credentials });
  } catch (error) {
    console.error('Fetch credentials error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add a new secure game credential (accessible only by super_admin)
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { gameName, gameId, password } = body;

    if (!gameName || !gameId || !password) {
      return NextResponse.json({ error: 'Game Name, Game ID, and Password are required' }, { status: 400 });
    }

    const newCredential = new GameCredential({
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

// PUT: Update an existing game credential (accessible only by super_admin)
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { id, gameName, gameId, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const credentialToUpdate = await GameCredential.findById(id);
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

// DELETE: Remove a game credential (accessible only by super_admin)
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const deleted = await GameCredential.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Game credential deleted successfully' });
  } catch (error) {
    console.error('Delete credential error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
