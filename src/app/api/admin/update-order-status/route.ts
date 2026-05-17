import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { sendOrderUpdate } from '@/lib/telegram';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update Firestore Document
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
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
