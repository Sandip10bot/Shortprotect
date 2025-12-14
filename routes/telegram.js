// routes/telegram.js
import express from "express";
import { setupTelegram } from "../utils/helpers.js";

const router = express.Router();
const { sendTelegramNotification } = setupTelegram();

// 🔹 Test Telegram Notification
router.get("/test-notification", async (req, res) => {
  const testMessage = `
🔔 <b>TEST NOTIFICATION</b>

👤 <b>User ID:</b> <code>5189870730</code>
📦 <b>Plan:</b> silver
💵 <b>Amount:</b> ₹55
🎯 <b>MythoPoints Discount:</b> ₹24 (30% off)
⏰ <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

✅ <b>Status:</b> Test Successful!
  `;
  
  await sendTelegramNotification(testMessage);
  res.send('✅ Test notification sent! Check your Telegram.');
});

export default router;
