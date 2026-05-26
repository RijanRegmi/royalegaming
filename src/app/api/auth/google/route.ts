import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Google sign-in is disabled' }, { status: 403 });
}
