import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Only super admins can configure special discounts' }, { status: 401 });
    }

    await dbConnect();
    const { userId, months, pricePerMonth, totalPrice, expiresInHours } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If inputs are null or cleared, remove the discount
    if (months === null || months === undefined || pricePerMonth === null || pricePerMonth === undefined) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          specialDiscount: {
            pricePerMonth: null,
            totalPrice: null,
            months: null,
            expiresAt: null
          }
        }
      });
      return NextResponse.json({ success: true, message: 'Special discount cleared successfully' });
    }

    // Validate inputs
    const numMonths = Number(months);
    const numPrice = Number(pricePerMonth);
    const numTotal = totalPrice ? Number(totalPrice) : numMonths * numPrice;

    if (isNaN(numMonths) || isNaN(numPrice) || isNaN(numTotal) || numMonths <= 0 || numPrice < 0 || numTotal < 0) {
      return NextResponse.json({ error: 'Invalid discount parameters' }, { status: 400 });
    }

    let expiresAt: Date | null = null;
    if (expiresInHours && parseInt(expiresInHours, 10) > 0) {
      expiresAt = new Date(Date.now() + parseInt(expiresInHours, 10) * 60 * 60 * 1000);
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        specialDiscount: {
          pricePerMonth: numPrice,
          totalPrice: numTotal,
          months: numMonths,
          expiresAt: expiresAt
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Special discount updated successfully',
      specialDiscount: {
        pricePerMonth: numPrice,
        totalPrice: numTotal,
        months: numMonths
      }
    });
  } catch (error) {
    console.error('Update special discount error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
