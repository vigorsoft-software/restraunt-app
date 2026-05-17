import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyWebhookSecret, sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  // 1. Verify Secret Token
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!(await verifyWebhookSecret(secretToken))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update = await request.json();

    // Only process text messages from private chats
    if (update.message && update.message.text && update.message.chat.type === 'private') {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      // Handle /start ORDER_<ORDER_ID>
      if (text.startsWith('/start ORDER_')) {
        const orderId = text.replace('/start ORDER_', '').trim();
        
        // Find order in Firestore
        const adminDb = getAdminDb();
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (orderDoc.exists) {
          // Link Chat ID
          await orderRef.update({
            telegramChatId: chatId,
            updatedAt: new Date()
          });
          
          await sendTelegramMessage(
            chatId, 
            `🎉 *Order Linked Successfully!*\n\nYou will now receive live updates for Order \`${orderId}\` right here.\n\nYou can use the /track command to check the current status at any time.`,
            [[{ text: "📦 Track Order", callback_data: `track_${orderId}` }]]
          );
        } else {
          await sendTelegramMessage(chatId, `⚠️ Sorry, we couldn't find an order with ID \`${orderId}\`.`);
        }
      } 
      // Handle /track
      else if (text === '/track' || text.startsWith('/track ')) {
        const adminDb = getAdminDb();
        const ordersQuery = await adminDb.collection('orders')
          .where('telegramChatId', '==', chatId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        if (!ordersQuery.empty) {
          const order = ordersQuery.docs[0];
          const orderData = order.data();
          await sendTelegramMessage(chatId, `📦 *Order Status*\n\nOrder ID: \`${order.id}\`\nStatus: *${orderData.status.toUpperCase()}*`);
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
        const adminDb = getAdminDb();
        const orderId = data.replace('track_', '');
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();
        if (orderDoc.exists) {
           await sendTelegramMessage(chatId, `📦 *Order Status*\n\nOrder ID: \`${orderId}\`\nStatus: *${orderDoc.data()?.status.toUpperCase()}*`);
        }
      }
      // Respond to callback query to remove loading state
      const { getTelegramConfig } = await import('@/lib/telegram');
      const config = await getTelegramConfig();
      const botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
         fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ callback_query_id: update.callback_query.id })
         });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
