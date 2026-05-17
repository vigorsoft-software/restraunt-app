import { getAdminDb } from './firebase-admin';

export async function getTelegramConfig() {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection('settings').doc('telegram').get();
  if (doc.exists) {
    return doc.data() as { botToken?: string; botUsername?: string; webhookSecret?: string; chatId?: string };
  }
  return {};
}

/**
 * Validates the X-Telegram-Bot-Api-Secret-Token header.
 */
export async function verifyWebhookSecret(secretToken: string | null): Promise<boolean> {
  const config = await getTelegramConfig();
  const secret = config.webhookSecret || process.env.TELEGRAM_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn("TELEGRAM_WEBHOOK_SECRET is not set in Firestore or ENV, bypassing webhook verification (NOT RECOMMENDED FOR PRODUCTION)");
    return true; // Bypass if not set
  }
  return secretToken === secret;
}

interface InlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

/**
 * Sends a message to a Telegram chat, optionally with inline keyboard buttons.
 */
export async function sendTelegramMessage(chatId: string | number, text: string, buttons?: InlineButton[][]) {
  const config = await getTelegramConfig();
  const botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('Telegram botToken is missing from Firestore settings and ENV');
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
  };

  if (buttons && buttons.length > 0) {
    payload.reply_markup = {
      inline_keyboard: buttons
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send Telegram message:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Generates and sends an order status update to a user if their Telegram chat ID is linked.
 */
export async function sendOrderUpdate(orderId: string, status: string, totalAmount?: number) {
  try {
    const adminDb = getAdminDb();
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      console.error(`Order ${orderId} not found`);
      return false;
    }

    const orderData = orderDoc.data();
    const telegramChatId = orderData?.telegramChatId;

    if (!telegramChatId) {
      console.log(`Order ${orderId} does not have a linked Telegram account. Skipping notification.`);
      return false;
    }

    let messageText = '';
    const supportBtn: InlineButton[] = [{ text: "💬 Support", url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/contact` }];

    switch (status) {
      case 'accepted':
        messageText = `🍕 *Your order has been accepted!*\n\nOrder ID: \`${orderId}\`\nYour order is currently in the queue and we will begin preparing it shortly.`;
        break;
      case 'preparing':
        messageText = `👨‍🍳 *Your food is being prepared!*\n\nOrder ID: \`${orderId}\`\nOur chefs are working on your delicious meal.`;
        break;
      case 'out_for_delivery':
        messageText = `🛵 *Your order is out for delivery!*\n\nOrder ID: \`${orderId}\`\nKeep an eye out, our rider is on the way!`;
        break;
      case 'delivered':
        messageText = `✅ *Order Delivered*\n\nOrder ID: \`${orderId}\`\nEnjoy your meal! We hope to serve you again soon.`;
        break;
      case 'cancelled':
        messageText = `❌ *Order Cancelled*\n\nOrder ID: \`${orderId}\`\nYour order has been cancelled. If you believe this is a mistake, please contact support.`;
        break;
      default:
        messageText = `ℹ️ *Order Update*\n\nOrder ID: \`${orderId}\`\nStatus: ${status}`;
    }

    return await sendTelegramMessage(telegramChatId, messageText, [supportBtn]);
  } catch (error) {
    console.error('Error in sendOrderUpdate:', error);
    return false;
  }
}
