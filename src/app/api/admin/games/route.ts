import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import dbConnect from '@/lib/mongodb';
import Game from '@/models/Game';
import { getUserFromRequest } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

// Helper to upload/save images
async function saveGameImage(file: File, buffer: Buffer): Promise<string> {
  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

  if (isCloudinaryConfigured) {
    try {
      const result = await uploadToCloudinary(buffer, 'games', 'image');
      return result.secure_url;
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error, falling back to local disk:', cloudinaryError);
    }
  }

  // Fallback to local folder public/upload/games
  const uploadDir = path.join(process.cwd(), 'public', 'upload', 'games');
  if (!fs.existsSync(uploadDir)) {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  }

  const originalName = file.name || 'game.png';
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = path.extname(cleanName) || '.png';
  const baseName = path.basename(cleanName, ext);
  const uniqueName = `${baseName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

  const filePath = path.join(uploadDir, uniqueName);
  await fs.promises.writeFile(filePath, buffer);

  return `/upload/games/${uniqueName}`;
}

// POST: Create a new game
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const formData = await req.formData();
    const name = formData.get('name') as string | null;
    const link = formData.get('link') as string | null;
    const file = formData.get('file') as File | null;
    const imageUrl = formData.get('imageUrl') as string | null;

    if (!name || !link) {
      return NextResponse.json({ error: 'Name and Link are required' }, { status: 400 });
    }

    let finalImageUrl = '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      finalImageUrl = await saveGameImage(file, buffer);
    } else if (imageUrl) {
      finalImageUrl = imageUrl.trim();
    } else {
      return NextResponse.json({ error: 'Game image file or URL is required' }, { status: 400 });
    }

    const newGame = new Game({
      name: name.trim(),
      link: link.trim(),
      image: finalImageUrl,
    });

    await newGame.save();

    return NextResponse.json({ success: true, game: newGame });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing game
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const formData = await req.formData();
    const id = formData.get('id') as string | null;
    const name = formData.get('name') as string | null;
    const link = formData.get('link') as string | null;
    const file = formData.get('file') as File | null;
    const imageUrl = formData.get('imageUrl') as string | null;

    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const gameToUpdate = await Game.findById(id);
    if (!gameToUpdate) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (name) gameToUpdate.name = name.trim();
    if (link) gameToUpdate.link = link.trim();

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      gameToUpdate.image = await saveGameImage(file, buffer);
    } else if (imageUrl !== null && imageUrl !== undefined) {
      gameToUpdate.image = imageUrl.trim();
    }

    await gameToUpdate.save();

    return NextResponse.json({ success: true, game: gameToUpdate });
  } catch (error) {
    console.error('Update game error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete a game
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const deleted = await Game.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
