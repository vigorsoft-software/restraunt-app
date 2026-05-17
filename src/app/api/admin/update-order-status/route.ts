import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendOrderUpdate } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update Firestore Document
    const adminDb = getAdminDb();
    await adminDb.collection('orders').doc(orderId).update({
      status: status
    });

    // Send Telegram Notification (Fire and forget, we don't want to fail the API request if Telegram fails)
    sendOrderUpdate(orderId, status).catch(err => {
      console.error('Failed to send Telegram update for order', orderId, err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
