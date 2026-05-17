import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { verifyWebhookSecret, sendTelegramMessage } from '@/lib/telegram';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  // 1. Verify Secret Token
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  const isVerified = await verifyWebhookSecret(secretToken);
  
  if (!isVerified) {
    // Log unauthorized attempts
    try {
      const db = getFirestore(app);
      await addDoc(collection(db, 'telegram_logs'), {
        error: 'Unauthorized webhook attempt',
        providedToken: secretToken || 'none',
        timestamp: serverTimestamp()
      });
    } catch(e) {}
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update = await request.json();

    // Log incoming webhook data for debugging
    await addDoc(collection(db, 'telegram_logs'), {
      type: 'incoming_webhook',
      updateData: update,
      timestamp: serverTimestamp()
    });

    // Only process text messages from private chats
    if (update.message && update.message.text && update.message.chat.type === 'private') {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      // Handle /start with payload (e.g., /start ORDER_123 or /start 123)
      if (text.startsWith('/start ')) {
        const orderId = text.replace('/start ', '').replace('ORDER_', '').trim();

        if (!orderId) {
           await sendTelegramMessage(chatId, "Welcome to the Galaxy Grand Cafe Order Bot! ☕️\n\nLink your order from the checkout page to receive real-time updates.");
           return NextResponse.json({ ok: true });
        }

        // Find order in Firestore
        const orderRef = doc(db, 'orders', orderId);
        const orderDocSnap = await getDoc(orderRef);

        if (orderDocSnap.exists()) {
          // Link Chat ID
          await updateDoc(orderRef, {
            telegramChatId: chatId,
            updatedAt: serverTimestamp()
          });

          await addDoc(collection(db, 'telegram_logs'), {
            type: 'order_linked',
            orderId,
            chatId,
            timestamp: serverTimestamp()
          });

          await sendTelegramMessage(
            chatId,
            `🎉 *Order Linked Successfully!*\n\nYou will now receive live updates for Order \`${orderId}\` right here.\n\nYou can use the /track command to check the current status at any time.`,
            [[{ text: "📦 Track Order", callback_data: `track_${orderId}` }]]
          );
        } else {
          await addDoc(collection(db, 'telegram_logs'), {
            type: 'order_not_found',
            orderId,
            timestamp: serverTimestamp()
          });
          await sendTelegramMessage(chatId, `⚠️ Sorry, we couldn't find an order with ID \`${orderId}\`.`);
        }
      }
      // Handle /track
      else if (text === '/track' || text.startsWith('/track ')) {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('telegramChatId', '==', chatId),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        if (!ordersSnapshot.empty) {
          const orderDoc = ordersSnapshot.docs[0];
          const orderData = orderDoc.data();
          await sendTelegramMessage(chatId, `📦 *Order Status*\n\nOrder ID: \`${orderDoc.id}\`\nStatus: *${orderData.status.toUpperCase()}*`);
        } else {
          await sendTelegramMessage(chatId, "You don't have any linked orders currently.");
        }
      }
      // Handle /support
      else if (text === '/support') {
        await sendTelegramMessage(chatId, "💬 Need help? Our support team is available 24/7. Please contact us via our website.", [
          [{ text: "Visit Website", url: process.env.NEXT_PUBLIC_APP_URL || "https://galaxygrandcafe.com" }]
        ]);
      }
      // Welcome fallback
      else if (text === '/start') {
        await sendTelegramMessage(chatId, "Welcome to the Galaxy Grand Cafe Order Bot! ☕️\n\nLink your order from the checkout page to receive real-time updates.");
      }
    } else if (update.callback_query) {
      // Handle inline button clicks
      const data = update.callback_query.data;
      const chatId = update.callback_query.message.chat.id;

      if (data.startsWith('track_')) {
        const orderId = data.replace('track_', '');
        const orderDocSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderDocSnap.exists()) {
          await sendTelegramMessage(chatId, `📦 *Order Status*\n\nOrder ID: \`${orderId}\`\nStatus: *${orderDocSnap.data()?.status.toUpperCase()}*`);
        }
      }
      // Respond to callback query to remove loading state
      const { getTelegramConfig } = await import('@/lib/telegram');
      const config = await getTelegramConfig();
      const botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: update.callback_query.id })
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    try {
      await addDoc(collection(db, 'telegram_logs'), {
        error: error.message || String(error),
        timestamp: serverTimestamp()
      });
    } catch(e) {}
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
