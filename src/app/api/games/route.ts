import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Game from '@/models/Game';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const games = await Game.find({}).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, games });
  } catch (error) {
    console.error('Fetch public games error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
