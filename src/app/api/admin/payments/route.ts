import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { getUserFromRequest } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

// Helper to upload/save payment QR images
async function savePaymentImage(file: File, buffer: Buffer): Promise<string> {
  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

  if (isCloudinaryConfigured) {
    try {
      const result = await uploadToCloudinary(buffer, 'payments', 'image');
      return result.secure_url;
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error, falling back to local disk:', cloudinaryError);
    }
  }

  // Fallback to local folder public/upload/payments
  const uploadDir = path.join(process.cwd(), 'public', 'upload', 'payments');
  if (!fs.existsSync(uploadDir)) {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  }

  const originalName = file.name || 'payment.png';
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = path.extname(cleanName) || '.png';
  const baseName = path.basename(cleanName, ext);
  const uniqueName = `${baseName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

  const filePath = path.join(uploadDir, uniqueName);
  await fs.promises.writeFile(filePath, buffer);

  return `/upload/payments/${uniqueName}`;
}

// GET: Fetch all payments for this admin
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const payments = await Payment.find({ adminId: payload.userId }).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('Fetch payments error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new payment method (Admin only)
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const formData = await req.formData();
    const name = formData.get('name') as string | null;
    const file = formData.get('file') as File | null;
    const qrImageUrl = formData.get('qrImageUrl') as string | null;
    const isActiveStr = formData.get('isActive') as string | null;
    const isActive = isActiveStr !== 'false'; // defaults to true

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let finalQrImageUrl = '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      finalQrImageUrl = await savePaymentImage(file, buffer);
    } else if (qrImageUrl) {
      finalQrImageUrl = qrImageUrl.trim();
    } else {
      return NextResponse.json({ error: 'Payment QR image file or URL is required' }, { status: 400 });
    }

    const newPayment = new Payment({
      adminId: payload.userId,
      name: name.trim(),
      qrImage: finalQrImageUrl,
      isActive,
    });

    await newPayment.save();

    return NextResponse.json({ success: true, payment: newPayment });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing payment method (Admin only)
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const formData = await req.formData();
    const id = formData.get('id') as string | null;
    const name = formData.get('name') as string | null;
    const file = formData.get('file') as File | null;
    const qrImageUrl = formData.get('qrImageUrl') as string | null;
    const isActiveStr = formData.get('isActive') as string | null;

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const paymentToUpdate = await Payment.findOne({ _id: id, adminId: payload.userId });
    if (!paymentToUpdate) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    if (name) paymentToUpdate.name = name.trim();
    if (isActiveStr !== null && isActiveStr !== undefined) {
      paymentToUpdate.isActive = isActiveStr === 'true';
    }

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      paymentToUpdate.qrImage = await savePaymentImage(file, buffer);
    } else if (qrImageUrl !== null && qrImageUrl !== undefined) {
      paymentToUpdate.qrImage = qrImageUrl.trim();
    }

    await paymentToUpdate.save();

    return NextResponse.json({ success: true, payment: paymentToUpdate });
  } catch (error) {
    console.error('Update payment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete a payment method (Admin only)
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
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const deleted = await Payment.findOneAndDelete({ _id: id, adminId: payload.userId });
    if (!deleted) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
