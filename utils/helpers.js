// utils/helpers.js
import crypto from "crypto";

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

export function setupTelegram() {
  // 🔹 Send Telegram Notification
  async function sendTelegramNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      console.log("🔔 Telegram notification (simulated):", message);
      return;
    }

    try {
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_ADMIN_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const result = await response.json();
      if (!result.ok) {
        console.error('❌ Telegram notification failed:', result);
      } else {
        console.log('✅ Telegram notification sent');
      }
    } catch (error) {
      console.error('❌ Telegram notification error:', error);
    }
  }

  return { sendTelegramNotification };
}

// 🔹 Calculate discounted price with MythoPoints
export function calculateDiscountedPrice(originalPrice, mythoPointsApplied = false) {
  if (mythoPointsApplied) {
    const discount = originalPrice * 0.3; // 30% discount
    return Math.max(1, Math.round(originalPrice - discount)); // Minimum ₹1
  }
  return originalPrice;
}

// 🔹 Generate random token
export function generateToken(bytes = 8) {
  return crypto.randomBytes(bytes).toString("hex");
}

// 🔹 Validate URL
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}
