// ============================================================
// index.js – Premium Frontend (No Emojis, All SVG, Enhanced UI)
// ============================================================

import express from "express";
import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ========================
// MONGODB SETUP
// ========================
const MONGO_URI = process.env.DATABASE_URI;
if (!MONGO_URI) {
  console.error("❌ Missing DATABASE_URI in environment variables");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);
let doubleCollection, urlShortenerCollection, maskCollection, searchAdsCollection;
let scratchCollection, usersCollection, mpHistoryCollection, userStatsCollection;
let bankCollection, couponsCollection, searchLimitCollection, paymentLimitCollection;
let ipVerificationCollection, ratingsCollection, withdrawsCollection;
let paymentChatCollection, webSpinSessionsCollection, premiumUsersCollection;
let userSettingsCollection;
let userShortenersCollection;
let userSessionsCollection; // For online status tracking
let quizCollection;
let quizMetadataCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("Mytho");
    
    doubleCollection = db.collection("double_points");
    urlShortenerCollection = db.collection("url_shortener");
    maskCollection = db.collection("masked_links");
    searchAdsCollection = db.collection("search_ads");
    scratchCollection = db.collection("scratch_cards");
    usersCollection = db.collection("users");
    mpHistoryCollection = db.collection("mphistory");
    userStatsCollection = db.collection("user_stats");
    bankCollection = db.collection("bank");
    couponsCollection = db.collection("coupons");
    searchLimitCollection = db.collection("search_limits");
    paymentLimitCollection = db.collection("payment_limits");
    ipVerificationCollection = db.collection("ip_verification");
    ratingsCollection = db.collection("ratings");
    withdrawsCollection = db.collection("withdraws");
    paymentChatCollection = db.collection("payment_chats");
    webSpinSessionsCollection = db.collection("web_spin_sessions");
    premiumUsersCollection = db.collection("premium_users");
    userSettingsCollection = db.collection("user_settings");
    userShortenersCollection = db.collection("user_shorteners");
    userSessionsCollection = db.collection("user_sessions");
    quizCollection = db.collection("quizdata");
    quizMetadataCollection = db.collection("quiz_metadata");
    
    // Create indexes for performance
    await paymentChatCollection.createIndex({ senderId: 1, receiverId: 1, timestamp: -1 });
    await paymentChatCollection.createIndex({ read: 1 });
    await userSessionsCollection.createIndex({ lastSeen: -1 });
    
    console.log("✅ MongoDB connected for all collections");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
}

// ========================
// GLOBAL THEME (used by other pages)
// ========================
const THEME_CSS = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif; 
      margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; 
      background: #000000;
      background-image: radial-gradient(circle at 30% 10%, rgba(213,0,249,0.10) 0%, transparent 50%),
                         radial-gradient(circle at 80% 90%, rgba(101,31,255,0.08) 0%, transparent 50%); 
      color: #ffffff; overflow: hidden;
      -webkit-font-smoothing: antialiased;
      letter-spacing: -0.01em;
    }
    body::before { 
      content: ''; position: absolute; width: 150vw; height: 150vh; 
      background: radial-gradient(circle, rgba(255, 0, 255, 0.03) 0%, transparent 60%); 
      z-index: 0; animation: pulse 10s infinite alternate; 
      pointer-events: none;
    }
    @keyframes pulse { 
      0% { transform: scale(1); opacity: 0.4; } 
      100% { transform: scale(1.08); opacity: 0.9; } 
    }
    .container { 
      position: relative; z-index: 1;
      background: rgba(28,28,30,0.72);
      backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%); 
      border: 0.5px solid rgba(255, 255, 255, 0.14); 
      box-shadow: 0 24px 70px 0 rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08); 
      padding: 40px 32px; border-radius: 28px; text-align: center; max-width: 400px; width: 90%; 
      animation: riseIn 0.55s cubic-bezier(0.32, 0.72, 0, 1);
    }
    @keyframes riseIn { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    h1, h2 { 
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
      margin-bottom: 8px; font-size: 22px; font-weight: 700; color: #ffffff; 
      letter-spacing: -0.4px;
    }
    .error-title { color: #ff453a !important; }
    p { color: rgba(235,235,245,0.6); font-size: 15px; margin-bottom: 26px; line-height: 1.5; font-weight: 400; }
    .btn { 
      position: relative; overflow: hidden;
      background: linear-gradient(180deg, #b74bff, #9526e8); 
      box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 20px rgba(149, 38, 232, 0.35); color: white; border: none; 
      padding: 16px 28px; font-size: 17px; font-weight: 600; border-radius: 14px; 
      cursor: pointer; transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s; width: 100%; letter-spacing: -0.2px;
    }
    .btn:hover { box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 10px 26px rgba(149, 38, 232, 0.5); }
    .btn:active { transform: scale(0.96); }
    .loader { 
      position: relative;
      border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #ffffff;
      border-radius: 50%; width: 40px; height: 40px; animation: spin 0.8s linear infinite; 
      margin: 0 auto 20px auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .manual-box { 
      display: none; background: rgba(255,255,255,0.06); 
      border: 0.5px solid rgba(255,255,255,0.12); padding: 16px; border-radius: 16px; 
      margin-top: 20px; text-align: left; 
    }
    a { color: #bf5af2; text-decoration: none; font-weight: 600; transition: opacity 0.2s; }
    a:hover { opacity: 0.7; }
  </style>
`;

// ==========================================
// RANK TITLE HELPER
// ==========================================
function getRankTitle(points) {
    if (points < 100) return "Novice";
    if (points < 500) return "Warrior";
    if (points < 1500) return "Knight";
    if (points < 3000) return "Dragon Slayer";
    return "Mythic Lord";
}

// ========================
// HELPER FUNCTIONS
// ========================
function renderBypassError(res) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>System Locked | Anti-Bypass</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              
              :root {
                  --bg: #000000;
                  --card-bg: rgba(28, 28, 30, 0.68);
                  --text-main: #ffffff;
                  --text-muted: #8e8e93;
                  --accent: #ff453a;
                  --accent-2: #ff9f0a;
                  --border: rgba(255, 255, 255, 0.1);
              }
              
              * { 
                  box-sizing: border-box; 
                  margin: 0; 
                  padding: 0; 
              }
              
              body {
                  background-color: var(--bg);
                  background-image: 
                      radial-gradient(circle at 50% 0%, rgba(255, 69, 58, 0.1) 0%, transparent 55%);
                  color: var(--text-main);
                  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  padding: 20px;
                  overflow-x: hidden;
                  -webkit-font-smoothing: antialiased;
              }

              .container {
                  position: relative;
                  width: 100%;
                  max-width: 400px;
                  animation: slideUp 0.55s cubic-bezier(0.32, 0.72, 0, 1) forwards;
                  opacity: 0;
                  transform: translateY(24px) scale(0.97);
              }

              @keyframes slideUp {
                  to { transform: translateY(0) scale(1); opacity: 1; }
              }

              .card {
                  background: var(--card-bg);
                  backdrop-filter: blur(40px) saturate(180%);
                  -webkit-backdrop-filter: blur(40px) saturate(180%);
                  border: 0.5px solid var(--border);
                  border-radius: 26px;
                  padding: 36px 30px;
                  text-align: center;
                  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
              }

              .icon-wrapper {
                  width: 68px;
                  height: 68px;
                  background: linear-gradient(180deg, #ff6961, var(--accent));
                  border-radius: 18px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-size: 30px;
                  margin: 0 auto 22px;
                  box-shadow: 0 10px 24px rgba(255, 69, 58, 0.35), inset 0 1px 0 rgba(255,255,255,0.25);
                  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                  cursor: pointer;
              }
              
              .icon-wrapper:hover {
                  transform: scale(1.08);
              }

              h1 {
                  font-size: 21px;
                  font-weight: 700;
                  letter-spacing: -0.4px;
                  margin-bottom: 8px;
                  color: #ffffff;
              }

              p.subtitle {
                  font-size: 14.5px;
                  color: var(--text-muted);
                  line-height: 1.5;
                  margin-bottom: 26px;
                  font-weight: 400;
              }

              .roast-box {
                  background: rgba(120, 120, 128, 0.16);
                  border: 0.5px solid var(--border);
                  border-radius: 16px;
                  padding: 16px;
                  text-align: left;
                  position: relative;
                  overflow: hidden;
              }

              .roast-box::before {
                  content: '';
                  position: absolute;
                  top: 0; left: 0;
                  width: 3px;
                  height: 100%;
                  background: linear-gradient(180deg, var(--accent), var(--accent-2));
              }

              .roast-title {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  font-size: 14px;
                  font-weight: 600;
                  color: #ffffff;
                  margin-bottom: 8px;
              }

              .roast-title span {
                  color: var(--accent);
              }

              .roast-text {
                  font-size: 13px;
                  color: #aeaeb2;
                  line-height: 1.55;
                  font-weight: 400;
              }

              .footer-text {
                  margin-top: 22px;
                  font-size: 11px;
                  color: #636366;
                  text-transform: uppercase;
                  letter-spacing: 1.2px;
                  font-weight: 600;
              }

              /* Ultra-Small Mobile Adjustments */
              @media (max-width: 380px) {
                  .card { padding: 30px 22px; }
                  h1 { font-size: 19px; }
                  .roast-box { padding: 14px; }
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="card">
                  <div class="icon-wrapper">🚫</div>
                  <h1>Bypass Detected</h1>
                  <p class="subtitle">The shortcut era is officially dead. You are secured inside Mytho's Anti-Bypass System.</p>
                  
                  <div class="roast-box">
                      <div class="roast-title"><span>✦</span> Aww, cute attempt! 💅</div>
                      <div class="roast-text">
                          You really thought your little bypass trick would work? Bless your heart.<br><br>
                          Thanks for stopping by (and triggering our ads). Now close this tab and go open the link the honest way, sweetheart! ✨
                      </div>
                  </div>
                  
                  <div class="footer-text">Protected by MythoserialBot</div>
              </div>
          </div>

          <!-- Newly Added Ad Script (Push Notification Removed) -->
          <script>(function(s){s.dataset.zone='11457391',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
      </body>
      </html>
    `);
}


function isRefererValid(req) {
    const referer = (req.get("referrer") || req.get("referer") || "").toLowerCase();
    return referer.includes("shortxlinks");
}

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function base62_encode(data) {
    try {
        const buffer = Buffer.from(data, 'utf-8');
        const hex = buffer.toString('hex');
        let num = BigInt('0x' + hex);
        let encoded = '';
        if (num === 0n) return '0';
        while (num > 0n) {
            const remainder = Number(num % 62n);
            encoded = BASE62_CHARS[remainder] + encoded;
            num = num / 62n;
        }
        return encoded;
    } catch (error) {
        return Buffer.from(data, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
}

function base62_decode(encoded) {
    try {
        let num = 0n;
        for (let i = 0; i < encoded.length; i++) {
            const char = encoded[i];
            const value = BASE62_CHARS.indexOf(char);
            num = num * 62n + BigInt(value);
        }
        let hex = num.toString(16);
        if (hex.length % 2 !== 0) hex = '0' + hex;
        return Buffer.from(hex, 'hex').toString('utf-8');
    } catch (error) {
        let padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padding = 4 - (padded.length % 4);
        if (padding !== 4) padded += '='.repeat(padding);
        return Buffer.from(padded, 'base64').toString('utf-8');
    }
}

// ========================
// THE ENTRY SHIELD (Force Chrome -> 5-Sec Wait)
// ========================
function renderAntiBypassPage(res, targetUrl) {
    const b64Url = Buffer.from(targetUrl).toString('base64');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Secure Link Verification</title>
          ${THEME_CSS}
      </head>
      <body>
      
      <div class="container" id="main-box">
          <div class="loader" id="spinner"></div>
          <h2 id="title-text">Securing Connection</h2>
          <p id="status-text">Checking browser environment...</p>
          
          <div class="manual-box" id="manual-box">
              <b style="color:white; font-size:18px; text-shadow: 0 0 10px #ff66ff;">How to open:</b><br><br>
              1. Tap the three dots <b>(⋮)</b> at the top right corner.<br>
              2. Select <b>"Open in Chrome"</b> or <b>"Open in Browser"</b>.
          </div>
      </div>

      <script>
      const encodedUrl = "${b64Url}"; 
      const statusText = document.getElementById('status-text');
      const titleText = document.getElementById('title-text');
      const spinner = document.getElementById('spinner');
      const manualBox = document.getElementById('manual-box');

      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isTelegram = (userAgent.indexOf("Telegram") > -1);

      if (isTelegram) {
          titleText.innerHTML = "Opening in Chrome...";
          statusText.innerHTML = "Redirecting to your main browser for security.";
          spinner.style.display = "none";
          manualBox.style.display = "block";
          
          const urlParts = window.location.href.split('//');
          const currentUrl = urlParts.length > 1 ? urlParts[1] : window.location.href;
          
          const chromeIntent = "intent://" + currentUrl + "#Intent;scheme=https;package=com.android.chrome;end;";
          window.location.replace(chromeIntent);
          
      } else {
          statusText.innerHTML = 'Automatically proceeding in <span id="countdown" style="font-weight:bold;color:#ff66ff;font-size:18px;">5</span> seconds...';
          let timeLeft = 5;
          const countdownSpan = document.getElementById('countdown');

          const timer = setInterval(() => {
              timeLeft--;
              if (countdownSpan) countdownSpan.textContent = timeLeft;
              
              if (timeLeft <= 0) {
                  clearInterval(timer);
                  titleText.innerHTML = "Verification Complete!";
                  statusText.innerHTML = "Redirecting to destination...";
                  
                  setTimeout(() => {
                      window.location.replace(atob(encodedUrl));
                  }, 500);
              }
          }, 1000);
      }
      </script>
      </body>
      </html>
    `);
}

// ========================
// THE EXIT SHIELD (Silent Telegram Launcher)
// ========================
function renderSecureFinalPage(res, targetUrl) {
    const b64Url = Buffer.from(targetUrl).toString('base64');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Opening Bot...</title>
          ${THEME_CSS}
      </head>
      <body>
      <div class="container">
          <h2>Verification Complete!</h2>
          <p>Your file is ready. Click below to securely open it in Telegram.</p>
          <button id="open-btn" class="btn">Open in Telegram</button>
      </div>
      <script>
      const encodedUrl = "${b64Url}";
      
      function openSecureLink() {
          const rawUrl = atob(encodedUrl);
          let finalUrl = rawUrl;
          
          if (rawUrl.includes('t.me/')) {
              try {
                  const urlObj = new URL(rawUrl);
                  const domain = urlObj.pathname.replace('/', '');
                  const startParam = urlObj.searchParams.get('start');
                  if (domain && startParam) {
                      finalUrl = 'tg://resolve?domain=' + domain + '&start=' + startParam;
                  } else if (domain) {
                      finalUrl = 'tg://resolve?domain=' + domain;
                  }
              } catch(e) {}
          }
          window.location.replace(finalUrl);
      }
      
      setTimeout(openSecureLink, 1000);
      document.getElementById('open-btn').addEventListener('click', openSecureLink);
      </script>
      </body>
      </html>
    `);
}

// ==========================================
// MINI APP IP-BASED ANTI-CHEAT VERIFICATION
// ==========================================
app.get("/verify-miniapp/:userId", async (req, res) => {
  const { userId } = req.params;
  const parsedUserId = parseInt(userId);
  
  if (isNaN(parsedUserId)) {
    return res.status(400).send("Invalid User ID format.");
  }

  let userIp = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (userIp && userIp.includes(",")) {
    userIp = userIp.split(",")[0].trim();
  }

  try {
    const db = client.db("Mytho");
    const ipVerificationCollection = db.collection("ip_verification");

    const duplicateIpRecord = await ipVerificationCollection.findOne({
      ip: userIp,
      userId: { $ne: parsedUserId }
    });

    if (duplicateIpRecord) {
      return res.send(`
        ${THEME_CSS}
        <div class="container">
          <div class="card" style="border-color: #ff4757; box-shadow: 0 8px 32px 0 rgba(255, 71, 87, 0.37);">
            <h2 style="color: #ff4757; text-shadow: 0 0 10px rgba(255, 71, 87, 0.5);">Access Denied</h2>
            <p>Multiple account usage detected from this network connection.</p>
            <p style="font-size: 13px; color: #ccc; margin-top: 15px;">Your Activity Has Been Logged.</p>
            <p style="font-size: 11px; color: #888;">Network Node: ${userIp}</p>
          </div>
        </div>
      `);
    }

    await ipVerificationCollection.updateOne(
      { userId: parsedUserId },
      { $set: { ip: userIp, verified_at: new Date() } },
      { upsert: true }
    );

    await usersCollection.updateOne(
      { user_id: parsedUserId },
      { $set: { is_verified: true, verification_ip: userIp } },
      { upsert: true }
    );

    return res.send(`
      ${THEME_CSS}
      <div class="container">
        <div class="card" style="border-color: #00ffcc; box-shadow: 0 8px 32px 0 rgba(0, 255, 204, 0.2);">
          <h2 style="color: #00ffcc; text-shadow: 0 0 10px rgba(0, 255, 204, 0.5);">Verified Successfully</h2>
          <p>Your device integrity check passed.</p>
          <p style="color: #aaa; font-size: 14px;">You can now close this Mini App and return to the bot to continue.</p>
        </div>
      </div>
    `);

  } catch (error) {
    console.error("Error during Mini App validation:", error);
    return res.status(500).send("Internal Server Error verification check.");
  }
});

// ==========================================
// SCRATCH CARD ROUTES (unchanged)
// ==========================================

app.get("/verify-scratch-ad/:userId/:token", async (req, res) => {
    const { userId, token } = req.params;

    if (!isRefererValid(req)) {
        return renderBypassError(res);
    }

    const finalBotLink = `https://t.me/MythoSerialBot?start=scratch_${token}`;
    renderSecureFinalPage(res, finalBotLink);
});

// UPDATED renderScratchAppHTML with Monetag integration
function renderScratchAppHTML(userId, token, currentPoints, reward) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Premium Scratch Card</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
        <meta name="monetag" content="dd375c54069194ddf7fada46bc8b141b">
        <script src='//libtl.com/sdk.js' data-zone='9055307' data-sdk='show_9055307'></script>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #d500f9;
                --gold-light: #FFDF00;
                --gold-dark: #D4AF37;
                --bg-dark: #000000;
            }
            
            * { box-sizing: border-box; }
            
            body {
                margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Poppins', sans-serif;
                background: #000000;
                background-image: radial-gradient(circle at 50% -20%, rgba(213,0,249,0.14) 0%, transparent 55%),
                                   radial-gradient(circle at 15% 90%, rgba(213,0,249,0.06) 0%, transparent 50%);
                color: #fff; display: flex; flex-direction: column; align-items: center; 
                min-height: 100vh; overflow: hidden; user-select: none;
                -webkit-font-smoothing: antialiased;
            }

            .bg-glow {
                position: absolute; width: 100vw; height: 100vh;
                background: radial-gradient(circle at 50% 40%, rgba(213, 0, 249, 0.14) 0%, transparent 60%);
                animation: pulseGlow 4s ease-in-out infinite alternate;
                z-index: 0; pointer-events: none;
            }

            @keyframes pulseGlow {
                0% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            .profile-card {
                position: relative; z-index: 10;
                background: rgba(28,28,30,0.7);
                backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%);
                width: 90%; max-width: 400px; border-radius: 22px; 
                padding: 16px 18px; margin-top: 25px;
                border: 0.5px solid rgba(255, 255, 255, 0.12);
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);
                display: flex; align-items: center; gap: 14px;
            }

            .profile-img {
                width: 52px; height: 52px; border-radius: 14px;
                border: 2px solid rgba(213, 0, 249, 0.5); object-fit: cover;
                background: #1a1a1a; box-shadow: 0 4px 14px rgba(213, 0, 249, 0.35);
            }

            .profile-info { flex-grow: 1; }
            .profile-info h3 { margin: 0 0 2px 0; font-size: 16px; font-weight: 600; letter-spacing: -0.2px; }
            .profile-info p { margin: 0; font-size: 12px; color: #98989d; }
            
            .stats-badge {
                background: rgba(48, 209, 88, 0.15); border: 0.5px solid rgba(48, 209, 88, 0.3);
                color: #30d158; padding: 5px 11px; border-radius: 20px;
                font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;
                margin-top: 8px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .stats-badge.points-updating {
                background: rgba(255, 223, 0, 0.2);
                border-color: var(--gold-light);
                color: var(--gold-light);
                box-shadow: 0 0 20px rgba(255, 223, 0, 0.6);
                transform: scale(1.1);
            }

            .floating-points {
                position: absolute; top: 50%; left: 50%;
                transform: translate(-50%, -50%); z-index: 100;
                font-size: 28px; font-weight: 800; color: var(--gold-light);
                text-shadow: 0 0 15px rgba(255, 223, 0, 0.8), 0 5px 15px rgba(0,0,0,0.5);
                pointer-events: none; opacity: 0;
            }

            @keyframes floatToWallet {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -80%) scale(1.2); }
                80% { opacity: 1; transform: translate(-50%, -200px) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -250px) scale(0.8); }
            }

            .scratch-wrapper {
                position: relative; z-index: 10; margin-top: 50px;
                width: 280px; height: 280px; border-radius: 28px;
                background: linear-gradient(135deg, #3a0088, #d500f9 55%, #ff3ec9);
                padding: 4px; box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(213, 0, 249, 0.35);
                animation: float 6s ease-in-out infinite;
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-15px); box-shadow: 0 35px 70px rgba(0,0,0,0.9), 0 0 60px rgba(213, 0, 249, 0.55); }
            }

            .scratch-inner {
                position: relative; width: 100%; height: 100%;
                border-radius: 24px; background: radial-gradient(circle at top, #1a0033, #000);
                overflow: hidden;
            }

            .reward-layer {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; flex-direction: column; justify-content: center; align-items: center;
                opacity: 0; transform: scale(0.5); transition: all 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .reward-layer.revealed { opacity: 1; transform: scale(1); }

            .reward-layer h1 { 
                font-size: 65px; margin: 0; 
                background: linear-gradient(to bottom, #FFFDE4, #FFDF00, #D4AF37);
                -webkit-background-clip: text; color: transparent;
                text-shadow: 0 15px 25px rgba(0,0,0,0.5);
                line-height: 1;
            }
            .reward-layer p { 
                margin: 8px 0 0 0; font-size: 15px; color: #fff; 
                letter-spacing: 4px; text-transform: uppercase; font-weight: 800;
                background: rgba(213, 0, 249, 0.2); padding: 6px 16px; border-radius: 20px;
                border: 1px solid rgba(213, 0, 249, 0.4);
            }
            
            canvas {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                z-index: 2; cursor: pointer; border-radius: 20px;
            }

            .btn-close {
                position: relative; z-index: 10; margin-top: 45px;
                background: linear-gradient(180deg, #b74bff, #9526e8);
                border: none; padding: 15px 36px; color: white; font-weight: 600;
                border-radius: 16px; font-size: 17px; letter-spacing: -0.2px;
                box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 10px 24px rgba(149, 38, 232, 0.4);
                cursor: pointer; display: none;
                transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s;
                opacity: 0; transform: translateY(20px);
            }

            .btn-close.show { display: block; animation: slideUpFade 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
            @keyframes slideUpFade { to { opacity: 1; transform: translateY(0); } }
            .btn-close:active { transform: scale(0.95); }

            /* ---- MONETAG OVERLAY ---- */
            .ad-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85); z-index: 20; border-radius: 20px;
                display: flex; flex-direction: column; justify-content: center; align-items: center;
                backdrop-filter: blur(20px) saturate(150%);
            }
            .ad-btn {
                background: linear-gradient(180deg, #32d74b, #248a3d);
                border: none; padding: 12px 24px; color: white; font-weight: 600;
                border-radius: 14px; font-size: 15px; cursor: pointer;
                box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 20px rgba(48, 209, 88, 0.35);
                transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .ad-btn:active { transform: scale(0.95); }
        </style>
    </head>
    <body>

        <div class="bg-glow"></div>

        <div class="profile-card">
            <img src="" alt="DP" class="profile-img" id="user-dp">
            <div class="profile-info">
                <h3 id="user-name">Loading...</h3>
                <p id="user-username-id">ID: ...</p>
                <div class="stats-badge" id="stats-badge">
                    <span id="user-points">${currentPoints}</span> MP
                </div>
            </div>
        </div>

        <div id="floating-reward" class="floating-points">+${reward}</div>

        <div class="scratch-wrapper">
            <div class="scratch-inner" id="scratch-container">
                <!-- Monetag overlay -->
                <div class="ad-overlay" id="ad-overlay">
                    <h3 style="margin-bottom:15px; font-size:20px; color:white;">Card is Locked 🔒</h3>
                    <button class="ad-btn" onclick="unlockWithAd()">▶ Watch Ad to Unlock</button>
                    <p style="margin-top:15px; font-size:12px; color:#aaa;">Complete the ad to scratch your card</p>
                </div>
                <div class="reward-layer" id="reward-layer">
                    <h1 id="reward-text">+${reward}</h1>
                    <p>Earned</p>
                </div>
                <canvas id="scratchCanvas" width="280" height="280"></canvas>
            </div>
        </div>

        <button class="btn-close" id="closeBtn" onclick="Telegram.WebApp.close()">Awesome! Return to Bot</button>

        <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            
            const user = tg.initDataUnsafe?.user;
            if (user) {
                document.getElementById('user-name').innerText = user.first_name + (user.last_name ? ' ' + user.last_name : '');
                
                if (user.username) {
                    document.getElementById('user-username-id').innerText = '@' + user.username + ' | ID: ' + user.id;
                } else {
                    document.getElementById('user-username-id').innerText = 'ID: ' + user.id;
                }

                if (user.photo_url) {
                    document.getElementById('user-dp').src = user.photo_url;
                }
            }

            let canScratch = false;

            function unlockWithAd() {
                show_9055307().then(() => {
                    document.getElementById('ad-overlay').style.display = 'none';
                    canScratch = true;
                    tg.HapticFeedback.notificationOccurred('success');
                }).catch((error) => {
                    alert("Ad failed or closed early. Please try again.");
                    console.error("Monetag Error:", error);
                });
            }

            const canvas = document.getElementById('scratchCanvas');
            const ctx = canvas.getContext('2d');
            let isDrawing = false;
            let isRevealed = false;
            let lastHapticTime = 0;
            
            function drawPremiumFoil() {
                const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                grad.addColorStop(0, "#D4AF37");
                grad.addColorStop(0.3, "#FFFDE4");
                grad.addColorStop(0.5, "#AA8000");
                grad.addColorStop(0.7, "#FFFDE4");
                grad.addColorStop(1, "#8A6300");
                
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    const noise = (Math.random() - 0.5) * 40; 
                    pixels[i] += noise;     
                    pixels[i+1] += noise;   
                    pixels[i+2] += noise;   
                }
                ctx.putImageData(imgData, 0, 0);

                ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
                ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

                ctx.shadowColor = "rgba(0,0,0,0.6)";
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 4;
                
                ctx.font = '800 28px "Poppins", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('SCRATCH ME', canvas.width/2, canvas.height/2 + 10);
                
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;
            }

            drawPremiumFoil();

            function getPosition(e) {
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                return { x: clientX - rect.left, y: clientY - rect.top };
            }

            function scratch(e) {
                if (!isDrawing || isRevealed || !canScratch) return;
                e.preventDefault();
                const pos = getPosition(e);
                
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2); 
                ctx.fill();
                
                const now = Date.now();
                if (now - lastHapticTime > 70) {
                    tg.HapticFeedback.impactOccurred('light');
                    lastHapticTime = now;
                }
                
                checkReveal();
            }

            canvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
            canvas.addEventListener('mousemove', scratch);
            window.addEventListener('mouseup', () => isDrawing = false);
            canvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); }, {passive: false});
            canvas.addEventListener('touchmove', scratch, {passive: false});
            window.addEventListener('touchend', () => isDrawing = false);

            function checkReveal() {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                let transparentCount = 0;
                for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) transparentCount++; }
                
                const percent = (transparentCount / (pixels.length / 4)) * 100;
                if (percent > 45 && !isRevealed) {
                    isRevealed = true;
                    canvas.style.transition = 'opacity 0.4s ease-out';
                    canvas.style.opacity = '0';
                    
                    setTimeout(() => {
                        canvas.style.display = 'none';
                        document.getElementById('reward-layer').classList.add('revealed');
                        triggerCelebration();
                        claimReward();
                    }, 400);
                }
            }

            function triggerCelebration() {
                tg.HapticFeedback.notificationOccurred('success');
                const end = Date.now() + 2000;
                (function frame() {
                    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFDF00', '#d500f9', '#00e676'] });
                    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FFDF00', '#d500f9', '#00e676'] });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());
            }

            async function claimReward() {
                try {
                    const response = await fetch('/api/claim-scratch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: ${userId}, token: '${token}' })
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        const badge = document.getElementById('stats-badge');
                        const pointsEl = document.getElementById('user-points');
                        const floater = document.getElementById('floating-reward');
                        const reward = data.reward;
                        
                        floater.style.animation = 'floatToWallet 1.8s forwards cubic-bezier(0.2, 0.8, 0.2, 1)';
                        
                        setTimeout(() => {
                            badge.classList.add('points-updating');
                            
                            let current = parseInt(pointsEl.innerText);
                            const target = current + reward;
                            
                            const interval = setInterval(() => {
                                if (current >= target) {
                                    clearInterval(interval);
                                    pointsEl.innerText = target;
                                    
                                    tg.HapticFeedback.impactOccurred('heavy');
                                    
                                    setTimeout(() => badge.classList.remove('points-updating'), 800);
                                    document.getElementById('closeBtn').classList.add('show');
                                } else {
                                    current++;
                                    pointsEl.innerText = current;
                                    tg.HapticFeedback.impactOccurred('light');
                                }
                            }, 60);
                        }, 800);
                    }
                } catch (error) {
                    console.error("Failed to claim:", error);
                }
            }
        </script>
    </body>
    </html>
    `;
}

app.get("/scratch-app/:userId/:token", async (req, res) => {
    const { userId, token } = req.params;
    const uid = parseInt(userId);

    const session = await scratchCollection.findOne({ user_id: uid, token: token });
    if (!session || !session.ad_completed) {
        return res.send(`<h2>Access Denied. Please complete the ad link first.</h2>`);
    }
    if (session.scratched) {
        return res.send(`<h2>You have already claimed this scratch card!</h2>`);
    }

    let reward = session.reward;
    if (!reward) {
        reward = Math.floor(Math.random() * 15) + 1; 
        await scratchCollection.updateOne({ _id: session._id }, { $set: { reward } });
    }

    const user = await usersCollection.findOne({ user_id: uid }) || {};
    const mythopoints = user.mythopoints || 0;

    res.send(renderScratchAppHTML(uid, token, mythopoints, reward));
});

app.post("/api/claim-scratch", async (req, res) => {
    const { userId, token } = req.body;
    const uid = parseInt(userId);

    const session = await scratchCollection.findOne({ user_id: uid, token: token });
    
    if (!session || session.scratched || !session.ad_completed) {
        return res.status(400).json({ success: false, error: "Invalid session or already claimed." });
    }

    const reward = session.reward;
    const today = new Date().toISOString().split('T')[0];

    await scratchCollection.updateOne({ _id: session._id }, { $set: { scratched: true } });
    
    await usersCollection.updateOne(
        { user_id: uid },
        { 
            $inc: { mythopoints: reward },
            $set: { last_scratch_date: today }
        },
        { upsert: true }
    );
    try {
        await mpHistoryCollection.insertOne({
            user_id: parseInt(userId),
            amount: reward,
            type: "EARNED",
            reason: "Daily Scratch Card Reward",
            date: new Date()
        });
        console.log(`✅ Logged ${reward} MythoPoints for user ${uid}`);
    } catch (err) {
        console.error("Failed to log transaction:", err);
    }

    res.json({ success: true, reward: reward });
});

// ==========================================
// 1. ADD THIS: SCRATCH CARD HISTORY API
// (Place this right after your existing "/api/claim-scratch" route)
// ==========================================
app.get("/api/scratch/history/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        // Fetch all scratch cards for the user, newest first
        const cards = await scratchCollection.find({ user_id: uid }).sort({ _id: -1 }).toArray();
        res.json({ success: true, cards });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// SPIN & WIN (Web Version) – NEW
// ==========================================

// Helper to compute next spin time (midnight UTC after last_spin_date)
function getNextSpinTime(lastSpinDate) {
    if (!lastSpinDate) return new Date(); // now
    const parts = lastSpinDate.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const next = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
    return next;
}

// Helper to format countdown
function formatCountdown(ms) {
    if (ms <= 0) return "Available now!";
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

// GET /api/spin/status/:userId
app.get("/api/spin/status/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        if (isNaN(uid)) return res.status(400).json({ success: false, error: "Invalid userId" });

        const user = await usersCollection.findOne({ user_id: uid }) || {};
        const lastSpinDate = user.last_spin_date || null; // format "YYYY-MM-DD"
        const streak = user.streak || 0;
        const today = new Date().toISOString().split('T')[0];
        const canSpin = lastSpinDate !== today;

        const nextSpinTime = getNextSpinTime(lastSpinDate);
        const now = new Date();
        const msUntilNext = Math.max(0, nextSpinTime.getTime() - now.getTime());

        // Also check if the user has an active web spin session (to allow double)
        let session = null;
        if (lastSpinDate === today) {
            session = await webSpinSessionsCollection.findOne({ user_id: uid });
        }

        const roll = session ? session.roll : null;
        const doubleUsed = session ? session.double_used : false;

        res.json({
            success: true,
            canSpin,
            streak,
            lastSpinDate,
            nextSpinTime: nextSpinTime.toISOString(),
            countdown: formatCountdown(msUntilNext),
            roll: roll,
            doubleUsed: doubleUsed,
            hasActiveSession: !!session
        });
    } catch (error) {
        console.error("Spin status error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// POST /api/spin/do/:userId
app.post("/api/spin/do/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        if (isNaN(uid)) return res.status(400).json({ success: false, error: "Invalid userId" });

        const user = await usersCollection.findOne({ user_id: uid });
        const today = new Date().toISOString().split('T')[0];
        const lastSpinDate = user?.last_spin_date || null;

        if (lastSpinDate === today) {
            return res.status(400).json({ success: false, error: "Already spun today." });
        }

        // Generate random roll 1-6
        const roll = Math.floor(Math.random() * 6) + 1;

        // Streak logic
        let streak = user?.streak || 0;
        let bonus = 0;
        if (lastSpinDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            if (lastSpinDate === yesterdayStr) {
                streak += 1;
            } else {
                streak = 1;
            }
        } else {
            streak = 1;
        }

        if (streak >= 7) {
            bonus = 100;
            streak = 0; // reset streak after bonus
        }

        const pointsToAdd = roll + bonus;

        // Update user
        await usersCollection.updateOne(
            { user_id: uid },
            {
                $inc: { mythopoints: pointsToAdd },
                $set: {
                    last_spin_date: today,
                    streak: streak
                }
            },
            { upsert: true }
        );

        // Log transaction
        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: roll,
            type: "EARNED",
            reason: "Spin & Win (Web)",
            date: new Date()
        });
        if (bonus > 0) {
            await mpHistoryCollection.insertOne({
                user_id: uid,
                amount: bonus,
                type: "EARNED",
                reason: "7-Day Streak Bonus (Web)",
                date: new Date()
            });
        }

        // Create a spin session for double
        await webSpinSessionsCollection.updateOne(
            { user_id: uid },
            {
                $set: {
                    user_id: uid,
                    roll: roll,
                    double_used: false,
                    created_at: new Date()
                }
            },
            { upsert: true }
        );

        const updatedUser = await usersCollection.findOne({ user_id: uid });
        res.json({
            success: true,
            roll: roll,
            bonus: bonus,
            pointsAdded: pointsToAdd,
            newBalance: updatedUser?.mythopoints || 0,
            streak: streak,
            canDouble: true
        });
    } catch (error) {
        console.error("Spin error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// POST /api/spin/double/:userId
app.post("/api/spin/double/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        if (isNaN(uid)) return res.status(400).json({ success: false, error: "Invalid userId" });

        const session = await webSpinSessionsCollection.findOne({ user_id: uid });
        if (!session) {
            return res.status(400).json({ success: false, error: "No spin session found. Spin first." });
        }
        if (session.double_used) {
            return res.status(400).json({ success: false, error: "Double already used for this spin." });
        }

        const roll = session.roll;
        // Add the same amount again
        await usersCollection.updateOne(
            { user_id: uid },
            { $inc: { mythopoints: roll } }
        );

        // Mark double as used
        await webSpinSessionsCollection.updateOne(
            { _id: session._id },
            { $set: { double_used: true } }
        );

        // Log transaction
        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: roll,
            type: "EARNED",
            reason: "Spin Double (Web)",
            date: new Date()
        });

        const updatedUser = await usersCollection.findOne({ user_id: uid });
        res.json({
            success: true,
            pointsAdded: roll,
            newBalance: updatedUser?.mythopoints || 0
        });
    } catch (error) {
        console.error("Double error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// ========================
// ENTRY POINTS (unchanged)
// ========================
app.get("/link/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;
  
  try {
    const adData = await searchAdsCollection.findOne({
      $and: [
        { $or: [ { verify_token: token }, { token: token } ] },
        { $or: [ { user_id: parseInt(userId) }, { user_id: userId.toString() } ] }
      ]
    });
    
    if (!adData) {
      return res.send(`
        <!DOCTYPE html><html><head>${THEME_CSS}</head><body>
        <div class="container">
          <h2 class="error-title">Invalid or Expired Link</h2>
          <p>System couldn't find your record in database.</p>
          <a href="https://t.me/MythoSerialBot">Return to Bot</a>
        </div></body></html>
      `);
    }
    
    const target = adData.short_url || adData.url; 
    if (!target) return res.send(`<!DOCTYPE html><html><head>${THEME_CSS}</head><body><div class="container"><h2 class="error-title">Error: Target missing</h2></div></body></html>`);
    
    renderAntiBypassPage(res, target);
    
  } catch (error) {
    res.redirect('https://t.me/MythoSerialBot');
  }
});

app.get("/link/:hex", (req, res) => {
  const { hex } = req.params;
  try {
    const targetUrl = Buffer.from(hex, 'hex').toString('utf-8');
    new URL(targetUrl);
    renderAntiBypassPage(res, targetUrl);
  } catch (error) {
    res.redirect('https://t.me/MythoSerialBot');
  }
});

app.get("/verify/:prefix/:userId/:token", async (req, res) => {
  const { prefix, userId, token } = req.params;

  if (!isRefererValid(req)) {
    return renderBypassError(res);
  }

  try {
      const adData = await searchAdsCollection.findOne({
        $and: [
          { $or: [ { verify_token: token }, { token: token } ] },
          { $or: [ { user_id: parseInt(userId) }, { user_id: userId.toString() } ] }
        ]
      });

      if (!adData) {
        return res.send(`<!DOCTYPE html><html><head>${THEME_CSS}</head><body><div class="container"><h2 class="error-title">Verification record not found.</h2></div></body></html>`);
      }

      const trueBotToken = adData.bot_token || adData.token || token;
      const finalBotLink = `https://t.me/MythoSerialBot?start=${prefix}_${userId}_${trueBotToken}`;
      
      renderSecureFinalPage(res, finalBotLink);

  } catch (error) {
      res.redirect('https://t.me/MythoSerialBot');
  }
});

app.get("/generate/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = crypto.randomBytes(8).toString("hex");

  await doubleCollection.insertOne({
    token, user_id: userId, used: false, created_at: new Date()
  });

  const protectedLink = `https://${req.hostname}/double/${userId}/${token}`;
  res.send(`
    <!DOCTYPE html><html><head>${THEME_CSS}</head><body>
    <div class="container">
      <h2>Token generated!</h2>
      <p>Copy this link and shorten it with shortxlinks:</p>
      <div style="background:rgba(0,0,0,0.5); padding:10px; border-radius:5px; word-wrap:break-word; color:#ea80fc;">
        <code>${protectedLink}</code>
      </div>
    </div></body></html>
  `);
});

app.get("/double/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;

  if (!isRefererValid(req)) {
    return renderBypassError(res);
  }

  await doubleCollection.updateOne(
    { user_id: userId, token },
    { $set: { used: true, used_at: new Date() } }
  );

  const finalBotLink = `https://t.me/MythoSerialBot?start=double_${userId}_${token}`;
  renderSecureFinalPage(res, finalBotLink);
});

app.get("/shorten", async (req, res) => {
  const { url, userId } = req.query;
  if (!url || !userId) return res.status(400).json({ success: false, error: "Missing url or userId" });
  
  try {
    new URL(url);
    const token = crypto.randomBytes(8).toString("hex");
    const encodedUrl = base62_encode(url);
    const bypassUrl = `https://${req.hostname}/Bypass/${userId}/${token}?t=${encodedUrl}`;
    
    await urlShortenerCollection.insertOne({
      token: token, creator_id: parseInt(userId), target_url: url, encoded_target: encodedUrl, created_at: new Date(), clicks: 0, access_logs: []
    });
    
    res.json({ success: true, original_url: url, bypass_url: bypassUrl, encoded_target: encodedUrl, token: token, user_id: userId });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid URL format" });
  }
});

app.get("/Bypass/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;
  const { t } = req.query;
  
  if (!isRefererValid(req)) {
    return renderBypassError(res);
  }

  let dbRecord = null;
  try {
    dbRecord = await urlShortenerCollection.findOne({ token: token, creator_id: parseInt(userId) });
  } catch (dbError) {}
  
  if (dbRecord) {
    await urlShortenerCollection.updateOne({ token: token }, { $inc: { clicks: 1 } });
    return renderSecureFinalPage(res, dbRecord.target_url);
  }
  
  if (t) {
    try {
      let decodedTarget = null;
      try {
        decodedTarget = base62_decode(t);
        new URL(decodedTarget);
      } catch (e1) {
        decodedTarget = decodeURIComponent(t);
        new URL(decodedTarget);
      }
      
      await urlShortenerCollection.insertOne({
        token: token, creator_id: parseInt(userId), target_url: decodedTarget, encoded_target: t, created_at: new Date(), clicks: 1, access_logs: []
      });
      
      return renderSecureFinalPage(res, decodedTarget);
      
    } catch (error) {
      return res.redirect('https://t.me/MythoSerialBot');
    }
  }
  res.redirect('https://t.me/MythoSerialBot');
});

// ==========================================
// UNIFIED APPLE iOS PROFILE MINI APP (unchanged)
// ==========================================
app.get("/api/ios-profile-data/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        
        const user = await usersCollection.findOne({ user_id: uid });
        
        const history = await mpHistoryCollection
            .find({ user_id: uid })
            .sort({ date: -1 })
            .limit(15)
            .toArray();

        res.json({
            success: true,
            mythopoints: user?.mythopoints || 0,
            is_verified: user?.is_verified || false,
            history: history
        });
    } catch (error) {
        console.error("Profile API Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch unified data" });
    }
});

app.get("/ios-app/:userId", (req, res) => {
    const { userId } = req.params;
    
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
        <title>My Profile</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
            /* iOS System Variables */
            :root {
                --ios-bg: #F2F2F7;
                --ios-card: #FFFFFF;
                --ios-blue: #007AFF;
                --ios-green: #34C759;
                --ios-red: #FF3B30;
                --ios-text: #000000;
                --ios-gray: #8E8E93;
                --ios-light-gray: #E5E5EA;
                --safe-area-bottom: env(safe-area-inset-bottom, 20px);
            }
            
            * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, Helvetica, sans-serif;
                background-color: var(--ios-bg);
                background-image: radial-gradient(circle at 100% 0%, rgba(0,122,255,0.06) 0%, transparent 45%);
                margin: 0; padding: 0; padding-bottom: calc(85px + var(--safe-area-bottom));
                color: var(--ios-text); -webkit-font-smoothing: antialiased; user-select: none;
            }

            .header {
                position: sticky; top: 0; z-index: 50;
                background: rgba(255, 255, 255, 0.78);
                backdrop-filter: blur(24px) saturate(150%); -webkit-backdrop-filter: blur(24px) saturate(150%);
                border-bottom: 0.5px solid rgba(0,0,0,0.08);
                padding: 16px; text-align: center; font-weight: 700; font-size: 17px;
                letter-spacing: -0.4px;
            }

            .card {
                background: var(--ios-card); border-radius: 18px; margin: 16px; padding: 18px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.05);
                border: 0.5px solid rgba(0,0,0,0.04);
            }

            .profile-header { 
                display: flex; align-items: center; gap: 15px; 
                border-bottom: 0.5px solid var(--ios-light-gray); 
                padding-bottom: 16px; margin-bottom: 16px; 
            }
            .profile-pic { 
                width: 64px; height: 64px; border-radius: 50%; 
                object-fit: cover; background: var(--ios-light-gray);
                box-shadow: 0 4px 14px rgba(0,0,0,0.12);
                border: 2px solid #fff;
            }
            .profile-info h2 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
            .profile-info p { margin: 4px 0 0 0; color: var(--ios-gray); font-size: 13px; }
            
            .balance-box { text-align: center; padding: 5px 0; }
            .balance-box h3 { margin: 0; font-size: 12px; color: var(--ios-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; }
            .balance-box .amount { 
                font-size: 40px; font-weight: 800; margin: 8px 0; letter-spacing: -1px;
                background: linear-gradient(135deg, #007AFF, #5856D6);
                -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
            }
            
            .activity-item { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 12px 0; border-bottom: 0.5px solid var(--ios-light-gray); 
            }
            .activity-item:last-child { border-bottom: none; padding-bottom: 0; }
            .act-left p { margin: 0; font-size: 16px; font-weight: 500; letter-spacing: -0.3px; }
            .act-left span { font-size: 13px; color: var(--ios-gray); margin-top: 4px; display: inline-block; }
            .act-right { font-weight: 600; font-size: 16px; }
            .earn { color: var(--ios-green); }
            .spend { color: var(--ios-red); }

            .tab-bar {
                position: fixed; bottom: 0; width: 100%;
                background: rgba(242, 242, 247, 0.85); 
                backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
                border-top: 0.5px solid rgba(0,0,0,0.1);
                display: flex; justify-content: space-around; 
                padding: 10px 0 calc(10px + var(--safe-area-bottom)) 0; z-index: 100;
            }
            .tab-item { 
                display: flex; flex-direction: column; align-items: center; 
                color: var(--ios-gray); cursor: pointer; font-size: 10px; font-weight: 600;
                transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s;
            }
            .tab-item:active { transform: scale(0.88); }
            .tab-item svg { width: 28px; height: 28px; margin-bottom: 3px; fill: currentColor; }
            .tab-item.active { color: var(--ios-blue); }
            
            .tab-content { display: none; }
            .tab-content.active { display: block; animation: fadeUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
            
            @keyframes fadeUp { 
                from { opacity: 0; transform: translateY(10px); } 
                to { opacity: 1; transform: translateY(0); } 
            }
            
            .empty-state { text-align: center; padding: 40px 20px; color: var(--ios-gray); }
        </style>
    </head>
    <body>
        <div class="header" id="header-title">Profile</div>

        <div id="tab-profile" class="tab-content active">
            <div class="card">
                <div class="profile-header">
                    <img id="user-dp" class="profile-pic" src="https://via.placeholder.com/100" alt="DP">
                    <div class="profile-info">
                        <h2 id="user-name">Loading...</h2>
                        <p id="user-id">ID: ...</p>
                    </div>
                </div>
                <div class="balance-box">
                    <h3>Available Balance</h3>
                    <div class="amount" id="mp-balance">0.00</div>
                    <p style="font-size:13px; margin:0;" id="verification-status">Checking Status...</p>
                </div>
            </div>
            
            <div class="card" style="margin-top:0;">
                <h3 style="font-size:16px; margin:0 0 12px 0; font-weight:600;">System Information</h3>
                <div style="display:flex; justify-content:space-between; padding: 12px 0; border-bottom:0.5px solid var(--ios-light-gray);">
                    <span style="font-size:16px;">Daily Rate</span>
                    <span style="color:var(--ios-gray); font-size:16px;">0.0015</span>
                </div>
                 <div style="display:flex; justify-content:space-between; padding: 12px 0;">
                    <span style="font-size:16px;">Bot Node</span>
                    <span style="color:var(--ios-gray); font-size:16px;">Mytho Serial</span>
                </div>
            </div>
        </div>

        <div id="tab-activity" class="tab-content">
            <div style="padding: 0 16px 8px 24px; font-size: 13px; color: var(--ios-gray); text-transform: uppercase;">Recent Transactions</div>
            <div class="card" id="activity-list" style="margin-top: 0;">
                <div class="empty-state">Loading history...</div>
            </div>
        </div>

        <div class="tab-bar">
            <div class="tab-item active" onclick="switchTab('profile', 'Profile', this)">
                <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                Profile
            </div>
            <div class="tab-item" onclick="switchTab('activity', 'Activity History', this)">
                <svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
                Activity
            </div>
        </div>

        <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            tg.setHeaderColor('#F2F2F7'); 
            
            const userId = ${userId};

            const tgUser = tg.initDataUnsafe?.user;
            if (tgUser) {
                document.getElementById('user-name').innerText = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
                
                const uiIdElement = document.getElementById('user-id');
                if (tgUser.username) {
                    uiIdElement.innerText = '@' + tgUser.username + ' | ID: ' + tgUser.id;
                } else {
                    uiIdElement.innerText = 'ID: ' + tgUser.id; 
                }

                if (tgUser.photo_url) {
                    document.getElementById('user-dp').src = tgUser.photo_url;
                }
            } else {
                document.getElementById('user-id').innerText = 'ID: ' + userId;
            }

            function switchTab(tabId, title, element) {
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
                
                document.getElementById('tab-' + tabId).classList.add('active');
                element.classList.add('active');
                document.getElementById('header-title').innerText = title;
                
                tg.HapticFeedback.selectionChanged();
            }

            async function fetchUserData() {
                try {
                    const res = await fetch('/api/ios-profile-data/' + userId);
                    const data = await res.json();
                    
                    if (data.success) {
                        const formattedBalance = Number.isInteger(data.mythopoints) ? 
                            data.mythopoints.toLocaleString() : 
                            data.mythopoints.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4});
                        
                        document.getElementById('mp-balance').innerText = formattedBalance;

                        document.getElementById('verification-status').innerHTML = data.is_verified ? 
                            '<span style="color:var(--ios-green);">✓ Node Verified</span>' : 
                            '<span style="color:var(--ios-red);">! Unverified Device</span>';

                        const list = document.getElementById('activity-list');
                        if (data.history.length === 0) {
                            list.innerHTML = '<div class="empty-state">No recent activity found.</div>';
                        } else {
                            list.innerHTML = data.history.map(item => {
                                const isEarn = item.type === "EARNED";
                                const sign = isEarn ? '+' : '-';
                                const colorClass = isEarn ? 'earn' : 'spend';
                                const dateString = new Date(item.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
                                
                                return \`
                                <div class="activity-item">
                                    <div class="act-left">
                                        <p>\${item.reason || item.type}</p>
                                        <span>\${dateString}</span>
                                    </div>
                                    <div class="act-right \${colorClass}">
                                        \${sign}\${item.amount}
                                    </div>
                                </div>
                                \`;
                            }).join('');
                        }
                    }
                } catch (e) {
                    console.error("Fetch error:", e);
                    document.getElementById('activity-list').innerHTML = '<div class="empty-state" style="color:var(--ios-red);">Failed to connect to database.</div>';
                }
            }
            
            fetchUserData();
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// UNIFIED iOS PURPLE DASHBOARD – ADD RATING & WITHDRAW
// ==========================================

app.get("/api/ios-dashboard-data/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const db = client.db("Mytho");
        const now = Math.floor(Date.now() / 1000);

        const [user, bank, search, premium, stats, history, rating] = await Promise.all([
            usersCollection.findOne({ user_id: uid }),
            bankCollection.findOne({ user_id: uid }),
            searchLimitCollection.findOne({ user_id: uid }),
            premiumUsersCollection.findOne({ user_id: uid }),
            userStatsCollection.findOne({ user_id: uid }),
            mpHistoryCollection.find({ user_id: uid }).sort({ date: -1 }).limit(20).toArray(),
            ratingsCollection.findOne({ _id: uid })
        ]);

        let pendingInterest = 0;
        let activeLoan = false;
        let loanDue = 0;

        if (bank) {
            if (bank.invested > 0) {
                const cycles = Math.floor((now - bank.last_claim_time) / 86400);
                if (cycles > 0) pendingInterest = Math.floor(bank.invested * 0.025 * cycles);
            }
            if (bank.loan_active && bank.loan_principal > 0) {
                activeLoan = true;
                let loanCycles = Math.floor((now - bank.loan_taken_at) / 86400);
                loanCycles = Math.max(1, loanCycles); 
                const calculated_interest = Math.floor(bank.loan_principal * 0.10 * loanCycles);
                loanDue = Math.min(bank.loan_principal + calculated_interest, bank.loan_principal * 5); 
            }
        }

        let isPremium = false;
        let premiumDaysLeft = 0;
        if (premium && premium.expiry_time > now) {
            isPremium = true;
            premiumDaysLeft = Math.ceil((premium.expiry_time - now) / 86400);
        }

        const today = new Date().toISOString().split('T')[0];
        const paymentCount = await paymentLimitCollection.countDocuments({
            user_id: uid,
            date: today
        });

        const allRatings = await ratingsCollection.find({ rating: { $exists: true } }).toArray();
        const totalRatings = allRatings.length;
        const avgRating = totalRatings > 0 ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) : 0;

        res.json({
            success: true,
            profile: {
                mythopoints: user?.mythopoints || 0,
                streak: user?.streak || 0,
                is_verified: user?.is_verified || false,
                referrals: user?.referral_count || 0
            },
            bank: {
                invested: bank?.invested || 0,
                pendingInterest: pendingInterest,
                activeLoan: activeLoan,
                loanDue: loanDue
            },
            search: {
                credits: search?.credits || 0,
                max_credits: 5
            },
            premium: {
                active: isPremium,
                daysLeft: premiumDaysLeft,
                plan: premium?.duration === 30 ? "Gold" : (premium?.duration === 28 ? "Silver" : "Premium")
            },
            stats: {
                lifetimeEarned: stats?.total_points_earned || 0,
                lifetimeSpent: stats?.total_points_spent || 0,
                totalFiles: stats?.lifetime_files || 0
            },
            history: history,
            payment: {
                dailyLimit: 1,
                usedToday: paymentCount
            },
            rating: {
                userRating: rating?.rating || null,
                totalRatings: totalRatings,
                average: avgRating
            }
        });
    } catch (error) {
        console.error("Dashboard API Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
    }
});

// ==========================================
// 🏦 BANKING API (cbank.py logic) – CORRECTED INTEREST RATE
// ==========================================

async function getBank(userId) {
    let bank = await bankCollection.findOne({ user_id: userId });
    if (!bank) {
        bank = {
            user_id: userId,
            loan_active: false,
            loan_principal: 0,
            loan_taken_at: 0,
            invested: 0,
            last_claim_time: Math.floor(Date.now() / 1000),
            notified_for_claim: false
        };
        await bankCollection.insertOne(bank);
    }
    return bank;
}

function calculateInterest(invested, lastClaimTime) {
    if (invested <= 0) return 0;
    const now = Math.floor(Date.now() / 1000);
    const cycles = Math.floor((now - lastClaimTime) / 86400);
    if (cycles < 1) return 0;
    return Math.floor(invested * 0.025 * cycles);
}

function calculateLoanDue(principal, takenAt) {
    if (principal <= 0) return 0;
    const now = Math.floor(Date.now() / 1000);
    let cycles = Math.floor((now - takenAt) / 86400);
    cycles = Math.max(1, cycles);
    const interest = Math.floor(principal * 0.10 * cycles);
    const total = principal + interest;
    return Math.min(total, principal * 5);
}

app.get("/api/bank/status/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const bank = await getBank(uid);
        const invested = bank.invested || 0;
        const pending = calculateInterest(invested, bank.last_claim_time);
        const loanActive = bank.loan_active || false;
        const loanDue = loanActive ? calculateLoanDue(bank.loan_principal, bank.loan_taken_at) : 0;

        res.json({
            success: true,
            invested,
            pendingInterest: pending,
            loanActive,
            loanDue,
            loanPrincipal: bank.loan_principal || 0
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/bank/invest/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Invalid amount" });

        const bank = await getBank(uid);
        const user = await usersCollection.findOne({ user_id: uid });
        if (!user) return res.status(404).json({ success: false, error: "User not found" });
        if (user.mythopoints < amount) return res.status(400).json({ success: false, error: "Insufficient balance" });

        const pending = calculateInterest(bank.invested, bank.last_claim_time);
        if (pending > 0) {
            return res.status(400).json({ success: false, error: "Claim pending interest before investing" });
        }

        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: -amount } });
        await bankCollection.updateOne(
            { user_id: uid },
            {
                $inc: { invested: amount },
                $set: { last_claim_time: Math.floor(Date.now() / 1000) }
            }
        );

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: amount,
            type: "SPENT",
            reason: "Invested into MythoFund",
            date: new Date()
        });

        res.json({ success: true, message: `Added ${amount} to investment.` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/bank/withdraw/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Invalid amount" });

        const bank = await getBank(uid);
        if (bank.invested < amount) return res.status(400).json({ success: false, error: "Not enough invested" });

        const pending = calculateInterest(bank.invested, bank.last_claim_time);
        if (pending > 0) {
            return res.status(400).json({ success: false, error: "Claim pending interest before withdrawing" });
        }

        await bankCollection.updateOne(
            { user_id: uid },
            {
                $inc: { invested: -amount },
                $set: { last_claim_time: Math.floor(Date.now() / 1000) }
            }
        );

        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: amount } });

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: amount,
            type: "EARNED",
            reason: "Withdrew from MythoFund",
            date: new Date()
        });

        res.json({ success: true, message: `Withdrew ${amount} from investment.` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/bank/claim/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const bank = await getBank(uid);
        const pending = calculateInterest(bank.invested, bank.last_claim_time);

        if (pending < 1) return res.status(400).json({ success: false, error: "No interest to claim" });

        const now = Math.floor(Date.now() / 1000);
        const cycles = Math.floor((now - bank.last_claim_time) / 86400);
        const newClaimTime = bank.last_claim_time + (cycles * 86400);

        await bankCollection.updateOne(
            { user_id: uid },
            { $set: { last_claim_time: newClaimTime, notified_for_claim: false } }
        );

        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: pending } });

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: pending,
            type: "EARNED",
            reason: `MythoFund Interest (${cycles} cycles)`,
            date: new Date()
        });

        res.json({ success: true, claimed: pending });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/bank/loan/apply/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const bank = await getBank(uid);
        if (bank.loan_active) return res.status(400).json({ success: false, error: "Loan already active" });

        const principal = 100;
        await bankCollection.updateOne(
            { user_id: uid },
            {
                $set: {
                    loan_active: true,
                    loan_principal: principal,
                    loan_taken_at: Math.floor(Date.now() / 1000)
                }
            }
        );

        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: principal } });

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: principal,
            type: "EARNED",
            reason: "Bank Loan Disbursed",
            date: new Date()
        });

        res.json({ success: true, message: `Loan of ${principal} MythoPoints granted.` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/bank/loan/repay/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const bank = await getBank(uid);
        if (!bank.loan_active) return res.status(400).json({ success: false, error: "No active loan" });

        const due = calculateLoanDue(bank.loan_principal, bank.loan_taken_at);
        const user = await usersCollection.findOne({ user_id: uid });
        if (!user || user.mythopoints < due) return res.status(400).json({ success: false, error: "Insufficient balance" });

        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: -due } });

        await bankCollection.updateOne(
            { user_id: uid },
            {
                $set: {
                    loan_active: false,
                    loan_principal: 0,
                    loan_taken_at: 0
                }
            }
        );

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: due,
            type: "SPENT",
            reason: `Loan Repayment (Interest: ${due - bank.loan_principal})`,
            date: new Date()
        });

        res.json({ success: true, message: `Repaid ${due} MythoPoints.` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 🛍️ STORE API (cstore.py logic) – unchanged
// ==========================================

async function generateCoupon(userId, discount) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await couponsCollection.insertOne({
        code: code,
        user_id: userId,
        discount: discount,
        used: false,
        created: Math.floor(Date.now() / 1000),
        expiry: Math.floor(Date.now() / 1000) + 30 * 86400
    });
    return code;
}

app.post("/api/store/purchase/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { item } = req.body;

        const user = await usersCollection.findOne({ user_id: uid });
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const items = {
            credits: { cost: 50, name: "5 Search Credits" },
            skip_cooldown: { cost: 50, name: "Skip Cooldown" },
            mystery: { cost: 100, name: "Mystery Box" },
        };
        const couponCosts = { 10: 200, 20: 500, 30: 800, 40: 1000, 50: 1500 };

        let cost = 0;
        let action = null;

        if (item === 'credits') {
            cost = items.credits.cost;
            action = async () => {
                await searchLimitCollection.updateOne(
                    { user_id: uid },
                    { $inc: { credits: 5 }, $set: { last_search: 0 } },
                    { upsert: true }
                );
                return { message: "Added 5 search credits." };
            };
        } else if (item === 'skip_cooldown') {
            cost = items.skip_cooldown.cost;
            action = async () => {
                await searchLimitCollection.updateOne(
                    { user_id: uid },
                    { $set: { last_search: 0 } },
                    { upsert: true }
                );
                return { message: "Cooldown skipped!" };
            };
        } else if (item === 'mystery') {
            cost = items.mystery.cost;
            action = async () => {
                const rewards = ["jackpot", "credits", "coupon", "nothing"];
                const weights = [10, 40, 30, 20];
                const outcome = rewards[weights.reduce((acc, w, i) => {
                    const r = Math.random() * 100;
                    return r < w ? i : acc;
                }, 0)];

                let result = "";
                if (outcome === "jackpot") {
                    await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: 300 } });
                    await mpHistoryCollection.insertOne({ user_id: uid, amount: 300, type: "EARNED", reason: "Mystery Jackpot", date: new Date() });
                    result = "Jackpot! You won 300 Mythopoints!";
                } else if (outcome === "credits") {
                    await searchLimitCollection.updateOne({ user_id: uid }, { $inc: { credits: 10 } }, { upsert: true });
                    result = "You found 10 Search Credits!";
                } else if (outcome === "coupon") {
                    const code = await generateCoupon(uid, 15);
                    result = `You found a 15% OFF coupon! Code: ${code}`;
                } else {
                    result = "The box was empty.";
                }
                return { message: result };
            };
        } else if (item.startsWith('coupon_')) {
            const discount = parseInt(item.split('_')[1]);
            if (!couponCosts[discount]) return res.status(400).json({ success: false, error: "Invalid coupon" });
            cost = couponCosts[discount];
            action = async () => {
                const code = await generateCoupon(uid, discount);
                return { message: `Coupon ${discount}% OFF generated! Code: ${code}` };
            };
        } else {
            return res.status(400).json({ success: false, error: "Invalid item" });
        }

        if (user.mythopoints < cost) return res.status(400).json({ success: false, error: "Insufficient Mythopoints" });

        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: -cost } });
        const result = await action();

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: cost,
            type: "SPENT",
            reason: `Purchased ${item}`,
            date: new Date()
        });

        res.json({ success: true, message: result.message });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 💸 PAYMENT API – WITH CHAT SUPPORT (UPDATED)
// ==========================================

async function canMakePayment(userId) {
    const today = new Date().toISOString().split('T')[0];
    const count = await paymentLimitCollection.countDocuments({
        user_id: userId,
        date: today
    });
    return count < 1;
}

app.post("/api/payment/send", async (req, res) => {
    try {
        const { senderId, receiverId, amount } = req.body;

        const sender = parseInt(senderId);
        const receiver = parseInt(receiverId);
        const amt = parseInt(amount);

        if (!sender || !receiver || !amt) {
            return res.status(400).json({ success: false, error: "Missing fields." });
        }
        if (sender === receiver) {
            return res.status(400).json({ success: false, error: "Cannot send to yourself." });
        }
        if (amt < 200) {
            return res.status(400).json({ success: false, error: "Minimum payment is 200 Mythopoints." });
        }

        const canPay = await canMakePayment(sender);
        if (!canPay) {
            return res.status(400).json({ success: false, error: "Daily payment limit reached (1 per day)." });
        }

        const senderDoc = await usersCollection.findOne({ user_id: sender });
        const receiverDoc = await usersCollection.findOne({ user_id: receiver });
        if (!senderDoc || !receiverDoc) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        const senderIpRecord = await ipVerificationCollection.findOne({ userId: sender });
        const receiverIpRecord = await ipVerificationCollection.findOne({ userId: receiver });
        if (!senderIpRecord || !receiverIpRecord) {
            return res.status(400).json({ success: false, error: "Both users must be verified." });
        }
        if (senderIpRecord.ip === receiverIpRecord.ip) {
            return res.status(400).json({ success: false, error: "Same IP detected. Multiple accounts not allowed." });
        }

        if (senderDoc.mythopoints < amt) {
            return res.status(400).json({ success: false, error: "Insufficient balance." });
        }

        const tax = Math.floor(amt * 0.15);
        const receiverAmount = amt - tax;

        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                await usersCollection.updateOne(
                    { user_id: sender },
                    { $inc: { mythopoints: -amt } },
                    { session }
                );
                await usersCollection.updateOne(
                    { user_id: receiver },
                    { $inc: { mythopoints: receiverAmount } },
                    { session }
                );
                const today = new Date().toISOString().split('T')[0];
                await paymentLimitCollection.insertOne({
                    user_id: sender,
                    date: today,
                    receiver: receiver,
                    amount: amt,
                    tax: tax,
                    receiverAmount: receiverAmount,
                    timestamp: new Date()
                }, { session });
                await mpHistoryCollection.insertOne({
                    user_id: sender,
                    amount: amt,
                    type: "SPENT",
                    reason: `Payment to ${receiver}`,
                    date: new Date()
                }, { session });
                await mpHistoryCollection.insertOne({
                    user_id: receiver,
                    amount: receiverAmount,
                    type: "EARNED",
                    reason: `Payment from ${sender}`,
                    date: new Date()
                }, { session });
                await mpHistoryCollection.insertOne({
                    user_id: 0,
                    amount: tax,
                    type: "TAX",
                    reason: `Tax on payment ${sender}->${receiver}`,
                    date: new Date()
                }, { session });
                
                // Save payment chat message with read status
                await paymentChatCollection.insertOne({
                    senderId: sender,
                    receiverId: receiver,
                    amount: amt,
                    receiverAmount: receiverAmount,
                    tax: tax,
                    message: `💸 Payment of ${amt} Mythopoints sent!`,
                    timestamp: new Date(),
                    type: 'payment',
                    read: false,
                    reactions: [],
                    deletedFor: [],
                    messageId: new Date().getTime().toString() + Math.random().toString(36).substr(2, 5)
                });
            });
            await session.endSession();
        } catch (error) {
            await session.endSession();
            throw error;
        }

        res.json({
            success: true,
            message: `Payment sent! Receiver gets ${receiverAmount} Mythopoints (tax: ${tax}).`
        });
    } catch (e) {
        console.error("Payment error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get("/api/users/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, users: [] });

        const query = {
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { first_name: { $regex: q, $options: 'i' } },
            ]
        };
        const numericQ = parseInt(q);
        if (!isNaN(numericQ)) {
            query.$or.push({ user_id: numericQ });
        }

        const users = await usersCollection.find(query)
            .limit(10)
            .project({ user_id: 1, username: 1, first_name: 1, mythopoints: 1, photo_url: 1 })
            .toArray();

        const formatted = users.map(u => ({
            id: u.user_id,
            name: u.first_name || u.username || `User ${u.user_id}`,
            username: u.username || null,
            points: u.mythopoints || 0,
            photo_url: u.photo_url || null
        }));

        res.json({ success: true, users: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// PAYMENT CHAT API (UPDATED with reactions, deletion, read receipts)
// ==========================================

// Track online status - update user session
app.post("/api/payment/online", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });
        
        const uid = parseInt(userId);
        await userSessionsCollection.updateOne(
            { userId: uid },
            { 
                $set: { 
                    lastSeen: new Date(),
                    isOnline: true
                } 
            },
            { upsert: true }
        );
        
        // Clean up old sessions (older than 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 120000);
        await userSessionsCollection.updateMany(
            { lastSeen: { $lt: twoMinutesAgo } },
            { $set: { isOnline: false } }
        );
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Check online status of a user
app.get("/api/payment/online-status/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const session = await userSessionsCollection.findOne({ userId: uid });
        
        const isOnline = session?.isOnline || false;
        const lastSeen = session?.lastSeen || null;
        
        res.json({ 
            success: true, 
            isOnline,
            lastSeen: lastSeen ? lastSeen.toISOString() : null
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Get chat messages for a user
app.get("/api/payment/chat/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const otherId = req.query.otherId ? parseInt(req.query.otherId) : null;
        
        let query = {
            $or: [{ senderId: uid }, { receiverId: uid }]
        };
        
        if (otherId) {
            query = {
                $or: [
                    { senderId: uid, receiverId: otherId },
                    { senderId: otherId, receiverId: uid }
                ]
            };
        }
        
        const chats = await paymentChatCollection
            .find(query)
            .sort({ timestamp: -1 })
            .limit(100)
            .toArray();
        
        // Get user details for each chat
        const userIds = new Set();
        chats.forEach(c => {
            userIds.add(c.senderId);
            userIds.add(c.receiverId);
        });
        const users = await usersCollection
            .find({ user_id: { $in: Array.from(userIds) } })
            .project({ user_id: 1, first_name: 1, username: 1, photo_url: 1 })
            .toArray();
        const userMap = {};
        users.forEach(u => userMap[u.user_id] = u);
        
        const formatted = chats.map(c => {
            const sender = userMap[c.senderId] || { first_name: `User ${c.senderId}` };
            const receiver = userMap[c.receiverId] || { first_name: `User ${c.receiverId}` };
            return {
                ...c,
                senderName: sender.first_name || sender.username || `User ${c.senderId}`,
                senderPhoto: sender.photo_url || null,
                receiverName: receiver.first_name || receiver.username || `User ${c.receiverId}`,
                receiverPhoto: receiver.photo_url || null,
                isSent: c.senderId === uid,
                isDeleted: c.deletedFor ? c.deletedFor.includes(uid) : false
            };
        });
        
        res.json({ success: true, chats: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Get recent chats with unread counts
app.get("/api/payment/recent/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        
        const chats = await paymentChatCollection.find({
            $or: [{ senderId: uid }, { receiverId: uid }]
        }).sort({ timestamp: -1 }).toArray();

        const recentUsersMap = new Map();
        const userIds = new Set();

        chats.forEach(c => {
            const sId = Number(c.senderId);
            const rId = Number(c.receiverId);
            
            let otherId = (sId === uid) ? rId : sId;
            if (otherId === uid) return;

            if (!recentUsersMap.has(otherId)) {
                recentUsersMap.set(otherId, {
                    lastMessage: c.message || 'Payment transaction',
                    timestamp: c.timestamp,
                    unreadCount: 0,
                    lastMessageId: c.messageId || c._id.toString()
                });
                userIds.add(otherId);
            }
            
            // If message is from other user and not read
            if (sId === otherId && !c.read) {
                recentUsersMap.get(otherId).unreadCount += 1;
            }
            
            // Update last message if this one is newer
            const existing = recentUsersMap.get(otherId);
            if (new Date(c.timestamp) > new Date(existing.timestamp)) {
                existing.lastMessage = c.message || 'Payment transaction';
                existing.timestamp = c.timestamp;
                existing.lastMessageId = c.messageId || c._id.toString();
            }
        });

        // Also get online status for these users
        const userSessions = await userSessionsCollection
            .find({ userId: { $in: Array.from(userIds) } })
            .toArray();
        const sessionMap = {};
        userSessions.forEach(s => sessionMap[s.userId] = s);

        const users = await usersCollection
            .find({ user_id: { $in: Array.from(userIds) } })
            .project({ user_id: 1, first_name: 1, username: 1, photo_url: 1 })
            .toArray();

        const formatted = users.map(u => {
            const session = sessionMap[u.user_id] || {};
            return {
                id: u.user_id,
                name: u.first_name || u.username || `User ${u.user_id}`,
                username: u.username || null,
                photo_url: u.photo_url || null,
                lastMessage: recentUsersMap.get(u.user_id)?.lastMessage || '',
                timestamp: recentUsersMap.get(u.user_id)?.timestamp || new Date(0),
                unreadCount: recentUsersMap.get(u.user_id)?.unreadCount || 0,
                isOnline: session.isOnline || false,
                lastSeen: session.lastSeen || null
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({ success: true, recent: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Mark messages as read
app.post("/api/payment/chat/mark-read", async (req, res) => {
    try {
        const { userId, otherId } = req.body;
        if (!userId || !otherId) {
            return res.status(400).json({ success: false, error: "Missing userId or otherId" });
        }
        
        const result = await paymentChatCollection.updateMany(
            { 
                senderId: parseInt(otherId), 
                receiverId: parseInt(userId), 
                read: { $ne: true } 
            },
            { $set: { read: true } }
        );
        
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Send a chat message
app.post("/api/payment/chat/message", async (req, res) => {
    try {
        const { senderId, receiverId, message, senderName } = req.body;
        if (!senderId || !receiverId || !message) {
            return res.status(400).json({ success: false, error: "Missing fields." });
        }
        
        const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        const result = await paymentChatCollection.insertOne({
            senderId: parseInt(senderId),
            receiverId: parseInt(receiverId),
            message: message,
            timestamp: new Date(),
            type: 'message',
            read: false,
            reactions: [],
            deletedFor: [],
            messageId: messageId
        });

        // 🚀 ADVANCED TELEGRAM NOTIFICATION (Node.js equivalent of your Pyrogram code)
        // Ensure you have BOT_TOKEN in your Koyeb/environment variables!
        const botToken = process.env.BOT_TOKEN;
        if (botToken) {
            const dashboardUrl = `https://mythobot.koyeb.app/mini/${receiverId}`;
            const sName = senderName || "a user";
            
            // Fire and forget Telegram API call
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: receiverId,
                    text: `📩 You have a new message from **${sName}**!`,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📱 Open MythoApp",
                                    web_app: { url: dashboardUrl }
                                }
                            ]
                        ]
                    }
                })
            }).catch(e => console.error("Telegram Notify Error:", e));
        }
        
        res.json({ success: true, messageId: messageId });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Add reaction to a message
app.post("/api/payment/chat/reaction", async (req, res) => {
    try {
        const { messageId, userId, reaction } = req.body;
        if (!messageId || !userId || !reaction) {
            return res.status(400).json({ success: false, error: "Missing fields." });
        }
        
        const uid = parseInt(userId);
        const existing = await paymentChatCollection.findOne({ messageId: messageId });
        if (!existing) {
            return res.status(404).json({ success: false, error: "Message not found." });
        }
        
        // Remove existing reaction from this user if any
        const reactions = existing.reactions || [];
        const filtered = reactions.filter(r => r.userId !== uid);
        
        // Add new reaction
        filtered.push({ userId: uid, reaction: reaction, timestamp: new Date() });
        
        await paymentChatCollection.updateOne(
            { messageId: messageId },
            { $set: { reactions: filtered } }
        );
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Delete a message for self (soft delete)
app.post("/api/payment/chat/delete", async (req, res) => {
    try {
        const { messageId, userId } = req.body;
        if (!messageId || !userId) {
            return res.status(400).json({ success: false, error: "Missing fields." });
        }
        
        const uid = parseInt(userId);
        const existing = await paymentChatCollection.findOne({ messageId: messageId });
        if (!existing) {
            return res.status(404).json({ success: false, error: "Message not found." });
        }
        
        const deletedFor = existing.deletedFor || [];
        if (!deletedFor.includes(uid)) {
            deletedFor.push(uid);
        }
        
        await paymentChatCollection.updateOne(
            { messageId: messageId },
            { $set: { deletedFor: deletedFor } }
        );
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Clear chat history for self
app.post("/api/payment/chat/clear", async (req, res) => {
    try {
        const { userId, otherId } = req.body;
        if (!userId || !otherId) {
            return res.status(400).json({ success: false, error: "Missing fields." });
        }
        
        const uid = parseInt(userId);
        const oid = parseInt(otherId);
        
        // Find all messages between these two users
        const messages = await paymentChatCollection.find({
            $or: [
                { senderId: uid, receiverId: oid },
                { senderId: oid, receiverId: uid }
            ]
        }).toArray();
        
        // Add userId to deletedFor for each message
        for (const msg of messages) {
            const deletedFor = msg.deletedFor || [];
            if (!deletedFor.includes(uid)) {
                deletedFor.push(uid);
            }
            await paymentChatCollection.updateOne(
                { _id: msg._id },
                { $set: { deletedFor: deletedFor } }
            );
        }
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Get unread message count for a user
app.get("/api/payment/unread/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        
        const count = await paymentChatCollection.countDocuments({
            receiverId: uid,
            read: { $ne: true }
        });
        
        // Also get count per sender
        const unreadBySender = await paymentChatCollection.aggregate([
            { $match: { receiverId: uid, read: { $ne: true } } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } }
        ]).toArray();
        
        const bySender = {};
        unreadBySender.forEach(item => {
            bySender[item._id] = item.count;
        });
        
        res.json({ 
            success: true, 
            total: count,
            bySender: bySender
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// ⭐ RATING API
// ==========================================

app.get("/api/rating/status/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const userRating = await ratingsCollection.findOne({ _id: uid });
        const allRatings = await ratingsCollection.find({ rating: { $exists: true } }).toArray();
        const total = allRatings.length;
        const avg = total > 0 ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / total) : 0;

        res.json({
            success: true,
            userRating: userRating?.rating || null,
            totalRatings: total,
            average: avg
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/rating/submit/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { rating } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: "Rating must be 1-5." });
        }

        const existing = await ratingsCollection.findOne({ _id: uid });
        if (existing && existing.rating) {
            return res.status(400).json({ success: false, error: "You already rated." });
        }

        const pointsToAdd = 10;
        const user = await usersCollection.findOne({ user_id: uid });
        const currentPoints = user?.mythopoints || 0;
        const newPoints = currentPoints + pointsToAdd;

        await ratingsCollection.updateOne(
            { _id: uid },
            { $set: { rating: rating } },
            { upsert: true }
        );
        await usersCollection.updateOne(
            { user_id: uid },
            { $set: { mythopoints: newPoints } }
        );

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: pointsToAdd,
            type: "EARNED",
            reason: `Rated Bot ${rating} Stars`,
            date: new Date()
        });

        res.json({
            success: true,
            message: `Thanks for rating ${rating} ⭐! You earned ${pointsToAdd} MythoPoints.`,
            newPoints: newPoints
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 💰 WITHDRAW API (cwithdraw.py logic)
// ==========================================

const CONVERSION_RATE = 10000; // 10,000 pts = ₹1

app.post("/api/withdraw/request/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { amount, method } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Invalid amount." });
        if (!method) return res.status(400).json({ success: false, error: "Method required." });

        const pointsNeeded = amount * CONVERSION_RATE;
        const user = await usersCollection.findOne({ user_id: uid });
        if (!user) return res.status(404).json({ success: false, error: "User not found." });
        if (user.mythopoints < pointsNeeded) {
            return res.status(400).json({ success: false, error: `Insufficient points. Need ${pointsNeeded}.` });
        }

        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: -pointsNeeded } });

        const withdrawId = `${uid}_${Date.now()}`;
        const request = {
            _id: withdrawId,
            user_id: uid,
            amount: amount,
            points: pointsNeeded,
            method: method,
            status: "Pending",
            created_at: new Date().toISOString()
        };
        await withdrawsCollection.insertOne(request);

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: pointsNeeded,
            type: "SPENT",
            reason: `Withdraw Request (₹${amount} via ${method})`,
            date: new Date()
        });

        res.json({
            success: true,
            message: `Withdraw request created! ₹${amount} via ${method} (Pending).`,
            requestId: withdrawId
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get("/api/withdraw/history/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const requests = await withdrawsCollection.find({ user_id: uid })
            .sort({ created_at: -1 })
            .limit(10)
            .toArray();

        res.json({ success: true, requests });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// NEW: SYNC PROFILE API
// ==========================================
app.post("/api/sync-profile", async (req, res) => {
    try {
        const { userId, photo_url } = req.body;
        if (!userId || !photo_url) {
            return res.status(400).json({ success: false, error: "Missing userId or photo_url" });
        }
        const uid = parseInt(userId);
        if (isNaN(uid)) {
            return res.status(400).json({ success: false, error: "Invalid userId" });
        }

        await usersCollection.updateOne(
            { user_id: uid },
            { $set: { photo_url: photo_url } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Sync profile error:", error);
        res.status(500).json({ success: false, error: "Failed to sync profile" });
    }
});

// ==========================================
// USER SETTINGS API (Persistent)
// ==========================================
app.post("/api/settings/save", async (req, res) => {
    try {
        const { userId, settings } = req.body;
        const uid = parseInt(userId);
        if (isNaN(uid)) return res.status(400).json({ success: false, error: "Invalid userId" });
        
        // Merge with existing settings to preserve any other fields
        await userSettingsCollection.updateOne(
            { user_id: uid },
            { 
                $set: { 
                    ...settings,
                    updated_at: new Date()
                } 
            },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Settings save error:", error);
        res.status(500).json({ success: false, error: "Failed to save settings" });
    }
});

app.get("/api/settings/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        if (isNaN(uid)) return res.status(400).json({ success: false, error: "Invalid userId" });
        
        let settings = await userSettingsCollection.findOne({ user_id: uid });
        if (!settings) {
            // Default settings
            settings = {
                user_id: uid,
                sound: true,
                haptic: true,
                visual: true,
                privacy: false,
                pillNav: false,
                shortNum: false,
                forceVerify: false,
                created_at: new Date()
            };
            await userSettingsCollection.insertOne(settings);
        }
        
        // Remove MongoDB _id before sending
        const { _id, ...settingsWithoutId } = settings;
        res.json({ success: true, settings: settingsWithoutId });
    } catch (error) {
        console.error("Settings fetch error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch settings" });
    }
});

// ==========================================
// CHANT & EARN (Tap to Earn) – UPDATED WITH 1 SECOND COOLDOWN
// ==========================================

// In-memory rate limiting: last sync timestamps per user
const userTapHistory = new Map();

app.get("/api/chant/stats/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const stats = await userStatsCollection.findOne({ user_id: uid });
        const totalTaps = stats?.chant_taps || 0;
        res.json({ success: true, totalTaps });
    } catch (e) {
        res.status(500).json({ success: false, error: "Failed to fetch chant stats." });
    }
});

app.post("/api/chant/sync/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { newTaps } = req.body;  // number of new taps since last sync
        if (typeof newTaps !== 'number' || newTaps <= 0) {
            return res.status(400).json({ success: false, error: "Invalid taps count." });
        }

        // --- ANTI-CHEAT: rate limiting ---
        const now = Date.now();
        const history = userTapHistory.get(uid) || [];
        // Keep only last 10 requests
        history.push(now);
        if (history.length > 10) history.shift();
        userTapHistory.set(uid, history);

        if (history.length >= 2) {
            const timeSpan = now - history[0];
            const avgTapsPerSec = (newTaps) / (timeSpan / 1000);
            // Allow maximum 1 tap per second (strict 1/sec)
            if (avgTapsPerSec > 1.5) {
                return res.status(429).json({ success: false, error: "Too many taps! Maximum 1 tap per second." });
            }
        }

        // Fetch current stats
        let stats = await userStatsCollection.findOne({ user_id: uid });
        if (!stats) {
            // Initialize
            await userStatsCollection.insertOne({
                user_id: uid,
                chant_taps: 0,
                total_points_earned: 0,
                total_points_spent: 0,
                lifetime_files: 0
            });
            stats = await userStatsCollection.findOne({ user_id: uid });
        }

        const oldTotal = stats.chant_taps || 0;
        const newTotal = oldTotal + newTaps;
        const pointsEarned = Math.floor(newTotal / 1000) - Math.floor(oldTotal / 1000); // how many new 1000-thresholds crossed

        let mythopointsAdded = 0;
        if (pointsEarned > 0) {
            // Add points to user
            await usersCollection.updateOne(
                { user_id: uid },
                { $inc: { mythopoints: pointsEarned } }
            );
            // Log each point separately or as one entry? We'll log total points earned in one history entry.
            await mpHistoryCollection.insertOne({
                user_id: uid,
                amount: pointsEarned,
                type: "EARNED",
                reason: `Chant & Earn Reward: ${pointsEarned} Mythopoint(s) for ${pointsEarned * 1000} taps`,
                date: new Date()
            });
            mythopointsAdded = pointsEarned;
        }

        // Update total taps
        await userStatsCollection.updateOne(
            { user_id: uid },
            { $set: { chant_taps: newTotal } }
        );

        res.json({
            success: true,
            totalTaps: newTotal,
            pointsAdded: mythopointsAdded,
            newBalance: (await usersCollection.findOne({ user_id: uid }))?.mythopoints || 0
        });

    } catch (e) {
        console.error("Chant sync error:", e);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
});

// ==========================================
// CHANT LEADERBOARD (top by total taps)
// ==========================================
app.get("/api/chant/leaderboard", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const top = await userStatsCollection
            .find({ chant_taps: { $gt: 0 } })
            .sort({ chant_taps: -1 })
            .limit(limit)
            .toArray();

        // Fetch user details (name, photo) for each
        const userIds = top.map(s => s.user_id);
        const users = await usersCollection
            .find({ user_id: { $in: userIds } })
            .project({ user_id: 1, first_name: 1, username: 1, photo_url: 1 })
            .toArray();
        const userMap = {};
        users.forEach(u => userMap[u.user_id] = u);

        const leaderboard = top.map(s => {
            const user = userMap[s.user_id] || {};
            return {
                userId: s.user_id,
                name: user.first_name || user.username || `User ${s.user_id}`,
                photo: user.photo_url || null,
                taps: s.chant_taps || 0
            };
        });

        res.json({ success: true, leaderboard });
    } catch (e) {
        console.error("Chant leaderboard error:", e);
        res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
});

// ==========================================
// REFERRAL LEADERBOARD API
// ==========================================
app.get("/api/referral/leaderboard", async (req, res) => {
    try {
        const users = await usersCollection.find(
            { referral_count: { $gt: 0 } }
        ).sort({ referral_count: -1 }).limit(10).project({ 
            user_id: 1, first_name: 1, username: 1, referral_count: 1, photo_url: 1 
        }).toArray();

        const formatted = users.map(u => ({
            name: u.first_name || u.username || `User ${u.user_id}`,
            refs: u.referral_count || 0,
            photo: u.photo_url || null
        }));

        res.json({ success: true, leaderboard: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// LEADERBOARD API (UPDATED: includes photo_url)
// ==========================================
app.get("/api/leaderboard/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { timeframe = "all", page = 1 } = req.query;
        const limit = 10;
        const skip = (parseInt(page) - 1) * limit;

        let pointField = "mythopoints";
        if (timeframe === "weekly") pointField = "weekly_points";
        if (timeframe === "monthly") pointField = "monthly_points";

        const query = {};
        query[pointField] = { $gt: 0 };

        const totalUsers = await usersCollection.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit) || 1;

        const users = await usersCollection
            .find(query)
            .sort({ [pointField]: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const formattedUsers = users.map(u => {
            let rawUsername = u.username || u.user_name || u.Username || u.UserName || null;
            let safeUsername = null;
            if (rawUsername && typeof rawUsername === 'string' && rawUsername.trim() !== '') {
                safeUsername = rawUsername.trim().startsWith('@') 
                    ? rawUsername.trim() 
                    : `@${rawUsername.trim()}`;
            }
            let rawName = u.name || u.first_name || null;
            if (!rawName) {
                if (safeUsername) {
                    rawName = safeUsername;
                } else {
                    rawName = `User ${u.user_id}`;
                }
            }
            let finalName = String(rawName); 
            if (finalName.length > 15) {
                finalName = finalName.substring(0, 15) + "..";
            }
            return {
                user_id: u.user_id,
                name: finalName,
                username: safeUsername,
                points: u[pointField] || 0,
                title: getRankTitle(u[pointField] || 0),
                photo_url: u.photo_url || null
            };
        });

        let currentUser = null;
        const userDoc = await usersCollection.findOne({ user_id: uid });
        if (userDoc && userDoc[pointField] > 0) {
            const rankQuery = {};
            rankQuery[pointField] = { $gt: userDoc[pointField] };
            const higherCount = await usersCollection.countDocuments(rankQuery);
            currentUser = {
                points: userDoc[pointField],
                rank: higherCount + 1,
                title: getRankTitle(userDoc[pointField])
            };
        }

        res.json({
            success: true,
            page: parseInt(page),
            totalPages: totalPages,
            users: formattedUsers,
            currentUser: currentUser
        });
    } catch (error) {
        console.error("Leaderboard API Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
});

// ==========================================
// HISTORY API (unchanged)
// ==========================================
app.get("/api/history/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { filter = "ALL", page = 1 } = req.query;
        const limit = 15;
        const skip = (parseInt(page) - 1) * limit;

        let query = { user_id: uid };
        if (filter !== "ALL") {
            query.type = filter.toUpperCase();
        }

        const historyRecords = await mpHistoryCollection
            .find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        res.json({ 
            success: true, 
            history: historyRecords 
        });
    } catch (error) {
        console.error("History API Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch history" });
    }
});

// ==========================================
// WATCH & EARN CLAIM API (Limit: 5/day)
// ==========================================
app.post("/api/watch-earn/claim/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const today = new Date().toISOString().split('T')[0];
        const user = await usersCollection.findOne({ user_id: uid });
        
        const watchCount = (user?.watch_earn_date === today) ? (user?.watch_earn_count || 0) : 0;
        
        if (watchCount >= 5) {
            return res.status(400).json({ success: false, error: "Daily limit of 5 ads reached! Come back tomorrow." });
        }

        const reward = Math.floor(Math.random() * 3) + 1;

        await usersCollection.updateOne(
            { user_id: uid },
            { 
                $inc: { mythopoints: reward },
                $set: { 
                    watch_earn_date: today,
                    watch_earn_count: watchCount + 1
                }
            },
            { upsert: true }
        );

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: reward,
            type: "EARNED",
            reason: `Watched Ad for points (${watchCount + 1}/5)`,
            date: new Date()
        });

        const updatedUser = await usersCollection.findOne({ user_id: uid });

        res.json({ success: true, reward: reward, newBalance: updatedUser.mythopoints });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// MONETAG S2S POSTBACK ENDPOINT
// ==========================================
app.get("/api/monetag-postback", async (req, res) => {
    const userId = req.query.userid;
    const rewardAmt = req.query.reward || 0;
    const transactionId = req.query.tid || "unknown";

    if (!userId) {
        return res.status(400).json({ error: "Missing userid" });
    }

    console.log(`✅ [Monetag] User: ${userId} | Reward: ${rewardAmt} | TID: ${transactionId}`);

    res.status(200).json({ success: true, status: "ok" });
});

// ==========================================
// WATCH AD TO SKIP SEARCH COOLDOWN (WEBAPP)
// ==========================================

app.get("/cooldown-app/:userId", async (req, res) => {
    const uid = parseInt(req.params.userId);
    
    const searchDoc = await searchLimitCollection.findOne({ user_id: uid });
    
    const now = Math.floor(Date.now() / 1000);
    let inCooldown = false;
    let timeRemaining = 0;
    
    if (searchDoc && searchDoc.last_search) {
        const timePassed = now - searchDoc.last_search;
        if (timePassed < 300) { 
            inCooldown = true;
            timeRemaining = 300 - timePassed;
        }
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeStr = minutes + "m " + seconds + "s";

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="monetag" content="dd375c54069194ddf7fada46bc8b141b">
        <title>Skip Cooldown</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script src='//libtl.com/sdk.js' data-zone='9055307' data-sdk='show_9055307'></script>
        ${THEME_CSS}
    </head>
    <body>
        <div class="container">
            <h2 style="font-size: 22px;">Skip Cooldown</h2>
            
            <div id="ui-cooldown-active" style="display: ${inCooldown ? 'block' : 'none'};">
                <div style="font-size:40px; margin-bottom:10px;">⏳</div>
                <p>You have a cooldown period of <b>${timeStr}</b> remaining.</p>
                <p style="font-size: 13px; color: #aaa;">Watch a quick ad to skip the timer instantly!</p>
                <button class="btn" id="watch-ad-btn" style="background: linear-gradient(135deg, #00e676, #00b359);">▶ Watch Ad to Skip</button>
            </div>

            <div id="ui-cooldown-passed" style="display: ${inCooldown ? 'none' : 'block'};">
                <div style="font-size:40px; margin-bottom:10px;">✅</div>
                <p>Your cooldown period has already passed.</p>
                <h3 style="color: #00e676;">You can search now!</h3>
                <button class="btn" onclick="Telegram.WebApp.close()" style="margin-top: 15px;">Return to Bot</button>
            </div>
            
            <div id="loading-msg" style="display:none; color:#ea80fc; margin-top:15px; font-weight:bold;">
                Unlocking... Please wait ⚙️
            </div>
        </div>

        <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            
            const watchBtn = document.getElementById('watch-ad-btn');
            
            if (watchBtn) {
                watchBtn.addEventListener('click', function() {
                    if (typeof show_9055307 !== 'function') {
                        alert('Ad service is still loading. Please try again in a few seconds.');
                        return;
                    }
                    
                    show_9055307().then(() => {
                        tg.HapticFeedback.notificationOccurred('success');
                        document.getElementById('ui-cooldown-active').style.display = 'none';
                        document.getElementById('loading-msg').style.display = 'block';
                        
                        fetch('/api/skip-cooldown/claim/${uid}', { method: 'POST' })
                            .then(res => res.json())
                            .then(data => {
                                document.getElementById('loading-msg').style.display = 'none';
                                if(data.success) {
                                    document.getElementById('ui-cooldown-passed').style.display = 'block';
                                    document.getElementById('ui-cooldown-passed').querySelector('h3').innerText = "Cooldown Skipped Successfully!";
                                } else {
                                    alert("Error skipping cooldown.");
                                }
                            }).catch(err => {
                                alert("Network error while claiming reward.");
                            });

                    }).catch((error) => {
                        alert("Ad failed to load or was closed early.");
                        console.error("Monetag Error:", error);
                    });
                });
            }
        </script>
    </body>
    </html>
    `);
});

app.post("/api/skip-cooldown/claim/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        
        await searchLimitCollection.updateOne(
            { user_id: uid },
            { $set: { last_search: 0 } },
            { upsert: true }
        );

        await mpHistoryCollection.insertOne({
            user_id: uid,
            amount: 0,
            type: "EARNED",
            reason: "Watched Ad to Skip Cooldown",
            date: new Date()
        });

        res.json({ success: true, message: "Cooldown skipped!" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// WATCH AD TO FORWARD (DIAGNOSTIC VERSION)
// ==========================================
app.get("/forward-ad/:userId/:fileId", async (req, res) => {
    const { userId, fileId } = req.params;
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="monetag" content="dd375c54069194ddf7fada46bc8b141b">
        <title>Watch Ad to Forward</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script src="https://libtl.com/sdk.js" data-zone="9055307" data-sdk="show_9055307"></script>
        ${THEME_CSS}
    </head>
    <body>
        <div class="container">
            <div style="font-size:40px; margin-bottom:10px;">🍋</div>
            <h2>Unlock Forward</h2>
            <p>Watch a short ad to instantly get the forwarded file without spending any Mythopoints!</p>
            <button class="btn" id="watch-ad-btn" style="background: linear-gradient(135deg, #00e676, #00b359);">▶ Watch Ad</button>
            <div id="loading-msg" style="display:none; color:#ea80fc; margin-top:15px; font-weight:bold;">
                Verifying... Please wait ⚙️
            </div>
        </div>

        <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            
            console.log("Telegram WebApp state:", tg);

            document.getElementById('watch-ad-btn').addEventListener('click', function() {
                alert("⚙️ System: Click detected successfully!");

                if (typeof show_9055307 !== 'function') {
                    alert("❌ SDK Error: Monetag script failed to load as a function. Type found: " + typeof show_9055307);
                    return;
                }
                
                try {
                    alert("🚀 Calling Monetag SDK Engine...");
                    
                    show_9055307().then(() => {
                        tg.HapticFeedback.notificationOccurred('success');
                        document.getElementById('watch-ad-btn').style.display = 'none';
                        document.getElementById('loading-msg').style.display = 'block';
                        
                        tg.openTelegramLink("https://t.me/MythoSerialBot?start=adfwd_${fileId}");
                        
                        setTimeout(() => {
                            tg.close();
                        }, 1200);
                    }).catch((error) => {
                        alert("⚠️ Monetag Promise Error: " + JSON.stringify(error));
                    });
                } catch (e) {
                    alert("💥 Runtime Crash Error: " + e.message);
                }
            });
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// SERIAL SEARCH DATA - From csearch.py (Only i.ibb.co thumbnails)
// ==========================================

const SERIAL_DATA = {
    "Shiv Shakti": {
        command: "ss",
        seasons: { 1: 914 },
        thumbnail: "https://i.ibb.co/7tvrS3gS/photo-2026-05-12-05-30-43-7641102945387282464.jpg",
        displayName: "Shiv Shakti"
    },
    "Dwarkadheesh": {
        command: "d",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/LP5n2y8/photo-2025-03-31-05-10-27-7599681771140715700.jpg",
        displayName: "Dwarkadheesh"
    },
    "Karmadhikari Shanidev": {
        command: "ksd",
        seasons: { 1: 192 },
        thumbnail: "https://i.ibb.co/gL87Q5v3/photo-2024-12-26-12-12-43-7607751850023976976.jpg",
        displayName: "Karmadhikari Shanidev"
    },
    "Chandra Dev": {
        command: "cd",
        seasons: { 1: 26 },
        thumbnail: "https://i.ibb.co/b5CJMTs0/photo-2024-12-24-15-58-52-7635141346096840728.jpg",
        displayName: "Chandra Dev"
    },
    "Mahishasura Mardini": {
        command: "mm",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/gdS9vwK/photo-2025-01-18-04-14-34-7596564443684411267.jpg",
        displayName: "Mahishasura Mardini"
    },
    "Jai Mahalakshmi": {
        command: "jm",
        seasons: { 1: 34 },
        thumbnail: "https://i.ibb.co/CSC4xJ9/photo-2025-01-27-06-00-27-7635140225110376472.jpg",
        displayName: "Jai Mahalakshmi"
    },
    "Chandra Nandni": {
        command: "cn",
        seasons: { 1: 35, 2: 27, 3: 46, 4: 60, 5: 45, 6: 65, 7: 8 },
        thumbnail: "https://i.ibb.co/hJg0hmqm/photo-2026-05-18-04-45-49-7641088540066971680.jpg",
        displayName: "Chandra Nandni"
    },
    "Brij Ke Gopal": {
        command: "bkg",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/G7JKWzW/photo-2025-02-20-06-30-25-7587769080549142302.jpg",
        displayName: "Brij Ke Gopal"
    },
    "Yashomati Maiya Ke Nandlala": {
        command: "ymkn",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/4RwFsKp/photo-2025-02-02-05-20-58-7579527255950082854.jpg",
        displayName: "Yashomati Maiya Ke Nandlala"
    },
    "Meera": {
        command: "meera",
        seasons: { 1: 134 },
        thumbnail: "https://i.ibb.co/nMNjkkYJ/photo-2026-06-06-04-27-38-7648144999535607836.jpg",
        displayName: "Meera"
    },
    "Bangla": {
        command: "bang",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/7tvrS3gS/photo-2026-05-12-05-30-43-7641102945387282464.jpg",
        displayName: "Bangla"
    },
    "Dharm Yoddha Garud": {
        command: "dyg",
        seasons: { 1: 100, 2: 100, 3: 34 },
        thumbnail: "https://i.ibb.co/3bgFqVD/photo-2026-06-30-03-45-29-7657029629013655556.jpg",
        displayName: "Dharm Yoddha Garud"
    },
    "Siya Ke Ram": {
        command: "skr",
        seasons: { 1: 24, 2: 17, 3: 51, 4: 31, 5: 30, 6: 152 },
        thumbnail: "https://i.ibb.co/HDJN4Dj/photo-2025-04-12-09-41-42-7585272733904694116.jpg",
        displayName: "Siya Ke Ram"
    },
    "Ram Siya Ke Luv Kush": {
        command: "rsklk",
        seasons: { 1: 141 },
        thumbnail: "https://i.ibb.co/FqsNvPJ/photo-2025-04-05-05-23-06-7581052428326426516.jpg",
        displayName: "Ram Siya Ke Luv Kush"
    },
    "Tenali Rama": {
        command: "tr",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/z8yBYK3/photo-2025-06-10-09-13-06-7604925046016847949.jpg",
        displayName: "Tenali Rama"
    },
    "Devon Ke Dev Mahadev": {
        command: "dkdm",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/2gy8jK2/photo-2025-06-23-09-08-07-7611488977898018294.jpg",
        displayName: "Devon Ke Dev Mahadev"
    },
    "Karn Sangini": {
        command: "ks",
        seasons: { 1: 90 },
        thumbnail: "https://i.ibb.co/SpLRp9B/photo-2026-05-30-04-27-17-7645537026673999876.jpg",
        displayName: "Karn Sangini"
    },
    "Mata Saraswati": {
        command: "ms",
        seasons: { 1: 25 },
        thumbnail: "https://i.ibb.co/Hphh3XVR/photo-2024-11-11-15-11-54-7635140409793970192.jpg",
        displayName: "Mata Saraswati"
    },
    "Shri Tirupati Balaji": {
        command: "stb",
        seasons: { 1: 52 },
        thumbnail: "https://i.ibb.co/99MqTqgK/photo-2024-09-01-04-08-23-7635141019679326232.jpg",
        displayName: "Shri Tirupati Balaji"
    },
    "Jag Jaanani Maa Vaishnodevi": {
        command: "jjmv",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/1f7t83D/photo-2025-05-29-04-11-41-7643326846606822532.jpg",
        displayName: "Jag Jaanani Maa Vaishnodevi"
    },
    "Bolo Ambe Maa Ki Jai": {
        command: "maa",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/0FjtCNq/photo-2025-06-16-08-25-03-7609344192725896061.jpg",
        displayName: "Bolo Ambe Maa Ki Jai"
    },
    "Sriman Rama": {
        command: "rama",
        seasons: { 1: 8 },
        thumbnail: "https://i.ibb.co/dsSqBWNm/photo-2025-01-21-07-03-34-7598189848368775196.jpg",
        displayName: "Sriman Rama"
    },
    "The Legend of Hanuman": {
        command: "tloh",
        seasons: { 1: 13, 2: 13, 3: 6, 4: 7, 5: 6, 6: 7 },
        thumbnail: "https://i.ibb.co/pjvX2r5t/photo-2024-12-19-03-29-05-7597807763783155716.jpg",
        displayName: "The Legend of Hanuman"
    },
    "Hatim": {
        command: "hatim",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/DGxwSJz/photo-2025-06-12-07-56-15-7605499944947512450.jpg",
        displayName: "Hatim"
    },
    "Ramanand Sagar Ramayan": {
        command: "rsr",
        seasons: { 1: 50 },
        thumbnail: "https://i.ibb.co/MPjH85p/photo-2025-02-26-05-28-27-7591247647277933692.jpg",
        displayName: "Ramanand Sagar Ramayan"
    },
    "Shrimad Ramayan": {
        command: "sr",
        seasons: { 1: 341 },
        thumbnail: "https://i.ibb.co/51MJLm2/photo-2025-05-08-03-51-37-7587054966308235584.jpg",
        displayName: "Shrimad Ramayan"
    },
    "Ramayan Sabke Jeevan Ka Aadhar": {
        command: "rsjka",
        seasons: { 1: 60 },
        thumbnail: "https://i.ibb.co/ChjNnkh/photo-2025-05-03-13-52-16-7585084653194901950.jpg",
        displayName: "Ramayan Sabke Jeevan Ka Aadhar"
    },
    "Radhakrishn": {
        command: "rk",
        seasons: { 1: 460, 2: 35, 3: 37, 4: 613 },
        thumbnail: "https://i.ibb.co/JRygz3XD/photo-2026-06-02-09-49-26-7646733050511884324.jpg",
        displayName: "Radhakrishn"
    },
    "Veer Hanuman": {
        command: "vh",
        seasons: { 1: 100, 2: 56 },
        thumbnail: "https://i.ibb.co/7nbsg8Y/photo-2025-04-25-05-49-20-7581834215599137296.jpg",
        displayName: "Veer Hanuman"
    },
    "Prithviraj Chauhan": {
        command: "cspc",
        seasons: { 1: 88 },
        thumbnail: "https://i.ibb.co/9mb2C2Vk/photo-2025-07-02-11-27-23-7630099372318916612.jpg",
        displayName: "Prithviraj Chauhan"
    },
    "Suryaputra Karn": {
        command: "spk",
        seasons: { 1: 307 },
        thumbnail: "https://i.ibb.co/xtKFW4wJ/photo-2026-07-27-03-59-33-7667052557969129520.jpg",
        displayName: "Suryaputra Karn"
    },
    "Jai Kanhaiya Laal Ki": {
        command: "jklk",
        seasons: { 1: 185 },
        thumbnail: "https://i.ibb.co/4RWQTrXg/photo-2026-02-18-06-46-44-7608093119535382552.jpg",
        displayName: "Jai Kanhaiya Laal Ki"
    },
    "Kaamdhenu Gaumata": {
        command: "kg",
        seasons: { 1: 52 },
        thumbnail: "https://i.ibb.co/LXNBQTtM/photo-2026-02-04-18-29-30-7604087959452647448.jpg",
        displayName: "Kaamdhenu Gaumata"
    },
    "Kakbhushundi Ramayan": {
        command: "kr",
        seasons: { 1: 104, 2: 104, 3: 104 },
        thumbnail: "https://i.ibb.co/JP8yj2T/photo-2026-07-01-02-43-08-7657384801334198304.jpg",
        displayName: "Kakbhushundi Ramayan"
    },
    "Dhruv Tara": {
        command: "dt",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/cXXCphb/photo-2025-07-18-05-27-07-7616936323912040814.jpg",
        displayName: "Dhruv Tara"
    },
    "Shri Krishna": {
        command: "sk",
        seasons: { 1: 0 },
        thumbnail: "https://i.ibb.co/7nbsg8Y/photo-2025-04-25-05-49-20-7581834215599137296.jpg",
        displayName: "Shri Krishna"
    },
    "Ganesh Kartikey": {
        command: "gk",
        seasons: { 1: 156 },
        thumbnail: "https://i.ibb.co/LDfMvfhG/photo-2025-10-06-14-30-11-7627837255993786376.jpg",
        displayName: "Ganesh Kartikey"
    },
    "Kurukshetra": {
        command: "kurukshetra",
        seasons: { 1: 18 },
        thumbnail: "https://i.ibb.co/JRW0pxQr/photo-2025-10-10-12-07-52-7597691554853027868.jpg",
        displayName: "Kurukshetra"
    },
    "Mahabharat": {
        command: "mb",
        seasons: { 1: 7, 2: 20, 3: 13, 4: 18, 5: 8, 6: 5, 7: 10, 8: 7, 9: 7, 10: 15, 11: 18, 12: 5, 13: 5, 14: 3, 15: 13, 16: 14, 17: 13, 18: 6, 19: 8, 20: 14, 21: 4, 22: 5, 23: 7, 24: 4, 25: 7, 26: 7, 27: 19, 28: 3 },
        thumbnail: "https://i.ibb.co/WD3ZbJ6/photo-2025-04-15-06-58-03-7584404290012614476.jpg",
        displayName: "Mahabharat"
    },
    "Budh Dev": {
        command: "bd",
        seasons: { 1: 26 },
        thumbnail: "https://i.ibb.co/Pz41pj0T/photo-2025-11-13-05-01-06-7635139151368552472.jpg",
        displayName: "Budh Dev"
    },
    "Jai Jagannath": {
        command: "jj",
        seasons: { 1: 272 },
        thumbnail: "https://i.ibb.co/7tvrS3gS/photo-2026-05-12-05-30-43-7641102945387282464.jpg",
        displayName: "Jai Jagannath"
    },
    "Mangal Dev": {
        command: "md",
        seasons: { 1: 25 },
        thumbnail: "https://i.ibb.co/WQrzmtN/photo-2026-05-02-04-06-21-7635140993909522436.jpg",
        displayName: "Mangal Dev"
    },
    "Ramayan (2008)": {
        command: "ry8",
        seasons: { 1: 300 },
        thumbnail: "https://i.ibb.co/k2nKV02c/photo-2025-08-22-06-22-11-7624806520911298588.jpg",
        displayName: "Ramayan (2008)"
    },
    "Ramayan (Luv Kush)": {
        command: "rlk",
        seasons: { 1: 44 },
        thumbnail: "https://i.ibb.co/gyF1rHW/photo-2025-08-08-06-18-37-7619255412413860408.jpg",
        displayName: "Ramayan (Luv Kush)"
    },
    "Shrimad Bhagwat Mahapuran": {
        command: "sbm",
        seasons: { 1: 52 },
        thumbnail: "https://i.ibb.co/Y2DT2Dp/photo-2025-08-02-04-19-24-7617394010198705004.jpg",
        displayName: "Shrimad Bhagwat Mahapuran"
    },
    "Bhakter Bhagaban": {
        command: "bbsk",
        seasons: { 1: 16, 2: 34, 3: 22, 4: 29, 5: 48, 6: 67, 7: 63, 8: 12, 9: 53, 10: 31, 11: 34, 12: 110, 13: 61, 14: 77 },
        thumbnail: "https://i.ibb.co/cSqZC1P3/photo-2026-01-21-04-26-51-7597673988436787208.jpg",
        displayName: "Bhakter Bhagaban"
    },
    "Devi Aadi Parashakti": {
        command: "dap",
        seasons: { 1: 87 },
        thumbnail: "https://i.ibb.co/b7PRhCb/photo-2026-01-22-04-29-40-7597937238579388980.jpg",
        displayName: "Devi Aadi Parashakti"
    },
    "Mahima Shani Dev Ki": {
        command: "msdk",
        seasons: { 1: 235 },
        thumbnail: "https://i.ibb.co/BsG1LtL/photo-2025-06-21-09-22-54-7610940870637037699.jpg",
        displayName: "Mahima Shani Dev Ki"
    },
    "Shani": {
        command: "kds",
        seasons: { 1: 346 },
        thumbnail: "https://i.ibb.co/F8Pp8Vk/photo-2025-05-11-09-16-59-7588264655872797310.jpg",
        displayName: "Shani"
    },
    "Jai Hanuman Sankat Mochan Naam Tiharo": {
        command: "jhsnt",
        seasons: { 1: 89 },
        thumbnail: "https://i.ibb.co/d4nhyG1Y/photo-2026-01-27-05-11-57-7599904785860395040.jpg",
        displayName: "Jai Hanuman Sankat Mochan Naam Tiharo"
    },
    "Chandragupta Maurya": {
        command: "cm",
        seasons: { 1: 105 },
        thumbnail: "https://i.ibb.co/jkvwhjPN/photo-2026-01-25-05-34-26-7599168405127561244.jpg",
        displayName: "Chandragupta Maurya"
    },
    "Baal Shiv": {
        command: "bs",
        seasons: { 1: 215 },
        thumbnail: "https://i.ibb.co/p6QwkdQn/photo-2026-01-23-05-09-37-7598419869637279748.jpg",
        displayName: "Baal Shiv"
    },
    "Raja Shivchhatrapati": {
        command: "rs",
        seasons: { 1: 45 },
        thumbnail: "https://i.ibb.co/KxpQRmfk/photo-2026-02-19-03-54-28-7608419764683145256.jpg",
        displayName: "Raja Shivchhatrapati"
    },
    "Sangamarmar": {
        command: "smm",
        seasons: { 1: 13 },
        thumbnail: "https://i.ibb.co/vxf1jJVH/photo-2026-03-09-06-38-32-7615595993609797652.jpg",
        displayName: "Sangamarmar"
    },
    "Shrimad Ramayan Marathi": {
        command: "srm",
        seasons: { 1: 101 },
        thumbnail: "https://i.ibb.co/d4D80N40/photo-2026-06-27-04-46-27-7655932080185933828.jpg",
        displayName: "Shrimad Ramayan Marathi"
    },
    "Shrimad Ramayan Bangla": {
        command: "srb",
        seasons: { 1: 360 },
        thumbnail: "https://i.ibb.co/ns4ZQk7p/photo-2026-07-20-04-13-28-7664458621060644888.jpg",
        displayName: "Shrimad Ramayan Bangla"
    },
    "Radha Krishna": {
        command: "rkb",
        seasons: { 1: 1072 },
        thumbnail: "https://i.ibb.co/JRygz3XD/photo-2026-06-02-09-49-26-7646733050511884324.jpg",
        displayName: "Radha Krishna"
    },
    "Vighnaharta Ganesh": {
        command: "vg",
        seasons: { 1: 1026 },
        thumbnail: "https://i.ibb.co/v4Tj2nmy/photo-2026-07-04-03-21-38-7658507815023018012.jpg",
        displayName: "Vighnaharta Ganesh"
    },
    "Paapnaashini Ganga": {
        command: "pg",
        seasons: { 1: 88 },
        thumbnail: "https://i.ibb.co/BHSKj76q/photo-2026-07-02-04-41-16-7657786170322976784.jpg",
        displayName: "Paapnaashini Ganga"
    },
    "Hastinapur Ke Veer": {
        command: "hkv",
        seasons: { 1: 50 },
        thumbnail: "https://i.ibb.co/27V2wwnX/photo-2026-06-01-07-35-00-7646327408030646276.jpg",
        displayName: "Hastinapur Ke Veer"
    }
};

// API endpoint to get serial data
app.get("/api/serials", (req, res) => {
    const serials = Object.keys(SERIAL_DATA).map(name => ({
        name,
        displayName: SERIAL_DATA[name].displayName || name,
        command: SERIAL_DATA[name].command,
        thumbnail: SERIAL_DATA[name].thumbnail || "https://i.ibb.co/7tvrS3gS/photo-2026-05-12-05-30-43-7641102945387282464.jpg",
        seasons: SERIAL_DATA[name].seasons,
        totalEpisodes: Object.values(SERIAL_DATA[name].seasons).reduce((a, b) => a + b, 0)
    }));
    res.json({ success: true, serials });
});

// ==========================================
// FAKE TRAP ERROR ROUTE FOR BYPASS BOTS
// ==========================================
app.get("/AntiBypassError", (req, res) => {
    renderBypassError(res);
});


// ==========================================
// REST API TO RECEIVE MINI-APP QUIZZES
// ==========================================
app.post("/api/quiz/create", async (req, res) => {
    try {
        const { userId, title, description, time_per_question, questions } = req.body;
        
        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ success: false, error: "Missing required fields or questions." });
        }

        const category = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

        const metadata = {
            title: title,
            description: description,
            category: category,
            difficulty: "medium",
            time_per_question: time_per_question || 15,
            total_questions: questions.length,
            created_by: parseInt(userId),
            created_at: new Date(),
            is_active: true
        };

        const metaResult = await quizMetadataCollection.insertOne(metadata);
        const quizId = metaResult.insertedId;

        const questionDocs = questions.map(q => ({
            quiz_id: quizId,
            category: category,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            is_active: true,
            is_rapid_fire: q.is_rapid_fire === true 
        }));

        await quizCollection.insertMany(questionDocs);

        res.json({ success: true, quiz_id: quizId.toString(), category: category });

    } catch (e) {
        console.error("Quiz Creation Server Error:", e);
        res.status(500).json({ success: false, error: "Internal Server Error." });
    }
});
        



// ==========================================
// USER ANTI-BYPASS LINK GENERATOR API (WITH SMART TRAP)
// ==========================================
app.post("/api/user_shorten", async (req, res) => {
    try {
        const { user_id, target_url } = req.body;
        if (!user_id || !target_url) {
            return res.status(400).json({ success: false, error: "Missing user_id or target_url" });
        }

        // Verify the URL structure
        new URL(target_url);

        // Fetch the user's active shortener configuration from MongoDB
        const db = client.db("Mytho");
        const shortener = await db.collection("user_shorteners").findOne({ 
            user_id: parseInt(user_id), 
            active: true 
        });

        if (!shortener) {
            return res.status(400).json({ success: false, error: "No active shortener site found. Please use /addsite in the bot first." });
        }

        const { domain, api_token } = shortener;
        const cleanDomain = domain.replace("https://", "").replace("http://", "").replace(/\/$/, "");

        // ==========================================
        // 🔥 SMART FAKE TRAP FOR BYPASS BOTS 🔥
        // ==========================================
        const realToken = crypto.randomBytes(8).toString("hex"); // Hidden secure token
        
        // 1. Fake target ab sidha "Bypass Detected" wale page par le jayega
        const hostUrl = req.get('host') || req.hostname;
        const fakeUrl = `https://${hostUrl}/AntiBypassError`; 
        const fakeEncodedTarget = base62_encode(fakeUrl);
        
        // 2. Shield URL contains the REAL token for DB lookup, but a FAKE encoded target in 't'
        const shieldUrl = `https://${hostUrl}/Bypass/${user_id}/${realToken}?t=${fakeEncodedTarget}`;

        // 3. Save the REAL target in the database tied to the realToken securely
        await urlShortenerCollection.insertOne({
            token: realToken,
            creator_id: parseInt(user_id),
            target_url: target_url, // Real destination safely stored in DB
            encoded_target: "hidden_in_db", 
            created_at: new Date(),
            clicks: 0,
            access_logs: []
        });

        // Call the user's custom AdLinkFly/Shortener API
        const apiUrl = `https://${cleanDomain}/api?api=${api_token}&url=${encodeURIComponent(shieldUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'success' || data.shortenedUrl || data.short_url) {
            let finalUrl = data.shortenedUrl || data.short_url || data.url;
            
            // Force the link to use the exact site domain provided by the user
            try {
                const urlObj = new URL(finalUrl);
                finalUrl = `https://${cleanDomain}${urlObj.pathname}${urlObj.search}`;
            } catch(e) {
                console.error("URL parsing error:", e);
            }

            res.json({ success: true, short_url: finalUrl });
        } else {
            res.status(400).json({ success: false, error: "External shortener API rejected the request", details: data });
        }
    } catch (error) {
        console.error("User Shorten Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error or Invalid URL" });
    }
});


// ==========================================
// MINI APP ROUTE – PREMIUM FRONTEND (UPDATED with Search Section & Persistent Settings)
// ==========================================

app.get("/mini/:userId", (req, res) => {
    const userId = req.params.userId;
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>MythoSerial</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <meta name="monetag" content="dd375c54069194ddf7fada46bc8b141b">
  <script src='//libtl.com/sdk.js' data-zone='9055307' data-sdk='show_9055307'></script>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    /* === RESET & GLOBAL === */
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif;
      background: #000000;
      background-image: radial-gradient(circle at 50% 0%, rgba(101,31,255,0.09) 0%, transparent 55%), 
                        radial-gradient(circle at 80% 80%, rgba(213,0,249,0.05) 0%, transparent 50%);
      color: #ffffff;
      min-height: 100vh;
      padding-bottom: 80px;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      user-select: none;
      -webkit-touch-callout: none;
      letter-spacing: -0.01em;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 10px; }

    /* === GLASS CARD === */
    .glass {
      background: rgba(28,28,30,0.68);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      border: 0.5px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 18px;
      margin: 12px 16px;
      box-shadow: 0 14px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
    }
    .glass-title {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 12px;
      letter-spacing: -0.4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .glass-title svg {
      width: 22px;
      height: 22px;
      fill: #bf5af2;
    }

    /* === SETTINGS MODAL & FEATURES === */
    .settings-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.55); backdrop-filter: blur(20px) saturate(150%); z-index: 900; justify-content: center; align-items: center; }
    .settings-overlay.open { display: flex; animation: fadeIn 0.3s; }
    .settings-box { background: rgba(28,28,30,0.92); backdrop-filter: blur(40px) saturate(180%); border-radius: 22px; width: 90%; max-width: 340px; padding: 22px; border: 0.5px solid rgba(255,255,255,0.12); box-shadow: 0 24px 60px rgba(0,0,0,0.6); max-height: 80vh; overflow-y: auto; }
    .settings-box h3 { margin: 0 0 18px 0; color: #ffffff; text-align: center; font-weight: 600; letter-spacing: -0.3px; }
    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .setting-item:last-child { border-bottom: none; }
    .setting-label { font-size: 14px; color: #fff; font-weight: 500; }
    
    /* Toggle Switch */
    .toggle-switch { position: relative; width: 51px; height: 31px; appearance: none; background: rgba(120,120,128,0.32); border-radius: 31px; outline: none; cursor: pointer; transition: background 0.25s; }
    .toggle-switch:checked { background: #30d158; }
    .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; background: #fff; border-radius: 50%; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 3px 8px rgba(0,0,0,0.25); }
    .toggle-switch:checked::after { transform: translateX(20px); }
    
    /* Privacy Blur */
    .privacy-blur { filter: blur(8px); transition: filter 0.3s; user-select: none; }
    
    /* Floating Pill Nav Modifier */
    .tab-bar.floating-pill { bottom: 15px; width: 92%; left: 4%; border-radius: 30px; border: 0.5px solid rgba(255,255,255,0.1); padding: 8px 0; box-shadow: 0 10px 40px rgba(0,0,0,0.5); background: rgba(28,28,30,0.85); }
    
    /* Settings Gear Icon - Smaller SVG */
    .settings-gear { 
      position: absolute; top: -5px; right: -5px; 
      background: rgba(28,28,30,0.9); border: 1.5px solid #30d158; 
      border-radius: 50%; width: 24px; height: 24px; 
      display: flex; align-items: center; justify-content: center; 
      cursor: pointer; color: #30d158; 
      z-index: 10; transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); 
      box-shadow: 0 2px 10px rgba(48,209,88,0.25);
      padding: 0;
    }
    .settings-gear svg { width: 14px; height: 14px; fill: #30d158; }
    .settings-gear:active { transform: scale(0.85); }

    /* === NAVBAR === */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(32px) saturate(180%);
      -webkit-backdrop-filter: blur(32px) saturate(180%);
      border-bottom: 0.5px solid rgba(255,255,255,0.08);
      padding: 16px 20px;
      text-align: center;
      font-weight: 600;
      font-size: 17px;
      letter-spacing: -0.4px;
      color: #fff;
    }

    /* === TAB CONTENT === */
    .tab-content { display: none; animation: fadeSlide 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
    .tab-content.active { display: block; }
    @keyframes fadeSlide {
      0% { opacity: 0; transform: translateY(16px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    /* === TAB BAR === */
    .tab-bar {
      position: fixed;
      bottom: 0;
      width: 100%;
      background: rgba(0,0,0,0.78);
      backdrop-filter: blur(32px) saturate(180%);
      -webkit-backdrop-filter: blur(32px) saturate(180%);
      border-top: 0.5px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: space-around;
      padding: 8px 0 calc(8px + env(safe-area-inset-bottom, 20px)) 0;
      z-index: 100;
    }
    .tab-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: rgba(255,255,255,0.35);
      font-size: 10px;
      font-weight: 600;
      transition: color 0.2s, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      min-width: 48px;
      position: relative;
    }
    .tab-btn:active { transform: scale(0.88); }
    .tab-btn svg {
      width: 28px;
      height: 28px;
      margin-bottom: 3px;
      fill: currentColor;
      transition: all 0.3s;
    }
    .tab-btn.active { color: #ea80fc; }
    .tab-btn.active svg { fill: #ea80fc; filter: drop-shadow(0 0 10px rgba(234,128,252,0.4)); }
    .tab-btn::after {
      content: '';
      position: absolute;
      top: -2px;
      width: 0;
      height: 2px;
      background: #ea80fc;
      border-radius: 2px;
      transition: width 0.3s;
    }
    .tab-btn.active::after { width: 70%; }
    
    /* Unread badge on pay tab */
    .tab-btn .unread-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff453a;
      color: #fff;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      font-weight: 700;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid #000000;
    }
    .tab-btn .unread-badge.show { display: flex; }

    /* === WIDGETS === */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .widget {
      background: rgba(28,28,30,0.65);
      border: 0.5px solid rgba(255,255,255,0.09);
      border-radius: 20px;
      padding: 16px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(30px) saturate(180%);
      -webkit-backdrop-filter: blur(30px) saturate(180%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .widget:active { transform: scale(0.97); }
    .widget-full { grid-column: span 2; }
    .widget-icon { width: 28px; height: 28px; fill: rgba(255,255,255,0.5); margin-bottom: 8px; }
    .widget-title { 
      font-size: 11px; 
      color: rgba(255,255,255,0.45); 
      font-weight: 500; 
      text-transform: uppercase; 
      letter-spacing: 0.8px; 
      margin-bottom: 4px; 
    }
    .widget-value { 
      font-size: 26px; 
      font-weight: 700; 
      letter-spacing: -0.5px; 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      position: relative;
      color: #ffffff;
    }
    .widget-value .mytho-label {
      position: absolute;
      bottom: -8px;
      right: 0;
      font-size: 10px;
      font-weight: 400;
      color: rgba(255,255,255,0.15);
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .widget-sub { font-size: 12px; color: #ea80fc; margin-top: 4px; font-weight: 500; }
    
    /* Premium Widget Enhanced */
    .w-premium { 
      border: 0.5px solid rgba(255,214,10,0.2); 
      background: linear-gradient(135deg, rgba(255,214,10,0.08), rgba(213,0,249,0.08));
      position: relative;
      overflow: hidden;
    }
    .w-premium::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at center, rgba(255,214,10,0.03), transparent 70%);
      animation: premiumGlow 4s ease-in-out infinite alternate;
      pointer-events: none;
    }
    @keyframes premiumGlow {
      0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
      100% { transform: translate(5%, 5%) scale(1.1); opacity: 1; }
    }
    .w-premium .widget-value { color: #ffd60a; position: relative; z-index: 1; }
    .w-premium .widget-title { color: rgba(255,214,10,0.7); }
    
    .premium-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, #ffd60a, #f59e0b);
      padding: 2px 10px;
      border-radius: 30px;
      font-size: 10px;
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 0 20px rgba(255,214,10,0.3);
    }
    
    .upgrade-btn {
      display: block;
      width: 100%;
      text-align: center;
      margin-top: 14px;
      background: linear-gradient(135deg, #ffd60a, #f59e0b);
      color: #000;
      border: none;
      padding: 10px 16px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(255,214,10,0.3);
      transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.1s;
    }
    .upgrade-btn:active {
      transform: scale(0.92) !important;
      box-shadow: 0 2px 8px rgba(255,214,10,0.6) !important;
    }

    .refill-btn {
      display: block;
      width: 100%;
      text-align: center;
      margin-top: 14px;
      background: linear-gradient(135deg, #0a84ff, #5e5ce6);
      color: #fff;
      border: none;
      padding: 10px 16px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(10,132,255,0.3);
      transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.1s;
    }
    .refill-btn:active {
      transform: scale(0.92) !important;
      box-shadow: 0 2px 8px rgba(10,132,255,0.6) !important;
    }

    .w-search { border: 0.5px solid rgba(10,132,255,0.2); background: linear-gradient(135deg, rgba(10,132,255,0.08), rgba(0,230,118,0.05)); }
    .w-search .widget-value { color: #0a84ff; }
    .w-search .widget-title { color: rgba(10,132,255,0.7); }

    .w-bank { border: 0.5px solid rgba(48,209,88,0.2); background: rgba(48,209,88,0.04); }
    .w-bank .widget-value { color: #30d158; }

    /* === PROFILE HEADER === */
    .profile-hdr {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 16px 16px 8px;
      position: relative;
    }
    .profile-pic {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 2px solid #00e676;
      object-fit: cover;
      background: #1c0a2b;
      box-shadow: 0 0 20px rgba(0,230,118,0.25);
    }
    .profile-info { flex: 1; }
    .profile-info h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .profile-info p { margin: 4px 0 0 0; font-size: 14px; color: #ea80fc; font-weight: 500; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(213,0,249,0.12);
      border-radius: 30px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      margin-top: 6px;
      border: 0.5px solid rgba(213,0,249,0.15);
    }
    .switch-btn {
      background: rgba(255,255,255,0.06);
      border: 0.5px solid rgba(255,255,255,0.08);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: 0.2s;
      color: #ea80fc;
      flex-shrink: 0;
    }
    .switch-btn svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }
    .switch-btn:active { transform: scale(0.9); background: rgba(213,0,249,0.15); }

    /* === SEARCH WIDGET - Google Style === */
    .search-widget {
      margin: 8px 16px 12px;
      border-radius: 30px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .search-widget:active {
      transform: scale(0.97);
      background: rgba(255,255,255,0.1);
    }
    .search-widget svg {
      width: 20px;
      height: 20px;
      fill: rgba(255,255,255,0.4);
      flex-shrink: 0;
    }
    .search-widget .search-text {
      flex: 1;
      color: rgba(255,255,255,0.5);
      font-size: 15px;
      font-weight: 400;
    }
    .search-widget .mic-icon {
      width: 18px;
      height: 18px;
      fill: rgba(255,255,255,0.3);
    }

    /* === SEARCH OVERLAY === */
    .search-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(20px);
      z-index: 800;
      flex-direction: column;
      animation: fadeSlide 0.3s ease;
    }
    .search-overlay.open { display: flex; }
    
    .search-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      gap: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .search-header .back-btn {
      background: none;
      border: none;
      color: #ea80fc;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
    }
    .search-header .back-btn svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }
    .search-header .search-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 10px 16px;
      color: #fff;
      font-size: 16px;
      outline: none;
      transition: border 0.3s;
    }
    .search-header .search-input:focus {
      border-color: #d500f9;
    }
    .search-header .search-input::placeholder {
      color: rgba(255,255,255,0.3);
    }

    .search-serial-row {
      padding: 12px 16px 8px;
      overflow-x: auto;
      white-space: nowrap;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .search-serial-row::-webkit-scrollbar { display: none; }
    
    .serial-chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 30px;
      padding: 6px 14px 6px 6px;
      margin-right: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .serial-chip:active {
      transform: scale(0.95);
      background: rgba(213,0,249,0.15);
    }
    .serial-chip.active {
      border-color: #d500f9;
      background: rgba(213,0,249,0.12);
    }
    .serial-chip img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    .serial-chip span {
      font-size: 13px;
      font-weight: 500;
      color: #fff;
    }

    .search-results-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 8px 16px 20px;
    }

    /* YouTube-style thumbnail grid - one per row */
    .serial-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }
    .serial-list-item {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255,255,255,0.03);
      border-radius: 16px;
      padding: 10px 14px;
      border: 1px solid rgba(255,255,255,0.04);
      cursor: pointer;
      transition: all 0.2s;
    }
    .serial-list-item:active {
      transform: scale(0.97);
      background: rgba(213,0,249,0.08);
    }
    .serial-list-item .thumb {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      object-fit: cover;
      flex-shrink: 0;
      background: rgba(28,28,30,0.95);
    }
    .serial-list-item .info {
      flex: 1;
      min-width: 0;
    }
    .serial-list-item .info .title {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .serial-list-item .info .sub {
      font-size: 12px;
      color: rgba(255,255,255,0.4);
      margin-top: 2px;
    }
    .serial-list-item .arrow {
      color: rgba(255,255,255,0.2);
      flex-shrink: 0;
    }

    .season-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
      margin-top: 8px;
    }
    .season-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 14px 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .season-card:active {
      transform: scale(0.95);
      background: rgba(213,0,249,0.1);
    }
    .season-card .season-num {
      font-size: 18px;
      font-weight: 700;
      color: #ea80fc;
    }
    .season-card .season-eps {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      margin-top: 4px;
    }

    .episode-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .episode-btn {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 10px 4px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 12px;
      font-weight: 500;
      color: #fff;
      text-decoration: none;
      display: block;
    }
    .episode-btn:active {
      transform: scale(0.92);
      background: rgba(213,0,249,0.15);
    }
    .episode-btn .ep-label {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
    }

    .search-section-title {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      margin: 16px 0 10px;
      padding: 0 4px;
    }

    .search-empty {
      text-align: center;
      padding: 40px 20px;
      color: rgba(255,255,255,0.3);
    }

    /* === LIST CARD === */
    .list-card { 
      background: rgba(45,10,80,0.25); 
      border-radius: 20px; 
      border: 0.5px solid rgba(255,255,255,0.04); 
      overflow: hidden; 
    }
    .list-item { 
      display: flex; 
      align-items: center;
      padding: 14px 16px; 
      border-bottom: 0.5px solid rgba(255,255,255,0.04); 
      transition: background 0.15s;
      gap: 12px;
    }
    .list-item:last-child { border-bottom: none; }
    .list-item .tx-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .list-item .tx-icon svg {
      width: 18px;
      height: 18px;
      fill: #fff;
    }
    .tx-icon.earn { background: rgba(48,209,88,0.2); border: 1px solid rgba(48,209,88,0.3); }
    .tx-icon.spend { background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.3); }
    .tx-icon.tax { background: rgba(255,214,10,0.2); border: 1px solid rgba(255,214,10,0.3); }
    .tx-icon.default { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); }

    .list-item .item-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .item-left { display: flex; flex-direction: column; gap: 2px; }
    .item-left p { margin: 0; font-size: 15px; font-weight: 500; }
    .item-left span { font-size: 12px; color: rgba(255,255,255,0.4); }
    .item-right { font-weight: 600; font-size: 16px; color: #fff; }
    .val-pos { color: #30d158; }
    .val-neg { color: #ff453a; }

    /* === LOADING === */
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(213,0,249,0.12); border-top-color: #d500f9; border-radius: 50%; animation: spin 1s linear infinite; margin: 40px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { text-align: center; color: rgba(255,255,255,0.3); padding: 30px 20px; font-size: 14px; }

    /* === WATCH & EARN FAB (AI STYLE) === */
    .earn-fab {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff); 
      border: none;
      box-shadow: 0 4px 30px rgba(213,0,249,0.5); 
      color: white;
      cursor: pointer;
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: pulseGlow 2s infinite alternate; 
      padding: 0;
      line-height: 1;
    }
    .earn-fab:active { transform: scale(0.9); }
    
    .earn-fab .fab-top {
      font-size: 10px;
      font-weight: 700;
      opacity: 0.9;
      margin-bottom: -2px;
      transform: scale(0.65);
    }
    
    .earn-fab .fab-mid {
      display: flex;
      align-items: center;
      gap: 2px;
      z-index: 2;
    }
    .earn-fab .fab-mid svg { width: 15px; height: 15px; }
    .earn-fab .fab-mid span { font-size: 16px; font-weight: 900; }
    
    .earn-fab .fab-bot {
      font-size: 10px;
      font-weight: 600;
      opacity: 0.9;
      margin-top: -2px;
      white-space: nowrap;
      transform: scale(0.45);
    }

    @keyframes pulseGlow {
      0% { box-shadow: 0 4px 30px rgba(213,0,249,0.3); }
      100% { box-shadow: 0 4px 50px rgba(213,0,249,0.8); }
    }

    /* === LEADERBOARD === */
    .lb-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 0.5px solid rgba(255,255,255,0.04);
      transition: all 0.2s;
      cursor: default;
      gap: 8px;
    }
    .lb-item:last-child { border-bottom: none; }

    .lb-avatar-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .lb-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      color: #fff;
      background: #651fff;
      text-transform: uppercase;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.1);
    }
    .lb-avatar-wrap .rank-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      background: #000000;
      border: 1.5px solid rgba(255,255,255,0.15);
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.6);
    }
    .lb-rank.gold .lb-avatar { border-color: #FFD700; box-shadow: 0 0 20px rgba(255,215,0,0.4); }
    .lb-rank.silver .lb-avatar { border-color: #C0C0C0; box-shadow: 0 0 20px rgba(192,192,192,0.3); }
    .lb-rank.bronze .lb-avatar { border-color: #CD7F32; box-shadow: 0 0 20px rgba(205,127,50,0.3); }
    .lb-rank.default .lb-avatar { border-color: rgba(255,255,255,0.08); }
    .lb-rank.self .lb-avatar { border-color: #d500f9; box-shadow: 0 0 20px rgba(213,0,249,0.3); }

    .lb-info { flex: 1; }
    .lb-name { font-weight: 600; font-size: 16px; }
    .lb-name.self-highlight { color: #ea80fc; }
    .lb-name .you-tag { font-size: 11px; background: rgba(213,0,249,0.15); padding: 2px 8px; border-radius: 30px; margin-left: 8px; color: #ea80fc; }
    .lb-pts { font-weight: 600; color: #ffffff; font-size: 15px; }

    .lb-self-row {
      margin-top: 12px;
      padding: 12px 16px;
      background: rgba(213,0,249,0.05);
      border-radius: 16px;
      border: 1px solid rgba(213,0,249,0.12);
      display: flex;
      justify-content: space-between;
      align-items: center;
      animation: fadeSlide 0.5s ease;
    }
    .lb-self-rank { font-weight: 700; color: #fff; }
    .lb-self-pts { font-weight: 700; color: #ffd60a; }

    /* === PAYMENT - CHAT STYLE (Updated with reactions, ticks, online status) === */
    .payment-chat-container {
      max-height: 250px;
      overflow-y: auto;
      margin-bottom: 8px;
      padding: 6px 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 16px;
      min-height: 60px;
    }
    .payment-chat-container .chat-msg {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 6px;
      animation: fadeSlide 0.3s ease;
    }
    .payment-chat-container .chat-msg.sent { flex-direction: row-reverse; }
    .payment-chat-container .chat-msg .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      background: #651fff;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 10px;
      color: #fff;
    }
    .payment-chat-container .chat-msg .bubble {
      max-width: 75%;
      padding: 6px 12px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.3;
      word-wrap: break-word;
      position: relative;
    }
    .payment-chat-container .chat-msg.sent .bubble {
      background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .payment-chat-container .chat-msg.received .bubble {
      background: rgba(255,255,255,0.06);
      color: #eee;
      border-bottom-left-radius: 4px;
    }
    .payment-chat-container .chat-msg .bubble .payment-card {
      background: rgba(0,230,118,0.1);
      border: 1px solid rgba(0,230,118,0.2);
      border-radius: 10px;
      padding: 4px 10px;
      margin-top: 2px;
      font-size: 12px;
    }
    .payment-chat-container .chat-msg .bubble .payment-card .amount {
      font-weight: 700;
      color: #30d158;
    }
    .payment-chat-container .chat-msg .time {
      font-size: 9px;
      color: rgba(255,255,255,0.2);
      margin-top: 2px;
    }
    
    /* Read receipt ticks */
    .chat-msg .read-tick {
      font-size: 10px;
      margin-left: 4px;
      color: rgba(255,255,255,0.3);
    }
    .chat-msg .read-tick.read { color: #30d158; }
    
    /* Online status indicator */
    .online-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #30d158;
      margin-left: 6px;
      box-shadow: 0 0 10px rgba(48,209,88,0.5);
      animation: pulse-dot 2s infinite;
    }
    .online-dot.offline {
      background: #555;
      box-shadow: none;
      animation: none;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    
    /* Reaction buttons */
    .reaction-bar {
      display: flex;
      gap: 4px;
      margin-top: 2px;
      flex-wrap: wrap;
    }
    .reaction-btn {
      background: rgba(255,255,255,0.06);
      border: none;
      border-radius: 12px;
      padding: 2px 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .reaction-btn:active { transform: scale(0.9); background: rgba(255,255,255,0.12); }
    .reaction-btn .count { font-size: 9px; opacity: 0.5; }
    
    /* Message actions */
    .msg-actions {
      display: none;
      gap: 4px;
      margin-top: 2px;
      justify-content: flex-end;
    }
    .chat-msg:hover .msg-actions,
    .chat-msg:active .msg-actions { display: flex; }
    .msg-actions button {
      background: rgba(255,255,255,0.05);
      border: none;
      border-radius: 8px;
      padding: 2px 6px;
      font-size: 10px;
      cursor: pointer;
      color: rgba(255,255,255,0.4);
      transition: all 0.2s;
    }
    .msg-actions button:active { background: rgba(255,255,255,0.12); }

    .payment-chat-input-row {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .payment-chat-input-row input {
      flex: 1;
      padding: 8px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02);
      color: #fff;
      font-size: 13px;
      outline: none;
    }
    .payment-chat-input-row input::placeholder { color: rgba(255,255,255,0.2); }
    .payment-chat-input-row button {
      padding: 8px 14px;
      border-radius: 20px;
      border: none;
      background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff);
      color: #fff;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .payment-chat-input-row button:active { transform: scale(0.95); }

    .search-user-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02);
      color: #fff;
      font-size: 13px;
      margin-bottom: 8px;
      transition: border 0.3s;
      outline: none;
    }
    .search-user-input:focus { border-color: #d500f9; }
    .search-user-input::placeholder { color: rgba(255,255,255,0.2); }
    .user-result {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-bottom: 0.5px solid rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.15s;
      border-radius: 8px;
    }
    .user-result:active { background: rgba(255,255,255,0.02); }
    .user-result .result-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      background: #651fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      color: #fff;
      flex-shrink: 0;
    }
    .user-result .result-info { flex: 1; }
    .user-result .result-info .name { font-weight: 500; font-size: 13px; }
    .user-result .result-info .sub { font-size: 10px; color: rgba(255,255,255,0.3); }
    .quick-action-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin: 12px 16px;
    }
    .quick-action {
      background: rgba(45,10,80,0.3);
      backdrop-filter: blur(12px);
      border: 0.5px solid rgba(255,255,255,0.04);
      border-radius: 16px;
      padding: 12px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .quick-action:active { transform: scale(0.94); }
    .quick-action .icon { font-size: 28px; }
    .quick-action .label { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; }
    .quick-action.bank { border-color: rgba(48,209,88,0.15); }
    .quick-action.store { border-color: rgba(255,214,10,0.15); }
    .quick-action.pay { border-color: rgba(10,132,255,0.15); }

    /* === STORE === */
    .store-section-title {
      font-size: 12px;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin: 20px 16px 10px;
      font-weight: 700;
    }
    
    .store-card {
      background: rgba(45,10,80,0.3);
      backdrop-filter: blur(12px);
      border: 0.5px solid rgba(255,255,255,0.06);
      border-radius: 18px;
      padding: 14px;
      margin: 0 16px 12px;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .store-card:active {
      transform: scale(0.96);
      background: rgba(213,0,249,0.1);
    }
    .store-icon-wrap {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: inset 0 0 10px rgba(255,255,255,0.05);
    }
    .store-icon-wrap svg { width: 24px; height: 24px; fill: currentColor; }
    
    .store-info { flex: 1; }
    .store-info h4 { margin: 0; font-size: 15px; font-weight: 600; color: #fff; letter-spacing: -0.2px; }
    .store-info p { margin: 4px 0 0; font-size: 11px; color: rgba(255,255,255,0.5); }
    
    .store-buy-btn {
      background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff);
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      box-shadow: 0 6px 15px rgba(213,0,249,0.3);
      cursor: pointer;
      transition: transform 0.15s;
    }
    .store-buy-btn:active { transform: scale(0.92); box-shadow: 0 2px 8px rgba(213,0,249,0.4); }

    /* Coupon Grid */
    .coupon-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 0 16px 20px;
    }
    .coupon-card {
      background: linear-gradient(135deg, rgba(255,214,10,0.03), rgba(255,214,10,0.08));
      border: 1.5px dashed rgba(255,214,10,0.3);
      border-radius: 16px;
      padding: 16px 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.2s;
    }
    .coupon-card:active { transform: scale(0.95); background: rgba(255,214,10,0.1); }
    .coupon-icon { color: #ffd60a; margin-bottom: 8px; filter: drop-shadow(0 2px 8px rgba(255,214,10,0.4)); }
    .coupon-icon svg { width: 32px; height: 32px; fill: currentColor; }
    .coupon-card h4 { margin: 0; font-size: 16px; font-weight: 800; color: #ffd60a; }
    .coupon-card p { margin: 4px 0 12px; font-size: 10px; color: rgba(255,255,255,0.6); }
    
    .coupon-buy-btn {
      width: 100%;
      background: rgba(255,214,10,0.15);
      color: #ffd60a;
      border: 1px solid rgba(255,214,10,0.3);
      padding: 8px 0;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .coupon-buy-btn:active { background: rgba(255,214,10,0.3); }

    /* === RATING STARS === */
    .star-rating {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin: 12px 0;
    }
    .star {
      width: 32px;
      height: 32px;
      cursor: pointer;
      transition: all 0.2s;
      fill: rgba(255,255,255,0.1);
    }
    .star.active { fill: #ffd60a; filter: drop-shadow(0 0 10px rgba(255,214,10,0.5)); }
    .star:active { transform: scale(1.2); }

    /* === WITHDRAW === */
    .withdraw-input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02);
      color: #fff;
      font-size: 14px;
      margin-bottom: 8px;
      outline: none;
    }
    .withdraw-input:focus { border-color: #d500f9; }
    .withdraw-btn {
      width: 100%;
      padding: 12px;
      border-radius: 20px;
      border: none;
      background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s;
      font-size: 14px;
    }
    .withdraw-btn:active { transform: scale(0.95); }

    /* === STREAK RING === */
    .streak-ring {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,215,0,0.06);
      padding: 4px 12px 4px 8px;
      border-radius: 30px;
      border: 0.5px solid rgba(255,215,0,0.12);
    }
    .streak-ring .flame {
      font-size: 18px;
      animation: flicker 1.5s infinite alternate;
    }
    @keyframes flicker {
      0% { opacity: 0.7; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1.05); }
    }

    .mytho-label {
      position: absolute;
      bottom: -6px;
      right: 0;
      font-size: 10px;
      font-weight: 400;
      color: rgba(255,255,255,0.12);
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* === Confirm Modal === */
    .confirm-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(10px);
      z-index: 500;
      justify-content: center;
      align-items: center;
    }
    .confirm-overlay.open { display: flex; }
    .confirm-box {
      background: rgba(28,28,30,0.95);
      border-radius: 24px;
      padding: 24px 28px;
      max-width: 340px;
      width: 90%;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 20px 60px rgba(0,0,0,0.8);
    }
    .confirm-box p { font-size: 16px; margin-bottom: 24px; color: #ddd; }
    .confirm-box .btn-row { display: flex; gap: 12px; justify-content: center; }
    .confirm-box .btn-row button {
      padding: 10px 28px;
      border-radius: 30px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .confirm-box .btn-row button:active { transform: scale(0.94); }
    .confirm-box .btn-cancel { background: rgba(255,255,255,0.06); color: #aaa; }
    .confirm-box .btn-confirm { background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff); color: #fff; }

    /* === Success Overlay === */
    .success-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      z-index: 600;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.3s;
    }
    .success-overlay.open { display: flex; }
    .success-box {
      background: #000000;
      border-radius: 32px;
      padding: 30px 28px;
      max-width: 340px;
      width: 90%;
      text-align: center;
      border: 1px solid rgba(0,230,118,0.2);
      box-shadow: 0 20px 60px rgba(0,0,0,0.8);
      animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .success-box .check-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #00e676;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .success-box .check-circle svg { fill: #fff; width: 36px; height: 36px; }
    .success-box h3 { font-size: 22px; margin: 0; color: #fff; }
    .success-box p { color: rgba(255,255,255,0.5); font-size: 14px; margin: 8px 0 0; }
    @keyframes popIn {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    #ui-pts, #profile-pts, .lb-pts, .item-right, .widget-value, .lb-self-pts {
      color: #ffffff !important;
    }

    /* ===== CHANT CARD STYLES ===== */
    .chant-level {
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      margin: 4px 0 2px;
      background: linear-gradient(135deg, #ffd60a, #ff9f1c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    .chant-progress-container {
      background: rgba(255,255,255,0.06);
      border-radius: 30px;
      height: 8px;
      margin: 6px 0 10px;
      overflow: hidden;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.4);
    }
    .chant-progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #d500f9, #ffd60a);
      border-radius: 30px;
      transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 20px rgba(213,0,249,0.4);
    }
    .chant-counter {
      text-align: center;
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 12px;
      font-weight: 500;
    }
    .chant-counter span { color: #fff; font-weight: 700; }
    .chant-orb-container {
      display: flex;
      justify-content: center;
      margin: 6px 0 10px;
      position: relative;
    }
    .chant-orb {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #ff9f1c, #d500f9);
      box-shadow: 0 0 40px rgba(213,0,249,0.5), 0 0 80px rgba(213,0,249,0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.2s;
      user-select: none;
      -webkit-user-select: none;
      position: relative;
      border: 2px solid rgba(255,255,255,0.15);
    }
    .chant-orb:active {
      transform: scale(0.92);
      box-shadow: 0 0 60px rgba(213,0,249,0.8);
    }
    .chant-orb .chant-text {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 0 20px rgba(0,0,0,0.5);
      pointer-events: none;
      text-align: center;
      padding: 0 10px;
    }
    .chant-orb .edit-icon {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(0,0,0,0.5);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
      color: #fff;
      font-size: 12px;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .chant-orb .edit-icon:active { background: rgba(255,255,255,0.2); }

    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      transform: scale(0);
      animation: rippleAnim 0.6s ease-out forwards;
      pointer-events: none;
    }
    @keyframes rippleAnim {
      to { transform: scale(2); opacity: 0; }
    }

    .floating-tap {
      position: fixed;
      pointer-events: none;
      font-size: 20px;
      font-weight: 700;
      color: #ffd60a;
      text-shadow: 0 0 20px rgba(255,214,10,0.8);
      animation: floatUp 0.8s forwards ease-out;
      z-index: 999;
    }
    @keyframes floatUp {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
    }

    .chant-mint-animation {
      animation: mintPulse 0.6s ease;
    }
    @keyframes mintPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); box-shadow: 0 0 80px rgba(255,214,10,0.9); }
      100% { transform: scale(1); }
    }

    .chant-leaderboard {
      margin-top: 12px;
    }
    .chant-lb-item {
      display: flex;
      align-items: center;
      padding: 4px 0;
      border-bottom: 0.5px solid rgba(255,255,255,0.04);
      gap: 8px;
    }
    .chant-lb-item:last-child { border-bottom: none; }
    .chant-lb-rank {
      font-weight: 600;
      color: rgba(255,255,255,0.3);
      font-size: 11px;
      width: 18px;
    }
    .chant-lb-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      background: #651fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 10px;
      color: #fff;
    }
    .chant-lb-name {
      flex: 1;
      font-size: 12px;
      font-weight: 500;
      color: #fff;
    }
    .chant-lb-taps {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
    }

    .skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .upi-numpad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      max-width: 240px;
      margin: 0 auto;
    }
    .upi-numpad button {
      padding: 12px;
      border: none;
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      color: #fff;
      font-size: 18px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 0.5px solid rgba(255,255,255,0.04);
    }
    .upi-numpad button:active {
      transform: scale(0.92);
      background: rgba(213,0,249,0.15);
    }
    .upi-numpad .clear-btn {
      background: rgba(255,69,58,0.1);
      color: #ff453a;
    }
    .upi-numpad .clear-btn:active {
      background: rgba(255,69,58,0.2);
    }
    .upi-display {
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      padding: 6px 0;
      color: #fff;
      letter-spacing: 2px;
      min-height: 50px;
    }

    .payment-processing {
      display: none;
      text-align: center;
      padding: 20px 0;
    }
    .payment-processing.active { display: block; }
    .payment-processing .svg-loader {
      width: 60px;
      height: 60px;
      margin: 0 auto 16px;
    }

    .chant-orb-3d {
      perspective: 600px;
      display: flex;
      justify-content: center;
    }
    .chant-orb-3d .chant-orb {
      transform-style: preserve-3d;
      transition: transform 0.1s ease-out;
    }

    .selected-user-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(213,0,249,0.08);
      border-radius: 30px;
      border: 0.5px solid rgba(213,0,249,0.15);
      margin: 4px 0 8px;
      font-size: 12px;
    }
    .selected-user-badge .remove-btn {
      background: none;
      border: none;
      color: #ff453a;
      font-size: 16px;
      cursor: pointer;
      padding: 0 4px;
    }
    .selected-user-badge .remove-btn:active { transform: scale(0.9); }

    /* === SCRATCH CARD BANNER === */
    .scratch-btn-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #ff9f1c, #d500f9);
      border-radius: 20px;
      padding: 12px 18px;
      margin: 0 16px 16px 16px;
      text-decoration: none;
      box-shadow: 0 8px 25px rgba(213, 0, 249, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.2s;
    }
    .scratch-btn-banner:active {
      transform: scale(0.96);
    }
    .scratch-btn-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .scratch-icon-wrap {
      background: rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 6px;
      font-size: 20px;
    }
    .scratch-text-main {
      font-weight: 700;
      font-size: 15px;
      color: #fff;
      letter-spacing: 0.3px;
    }
    .scratch-text-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.8);
    }
    .scratch-arrow {
      background: rgba(0,0,0,0.2);
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
      font-weight: bold;
    }

    /* === SPIN WHEEL STYLES (Enhanced) === */
    .spin-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 12px 0 20px;
    }
    .spin-wheel-wrapper {
      position: relative;
      width: 250px;
      height: 250px;
      margin: 0 auto;
      border-radius: 50%;
      box-shadow: 0 0 60px rgba(255, 215, 0, 0.25), 0 0 30px rgba(213,0,249,0.3);
      background: #000;
    }
    .spin-wheel-canvas {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
    .spin-pointer {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%) rotate(180deg);
      width: 0;
      height: 0;
      border-left: 15px solid transparent;
      border-right: 15px solid transparent;
      border-bottom: 25px solid #FFD700;
      filter: drop-shadow(0 -5px 12px rgba(255, 214, 10, 0.9));
      z-index: 20;
    }

    .spin-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90px;
      height: 90px;
  
      /* 👇 Yahan Image Add Ki Gayi Hai 👇 */
      background: url('https://i.ibb.co/S4ytTbQk/photo-2026-08-12-05-24-36-7673011816502394908.jpg') center center no-repeat;
      background-size: cover;
      /* 👆 Yahan Tak 👆 */
  
      border: 4px solid #FFD700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFD700;
      font-weight: 900;
      font-size: 20px;
      cursor: pointer;
      z-index: 30;
      box-shadow: 0 0 25px rgba(255, 215, 0, 0.6), inset 0 0 10px rgba(255, 215, 0, 0.3);
      transition: transform 0.1s, font-size 0.2s;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
      letter-spacing: 1px;
    }

    .spin-center:active { transform: translate(-50%, -50%) scale(0.92); }
    .spin-center.disabled { 
      opacity: 0.8; 
      pointer-events: none; 
      border-color: #666; 
      color: #888; 
      box-shadow: none; 
      text-shadow: none;
    }
    .spin-btn, .spin-double-btn {
      display: none !important;
    }

    .spin-result-box {
      margin-top: 12px;
      padding: 10px 16px;
      background: rgba(255,255,255,0.04);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.06);
      width: 100%;
      text-align: center;
    }
    .spin-result-box .result-roll {
      font-size: 32px;
      font-weight: 700;
      color: #ffd60a;
    }
    .spin-result-box .result-points {
      font-size: 18px;
      color: #30d158;
    }
    .spin-countdown {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      margin: 4px 0;
    }
    .spin-streak {
      font-size: 14px;
      color: #ffd60a;
      margin: 2px 0;
    }
    .spin-error {
      color: #ff453a;
      font-size: 14px;
      margin: 4px 0;
    }

    /* Monetag overlay for spin */
    .spin-ad-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 700;
      flex-direction: column;
    }
    .spin-ad-overlay.open { display: flex; }
    .spin-ad-overlay .ad-btn {
      background: linear-gradient(135deg, #00e676, #00b359);
      border: none;
      padding: 16px 32px;
      color: white;
      font-weight: 700;
      font-size: 18px;
      border-radius: 30px;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(0,230,118,0.4);
      text-transform: uppercase;
      transition: transform 0.2s;
    }
    .spin-ad-overlay .ad-btn:active { transform: scale(0.94); }
    .spin-ad-overlay .ad-title {
      font-size: 22px;
      color: #fff;
      margin-bottom: 16px;
    }
    .spin-ad-overlay .ad-sub {
      font-size: 14px;
      color: rgba(255,255,255,0.3);
      margin-top: 12px;
    }

    /* === PAYMENT - CHAT STYLE (Enhanced PhonePe/WhatsApp Style) === */
    .pay-search-area { display: block; }
    .pay-search-area.hidden { display: none; }

    .pay-fullscreen {
      display: none;
      flex-direction: column;
      height: 100vh;
      position: fixed;
      top: 0; left: 0; width: 100%;
      background: #000000;
      z-index: 200;
    }
    .pay-fullscreen.open { display: flex; animation: fadeSlide 0.3s ease; }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(0,0,0,0.85);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-top: max(12px, env(safe-area-inset-top));
    }
    .chat-header .back-btn {
      background: none; border: none; padding: 4px; cursor: pointer; display: flex;
      color: #ea80fc;
    }
    .chat-header .avatar {
      width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #651fff;
    }
    .chat-header .info { flex: 1; }
    .chat-header .info h3 { 
      margin: 0; font-size: 16px; font-weight: 600; color: #fff; 
      display: flex; align-items: center; gap: 6px;
    }
    .chat-header .info p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.5); }

    .chat-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #000000;
      background-image: radial-gradient(circle at 50% 0%, rgba(101,31,255,0.05) 0%, transparent 60%);
    }
    .encryption-msg {
      text-align: center; font-size: 11px; color: rgba(255,255,255,0.4);
      margin: 10px 0 20px; display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .chat-date {
      text-align: center; font-size: 11px; color: rgba(255,255,255,0.5); margin: 16px 0 8px;
    }

    .chat-msg { display: flex; align-items: flex-end; gap: 8px; max-width: 88%; }
    .chat-msg.sent { align-self: flex-end; flex-direction: row-reverse; }
    .chat-msg.received { align-self: flex-start; }
    
    .chat-msg .avatar {
      width: 26px; height: 26px; border-radius: 50%; object-fit: cover; margin-bottom: 18px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    }

    .chat-msg .bubble-wrapper { display: flex; flex-direction: column; }
    .chat-msg.sent .bubble-wrapper { align-items: flex-end; }

    .chat-msg .bubble {
      padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.4; word-wrap: break-word;
      position: relative;
    }
    
    .chat-msg.sent .bubble.text {
      background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff); color: #fff; border-bottom-right-radius: 4px;
    }
    .chat-msg.received .bubble.text {
      background: rgba(255,255,255,0.08); color: #eee; border-bottom-left-radius: 4px;
    }

    .chat-msg .bubble.payment {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 16px;
      width: 220px;
      backdrop-filter: blur(10px);
      background-image: repeating-radial-gradient(circle at 0 0, transparent 0, rgba(255,255,255,0.01) 12px, transparent 13px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .chat-msg.sent .bubble.payment { border-bottom-right-radius: 4px; }
    .chat-msg.received .bubble.payment { border-bottom-left-radius: 4px; }

    .payment-amount { font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 12px; }
    .payment-status { 
      display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; 
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .payment-status.success { color: #30d158; }
    
    .chat-msg .time { 
      font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 4px; padding: 0 4px;
      display: flex; align-items: center; gap: 4px;
    }
    .chat-msg .time .tick { font-size: 12px; }

    .chat-footer {
      padding: 10px 16px;
      background: rgba(0,0,0,0.85);
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-bottom: max(10px, env(safe-area-inset-bottom));
    }
    .chat-input-wrapper {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.05);
      border-radius: 24px;
      padding: 6px 6px 6px 16px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .chat-input {
      flex: 1; background: transparent; border: none; color: #fff; font-size: 15px; outline: none;
    }
    .chat-input::placeholder { color: rgba(255,255,255,0.3); }
    .pay-send-btn {
      background: linear-gradient(135deg, #ff3ec9, #b026ff 55%, #651fff);
      border: none; border-radius: 50%; width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform 0.2s; flex-shrink: 0;
    }
    .pay-send-btn:active { transform: scale(0.9); }
    
    /* Reaction popup */
    .reaction-popup {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 0;
      background: rgba(20,0,30,0.95);
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 8px 12px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      z-index: 50;
      gap: 6px;
      flex-wrap: wrap;
      max-width: 200px;
    }
    .reaction-popup.open { display: flex; }
    .reaction-popup .reaction-option {
      font-size: 20px;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 8px;
      transition: all 0.2s;
      background: none;
      border: none;
    }
    .reaction-popup .reaction-option:active { transform: scale(1.3); background: rgba(255,255,255,0.05); }
  </style>
</head>
<body>

  <!-- NAVBAR -->
  <div class="navbar" id="navTitle">Home</div>

  <!-- ========== TAB: HOME ========== -->
  <div id="tab-home" class="tab-content active">
    <div class="profile-hdr">
      <div style="position:relative;">
        <img id="ui-dp" class="profile-pic" src="https://via.placeholder.com/150/2d0a50/ea80fc?text=User" alt="DP">
        <div class="settings-gear" id="openSettingsBtn">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.49.37 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.22 0 .43-.17.48-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/></svg>
        </div>
      </div>
      <div class="profile-info">
        <h1 id="ui-name">Loading...</h1>
        <p id="ui-id">ID: ${userId}</p>
        <div class="badge" id="ui-verified">Checking...</div>
      </div>
      <a href="http://t.me/MythoSerialBot/stream" target="_blank" class="switch-btn" title="Open Stream">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
      </a>
    </div>

    <!-- ========== SEARCH WIDGET - Google Style ========== -->
    <div class="search-widget" id="searchWidget">
      <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      <span class="search-text">Search episodes...</span>
      <svg class="mic-icon" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
    </div>

    <!-- ========== SEARCH OVERLAY ========== -->
    <div class="search-overlay" id="searchOverlay">
      <div class="search-header">
        <button class="back-btn" id="searchBackBtn">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <input type="text" class="search-input" id="searchInput" placeholder="Search episodes..." autofocus />
      </div>
      
      <div class="search-serial-row" id="serialRow">
        <!-- Serial chips will be rendered here -->
      </div>

      <div class="search-results-scroll" id="searchResults">
        <div class="search-section-title" id="searchSectionTitle">Top Serials</div>
        <div id="searchContent">
          <div class="spinner"></div>
        </div>
      </div>
    </div>

    <!-- ========== SCRATCH CARD BANNER & HISTORY BUTTON ========== -->
    <div style="display: flex; gap: 12px; margin: 0 16px 16px 16px;">
      <!-- Daily Scratch Banner -->
      <a href="https://t.me/MythoSerialBot?start=scratchcard" class="scratch-btn-banner" onclick="tg.HapticFeedback.impactOccurred('medium')" style="flex: 1; margin: 0;">
        <div class="scratch-btn-content">
          <div class="scratch-icon-wrap">🎟️</div>
          <div>
            <div class="scratch-text-main">Daily Scratch Card</div>
            <div class="scratch-text-sub">Win Mythopoints every day!</div>
          </div>
        </div>
        <div class="scratch-arrow">➔</div>
      </a>
      
      <!-- Small Square Scratch History Button -->
      <button onclick="openScratchHistory()" oncontextmenu="return false;" style="width: 62px; height: 62px; flex-shrink: 0; border-radius: 18px; background: transparent; border: 1px solid rgba(213, 0, 249, 0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 25px rgba(0,0,0,0.4); transition: transform 0.2s; padding: 0; margin: 0; overflow: hidden; user-select: none; -webkit-tap-highlight-color: transparent;">
  
        <img src="https://i.ibb.co/270qsDjw/photo-2026-08-12-06-02-04-7673021475883843620.jpg" 
             draggable="false" 
             oncontextmenu="return false;" 
             style="width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; user-select: none; -webkit-user-drag: none; -webkit-touch-callout: none;" 
             alt="History">
       
      </button>



      
    </div>

    <!-- ========== SPIN & WIN SECTION (Enhanced) ========== -->
    <div class="glass" style="margin: 12px 16px 8px;">
      <div class="glass-title">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 2.07c3.61.45 6.48 3.33 6.93 6.93h-6.93zM11 4.07v6.93H4.07c.45-3.6 3.32-6.48 6.93-6.93zm-6.93 8.93H11v6.93c-3.61-.45-6.48-3.32-6.93-6.93zm8.93 6.93V13h6.93c-.45 3.61-3.32 6.48-6.93 6.93z"/></svg>
        Spin & Win
      </div>

      <div class="spin-streak" id="spin-streak">🔥 Streak: 0 days</div>
      <div class="spin-countdown" id="spin-countdown">⏳ Next spin: Available now!</div>
      
      <div class="spin-container">
        <div class="spin-wheel-wrapper">
          <canvas id="spinWheel" class="spin-wheel-canvas" width="400" height="400"></canvas>
          <div class="spin-pointer"></div>
          <div class="spin-center" id="spinCenterBtn">SPIN</div>
        </div>
      </div>

      <div id="spin-result" class="spin-result-box" style="display:none;">
        <div class="result-roll" id="spin-roll">🎲 0</div>
        <div class="result-points" id="spin-points">+0 MythoPoints</div>
        <div id="spin-bonus" style="font-size:14px; color:#ffd60a;"></div>
      </div>
      <div id="spin-error" class="spin-error"></div>
    </div>

    <div class="grid-2" style="padding:0 16px;">
      <div class="widget widget-full">
        <div class="widget-title">Wallet Balance</div>
        <div class="widget-value" style="font-size:36px; position:relative;">
          <span id="ui-pts">0</span>
          <span class="mytho-label">Mythopoints</span>
        </div>
        <div class="widget-sub" id="ui-streak">
          <span class="streak-ring">
            <span class="flame">🔥</span>
            <span id="streak-count">0 Day Streak</span>
          </span>
        </div>
      </div>
      <!-- Premium Widget - Enhanced -->
      <div class="widget w-premium">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffd60a"><path d="M12 2L15.09 8.5L22 9.24L17.5 13.75L18.18 20.5L12 17.5L5.82 20.5L6.5 13.75L2 9.24L8.91 8.5L12 2Z"/></svg>
            <span class="widget-title" style="font-size:10px; margin:0;">Premium</span>
          </div>
        </div>
        <div class="widget-value" style="font-size:20px; margin-top:4px;">
          <span id="ui-prem-status">Free</span>
          <span id="ui-prem-days" style="font-size:12px; color:rgba(255,255,255,0.3); font-weight:400; margin-left:4px;"></span>
        </div>
        <div style="font-size:10px; color:rgba(255,255,255,0.2); margin-top:2px;">
          <span id="ui-prem-plan">No active plan</span>
        </div>
        <a href="https://t.me/MythoSerialBot?start=upgrade" class="upgrade-btn" onclick="tg.HapticFeedback.impactOccurred('medium');">Upgrade</a>
      </div>
      <!-- Search Credits Widget - Enhanced -->
      <div class="widget w-search">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#0a84ff"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <span class="widget-title" style="font-size:10px; margin:0;">Search Credits</span>
          </div>
        </div>
        <div class="widget-value" style="font-size:22px; margin-top:4px;">
          <span id="ui-credits">0</span>
          <span style="font-size:14px; color:rgba(255,255,255,0.2)">/5</span>
        </div>
        <div style="font-size:10px; color:rgba(255,255,255,0.2); margin-top:2px;">
          Refill With /get
        </div>
        <a href="https://t.me/MythoSerialBot?start=get" class="refill-btn" onclick="tg.HapticFeedback.impactOccurred('medium');">Refill</a>
      </div>
    </div>

    <div class="quick-action-grid">
      <div class="quick-action bank" onclick="switchTab('bank')">
        <div class="icon">🏦</div>
        <div class="label">Bank</div>
      </div>
      <div class="quick-action store" onclick="switchTab('store')">
        <div class="icon">🛍️</div>
        <div class="label">Store</div>
      </div>
      <div class="quick-action pay" onclick="switchTab('pay')">
        <div class="icon">💸</div>
        <div class="label">Pay</div>
      </div>
    </div>

    <!-- ========== CHANT & EARN CARD ========== -->
    <div class="glass" style="margin: 12px 16px 8px;">
      <div class="glass-title">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9-9-9-9s-4.03 9-9 9c0 4.97 4.03 9 9 9zm0-15.53c1.78 3.52 4.14 5.92 6.32 7.15-1.57 2.12-4.08 3.53-6.32 3.53s-4.75-1.41-6.32-3.53c2.18-1.23 4.54-3.63 6.32-7.15z"/></svg>
        Chant & Earn
      </div>

      <div class="chant-level" id="chant-level">Seeker</div>
      <div class="chant-progress-container">
        <div class="chant-progress-bar" id="chant-progress" style="width:0%;"></div>
      </div>
      <div class="chant-counter">
        <span id="chant-tap-count">0</span> / 1000 taps • <span id="chant-reward-multiplier">1</span>× reward
      </div>
      <div class="chant-orb-container chant-orb-3d" id="orb3d-container">
        <div class="chant-orb" id="chant-orb">
          <span class="chant-text" id="chant-text">Radha Radha</span>
          <div class="edit-icon" id="chant-edit">✎</div>
        </div>
      </div>
      <div class="chant-leaderboard" id="chant-leaderboard">
        <div style="font-size:11px; color:rgba(255,255,255,0.3); margin-bottom:4px;">Top Chanters</div>
        <div id="chant-lb-list"><div class="spinner" style="width:20px;height:20px;margin:4px auto;"></div></div>
      </div>
    </div>

    <h3 style="font-size:16px; margin: 8px 16px 4px; font-weight:600;">Lifetime Stats</h3>
    <div class="grid-2" style="padding:0 16px;">
      <div class="widget" style="padding:10px 14px;">
        <div class="widget-title">Total Earned</div>
        <div class="widget-value" style="font-size:18px; color:#30d158; position:relative;">
          <span id="ui-life-earn">0</span>
          <span class="mytho-label" style="font-size:7px;">Mythopoints</span>
        </div>
      </div>
      <div class="widget" style="padding:10px 14px;">
        <div class="widget-title">Total Spent</div>
        <div class="widget-value" style="font-size:18px; color:#ff453a; position:relative;">
          <span id="ui-life-spent">0</span>
          <span class="mytho-label" style="font-size:7px;">Mythopoints</span>
        </div>
      </div>
    </div>

    <!-- ========== REFERRAL CONTROL PANEL ========== -->
    <h3 style="font-size:16px; margin: 16px 16px 4px; font-weight:600;">🚀 Refer & Earn</h3>
    <div class="glass" style="margin: 0 16px 20px;">
        <div class="grid-2" style="margin-bottom: 12px; gap:8px;">
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:rgba(255,255,255,0.4); text-transform:uppercase;">My Referrals</div>
                <div style="font-size:24px; font-weight:700; color:#00e676;" id="ui-refs-count">0</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:rgba(255,255,255,0.4); text-transform:uppercase;">Next Milestone</div>
                <div style="font-size:18px; font-weight:700; color:#ffd60a; margin-top:4px;" id="ui-refs-target">0/3</div>
            </div>
        </div>

        <div class="chant-progress-container" style="height:6px; margin: 0 0 16px 0;">
            <div class="chant-progress-bar" id="ref-progress" style="width:0%; background: linear-gradient(90deg, #00e676, #ffd60a);"></div>
        </div>
        
        <div style="display:flex; gap:8px; margin-bottom:8px;">
            <button class="store-buy-btn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; background:linear-gradient(135deg, #00e676, #00b359); box-shadow:0 4px 15px rgba(0,230,118,0.3);" onclick="shareReferral()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                Share Link
            </button>
            <button class="store-buy-btn" style="background:rgba(255,255,255,0.1); box-shadow:none; padding:8px 14px;" onclick="loadDashboard()">🔄</button>
        </div>
        <div style="display:flex; gap:8px;">
            <button class="coupon-buy-btn" style="flex:1; padding:8px 6px; border-color:rgba(10,132,255,0.3); color:#0a84ff; background:rgba(10,132,255,0.1);" onclick="showRefRewards()">🎁 Rewards</button>
            <button class="coupon-buy-btn" style="flex:1; padding:8px 6px; border-color:rgba(213,0,249,0.3); color:#ea80fc; background:rgba(213,0,249,0.1);" onclick="showRefLeaderboard()">🏆 Leaderboard</button>
        </div>
    </div>
  </div>

  <!-- ========== TAB: BANK ========== -->
  <div id="tab-bank" class="tab-content">
    <div class="glass w-bank">
      <div class="glass-title">
        <svg viewBox="0 0 24 24"><path d="M11.5 1L2 6v2h19V6l-9.5-5zm0 2.5L18 6H5l6.5-2.5zM2 10v2h2v6h2v-6h2v6h2v-6h2v6h2v-6h2v6h2v-6h2v-2H2z"/></svg>
        MythoFund Vault
      </div>
      <div class="widget-value" style="color:#30d158; position:relative;">
        <span id="ui-bank-invest">0 pts</span>
        <span class="mytho-label">Invested</span>
      </div>
      <div class="widget-sub">Active Investment</div>
    </div>
    <div class="grid-2" style="padding:0 16px;">
      <div class="widget">
        <div class="widget-title">Pending Yield</div>
        <div class="widget-value" style="color:#ffd60a; position:relative;">
          <span id="ui-bank-yield">+0</span>
          <span class="mytho-label" style="font-size:8px;">Mythopoints</span>
        </div>
        <div class="widget-sub" id="bank-claim-btn" style="color:#ea80fc; cursor:pointer;">Claim</div>
      </div>
      <div class="widget">
        <div class="widget-title">Active Loan</div>
        <div class="widget-value" style="color:#ff453a;" id="ui-bank-loan">0</div>
        <div class="widget-sub" id="ui-loan-status">No Debt</div>
      </div>
    </div>
    <div style="padding:0 16px;">
      <div style="display:flex; gap:6px; margin-top:6px;">
        <input type="number" id="invest-amount" placeholder="Amount" style="flex:1; padding:8px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); color:#fff; font-size:13px; outline:none;">
        <button id="invest-btn" style="padding:8px 16px; border-radius:20px; border:none; background:linear-gradient(135deg,#d500f9,#651fff); color:#fff; font-weight:600; font-size:12px;">Invest</button>
        <button id="withdraw-btn" style="padding:8px 16px; border-radius:20px; border:none; background:rgba(255,69,58,0.2); color:#ff453a; font-weight:600; font-size:12px;">Withdraw</button>
      </div>
      <div style="margin-top:8px; display:flex; gap:6px;">
        <button id="loan-apply-btn" style="flex:1; padding:8px; border-radius:20px; border:none; background:linear-gradient(135deg,#d500f9,#651fff); color:#fff; font-weight:600; font-size:12px;">Apply Loan (100 pts)</button>
        <button id="loan-repay-btn" style="flex:1; padding:8px; border-radius:20px; border:none; background:rgba(255,69,58,0.2); color:#ff453a; font-weight:600; font-size:12px;">Repay Loan</button>
      </div>
    </div>

    <div class="glass" style="margin-top:16px;">
      <div class="glass-title">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm0 8h-2v2h2z"/></svg>
        Withdraw to Real Money
      </div>
      <p style="font-size:11px; color:rgba(255,255,255,0.4);">10,000 pts = ₹1 | Min ₹10</p>
      <input type="number" id="withdraw-amount" class="withdraw-input" placeholder="Amount in INR" />
      <input type="text" id="withdraw-method" class="withdraw-input" placeholder="Payment Method (UPI, Bank)" />
      <button id="withdraw-request-btn" class="withdraw-btn">Request Withdraw</button>
      <div id="withdraw-history" style="margin-top:12px;"></div>
    </div>
  </div>

  <!-- ========== TAB: STORE ========== -->
  <div id="tab-store" class="tab-content">
    
    <div class="glass">
      <div class="glass-title">
        <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7 14h10l3-8H5.72l-.48-2H3v2h1.22l1.9 7.2L5 14.76c-.66 1.35.34 2.24 2 2.24h10v-2H7c-.54 0-.84-.45-.62-.9L7 14z"/></svg>
        MythoStore
      </div>
      <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin:0;">Spend Mythopoints to enhance your experience.</p>
    </div>

    <div class="store-section-title">Premium Boosts</div>
    
    <div class="store-card">
      <div class="store-icon-wrap" style="background: rgba(10,132,255,0.15); color: #0a84ff;">
        <svg viewBox="0 0 24 24"><path d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4h2.35v4h4v-4h2v-4h-8.35zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
      </div>
      <div class="store-info">
        <h4>5 Search Credits</h4>
        <p>Instantly refill your search limit</p>
      </div>
      <button class="store-buy-btn" onclick="purchase('credits')">50 pts</button>
    </div>

    <div class="store-card">
      <div class="store-icon-wrap" style="background: rgba(48,209,88,0.15); color: #30d158;">
        <svg viewBox="0 0 24 24"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
      </div>
      <div class="store-info">
        <h4>Skip Cooldown</h4>
        <p>Bypass the waiting timer immediately</p>
      </div>
      <button class="store-buy-btn" onclick="purchase('skip_cooldown')">50 pts</button>
    </div>

    <div class="store-card">
      <div class="store-icon-wrap" style="background: rgba(213,0,249,0.15); color: #ea80fc;">
        <svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-4v-1c0-.55.45-1 1-1 1.14 0 2.12.58 2.66 1.44l.34.46.34-.46C15.88 4.58 16.86 4 18 4zM9 4c.55 0 1 .45 1 1v1H6c0-.55.45-1 1-1s1-.45 1-1zm11 16H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v7z"/></svg>
      </div>
      <div class="store-info">
        <h4>Mystery Box</h4>
        <p>Win credits, coupons, or a jackpot!</p>
      </div>
      <button class="store-buy-btn" onclick="purchase('mystery')">100 pts</button>
    </div>

    <div class="store-section-title">Discount Coupons</div>
    <div class="coupon-grid">
      
      <div class="coupon-card">
        <div class="coupon-icon">
          <svg viewBox="0 0 24 24"><path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2 7.54c-1.2.77-2 2.11-2 3.46H6c0-1.35-.8-2.69-2-3.46v-3.08c1.2-.77 2-2.11 2-3.46H4V6h16v2.54c-1.2.77-2 2.11-2 3.46v3.08z"/></svg>
        </div>
        <div>
          <h4>10% OFF</h4>
          <p>Store-wide discount</p>
        </div>
        <button class="coupon-buy-btn" onclick="purchase('coupon_10')">200 pts</button>
      </div>

      <div class="coupon-card">
        <div class="coupon-icon">
          <svg viewBox="0 0 24 24"><path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2 7.54c-1.2.77-2 2.11-2 3.46H6c0-1.35-.8-2.69-2-3.46v-3.08c1.2-.77 2-2.11 2-3.46H4V6h16v2.54c-1.2.77-2 2.11-2 3.46v3.08z"/></svg>
        </div>
        <div>
          <h4>20% OFF</h4>
          <p>Store-wide discount</p>
        </div>
        <button class="coupon-buy-btn" onclick="purchase('coupon_20')">500 pts</button>
      </div>

      <div class="coupon-card">
        <div class="coupon-icon">
          <svg viewBox="0 0 24 24"><path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2 7.54c-1.2.77-2 2.11-2 3.46H6c0-1.35-.8-2.69-2-3.46v-3.08c1.2-.77 2-2.11 2-3.46H4V6h16v2.54c-1.2.77-2 2.11-2 3.46v3.08z"/></svg>
        </div>
        <div>
          <h4>30% OFF</h4>
          <p>Store-wide discount</p>
        </div>
        <button class="coupon-buy-btn" onclick="purchase('coupon_30')">800 pts</button>
      </div>

      <div class="coupon-card">
        <div class="coupon-icon">
          <svg viewBox="0 0 24 24"><path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2 7.54c-1.2.77-2 2.11-2 3.46H6c0-1.35-.8-2.69-2-3.46v-3.08c1.2-.77 2-2.11 2-3.46H4V6h16v2.54c-1.2.77-2 2.11-2 3.46v3.08z"/></svg>
        </div>
        <div>
          <h4>50% OFF</h4>
          <p>Ultimate discount</p>
        </div>
        <button class="coupon-buy-btn" onclick="purchase('coupon_50')">1500 pts</button>
      </div>
      
    </div>
  </div>

  <!-- ========== TAB: PAY (UPDATED with read receipts, reactions, online status) ========== -->
  <div id="tab-pay" class="tab-content">
    
    <div class="pay-search-area" id="paySearchArea">
      <div class="glass" style="padding:12px 14px;">
        <div class="glass-title" style="font-size:15px; margin-bottom:6px;">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          Payments & Chat
        </div>
        <input type="text" id="search-user" class="search-user-input" placeholder="Search name or ID..." autocomplete="off" />
        <div id="search-results"></div>
        
        <div id="recent-chats-container">
          <div style="font-size:12px; color:rgba(255,255,255,0.4); margin: 16px 4px 8px; text-transform:uppercase; font-weight:600;">Recent Chats</div>
          <div id="recent-chats-list">
            <div class="empty" style="font-size:12px; padding:12px;">Loading recents...</div>
          </div>
        </div>
      </div>
    </div>

    <div class="pay-fullscreen" id="payFullscreen">
      <div class="chat-header">
        <button class="back-btn" id="payBackBtn">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <img id="payUserAvatar" class="avatar" src="https://via.placeholder.com/100" alt="User" />
        <div class="info">
          <h3 id="payUserName">User Name <span class="online-dot offline" id="payOnlineDot"></span></h3>
          <p id="payUserId">ID: 0</p>
        </div>
      </div>

      <div class="chat-area" id="payChatArea">
      </div>

      <div class="chat-footer">
        <div id="payStatus" style="width: 100%; text-align:center; font-size:11px; margin-bottom:6px;"></div>
        <div class="chat-input-wrapper">
          <input type="text" id="payAmountInput" class="chat-input" placeholder="Enter amount or chat..." autocomplete="off" />
          <button class="pay-send-btn" id="paySendBtn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <div style="font-size:10px; color:rgba(255,255,255,0.3); text-align:center; margin-top:6px;">Min 200 MythoPoints • 15% tax on transfers</div>
      </div>
    </div>

    <div class="payment-processing" id="payment-processing" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:300; background:rgba(0,0,0,0.8); padding:20px; border-radius:20px;">
      <svg class="svg-loader" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#d500f9" stroke-width="6" stroke-dasharray="251.2" stroke-dashoffset="251.2" style="animation: dash 1.5s ease-in-out infinite; transform-origin: center; transform: rotate(-90deg);"/>
      </svg>
      <p style="color:rgba(255,255,255,0.8); font-size:13px; margin-top:10px;">Verifying transaction...</p>
    </div>
  </div>

  <!-- ========== TAB: PROFILE ========== -->
  <div id="tab-profile" class="tab-content">
    <div class="glass">
      <div class="profile-hdr" style="margin-bottom:12px;">
        <img id="profile-dp" class="profile-pic" src="https://via.placeholder.com/150/2d0a50/ea80fc?text=User" alt="DP">
        <div class="profile-info">
          <h2 id="profile-name">Loading...</h2>
          <p id="profile-id">ID: ${userId}</p>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid rgba(255,255,255,0.04); font-size:14px;">
        <span>Mythopoints</span>
        <span id="profile-pts" style="color:#ffffff;">0</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid rgba(255,255,255,0.04); font-size:14px;">
        <span>Streak</span>
        <span id="profile-streak">0</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px;">
        <span>Verification</span>
        <span id="profile-verified" style="color:#ff453a;">Unverified</span>
      </div>
    </div>

    <div class="glass">
      <div class="glass-title">
        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        Rate MythoBot
      </div>
      <p style="font-size:11px; color:rgba(255,255,255,0.4);">Earn 10 MythoPoints for rating!</p>
      <div id="rating-status"></div>
      <div class="star-rating" id="star-container">
        <svg class="star" data-value="1" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        <svg class="star" data-value="2" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        <svg class="star" data-value="3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        <svg class="star" data-value="4" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        <svg class="star" data-value="5" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </div>
      <div id="rating-message" style="text-align:center; font-size:12px; margin-top:4px;"></div>
    </div>

    <div style="padding:0 16px 4px 24px; font-size:11px; color:rgba(255,255,255,0.3); text-transform:uppercase;">Recent Transactions</div>
    <div class="list-card" id="ui-history-list" style="margin:0 16px; max-height:300px; overflow-y:auto;">
      <div class="spinner"></div>
    </div>
    <div id="history-loader" style="text-align:center; padding:8px; display:none;">
      <div class="spinner" style="width:24px;height:24px;"></div>
    </div>

    <div style="padding:12px 16px 4px; font-size:14px; font-weight:600;">🏆 Mythopoints Leaderboard</div>
    <div style="padding:0 16px; display:flex; gap:6px; flex-wrap:wrap;">
      <button class="lb-filter active" data-filter="all" style="flex:1; padding:4px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:rgba(213,0,249,0.1); color:#fff; font-weight:600; font-size:11px;">All-Time</button>
      <button class="lb-filter" data-filter="weekly" style="flex:1; padding:4px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:rgba(255,255,255,0.4); font-size:11px;">Weekly</button>
      <button class="lb-filter" data-filter="monthly" style="flex:1; padding:4px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:rgba(255,255,255,0.4); font-size:11px;">Monthly</button>
    </div>
    <div id="lb-list" style="margin:8px 16px;">
      <div class="spinner"></div>
    </div>
    <div style="display:flex; justify-content:center; gap:12px; padding:4px 16px;">
      <button id="lb-prev" style="padding:4px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:#fff; font-size:12px;"><</button>
      <span id="lb-page-info" style="color:rgba(255,255,255,0.3); font-size:12px;">Page 1</span>
      <button id="lb-next" style="padding:4px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:#fff; font-size:12px;">></button>
    </div>
  </div>

  <!-- ========== SETTINGS MODAL ========== -->
  <div class="settings-overlay" id="settingsModal">
    <div class="settings-box">
      <h3>⚙️ App Settings</h3>
      <div class="setting-item">
        <span class="setting-label">Sound Effects</span>
        <input type="checkbox" class="toggle-switch" id="setting-sound" checked>
      </div>
      <div class="setting-item">
        <span class="setting-label">Haptic Feedback</span>
        <input type="checkbox" class="toggle-switch" id="setting-haptic" checked>
      </div>
      <div class="setting-item">
        <span class="setting-label">Visual Animations</span>
        <input type="checkbox" class="toggle-switch" id="setting-visual" checked>
      </div>
      <div class="setting-item">
        <span class="setting-label">Privacy Mode</span>
        <input type="checkbox" class="toggle-switch" id="setting-privacy">
      </div>
      <div class="setting-item">
        <span class="setting-label">Floating Pill Nav</span>
        <input type="checkbox" class="toggle-switch" id="setting-pill">
      </div>
      <div class="setting-item">
        <span class="setting-label">Short Numbers</span>
        <input type="checkbox" class="toggle-switch" id="setting-shortnum">
      </div>
      <div class="setting-item">
        <span class="setting-label">Force Verification</span>
        <input type="checkbox" class="toggle-switch" id="setting-forceverify">
      </div>
      <button class="withdraw-btn" style="margin-top:20px; background: rgba(255,255,255,0.1);" onclick="closeSettings()">Close Settings</button>
    </div>
  </div>

  <!-- ========== TAB BAR (with unread badge) ========== -->
  <div class="tab-bar">
    <div class="tab-btn active" data-tab="home">
      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      <span>Home</span>
    </div>
    <div class="tab-btn" data-tab="bank">
      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M11.5 1L2 6v2h19V6l-9.5-5zm0 2.5L18 6H5l6.5-2.5zM2 10v2h2v6h2v-6h2v6h2v-6h2v6h2v-6h2v6h2v-6h2v-2H2z"/></svg>
      <span>Bank</span>
    </div>
    <div class="tab-btn" data-tab="store">
      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7 14h10l3-8H5.72l-.48-2H3v2h1.22l1.9 7.2L5 14.76c-.66 1.35.34 2.24 2 2.24h10v-2H7c-.54 0-.84-.45-.62-.9L7 14z"/></svg>
      <span>Store</span>
    </div>
    <div class="tab-btn" data-tab="pay" id="payTabBtn">
      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v10zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
      <span>Pay</span>
      <span class="unread-badge" id="payUnreadBadge">0</span>
    </div>
    <div class="tab-btn" data-tab="profile">
      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      <span>Profile</span>
    </div>
  </div>

  <!-- ========== WATCH & EARN FAB ========== -->
  <button class="earn-fab" id="earnFab" title="Watch Ad to Earn">
    <div class="fab-top">WATCH</div>
    <div class="fab-mid">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 8v8l6-4-6-4zm2-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
      <span>AD</span>
    </div>
    <div class="fab-bot">EARN MYTHOPOINTS</div>
  </button>

  <!-- ========== SPIN AD OVERLAY ========== -->
  <div class="spin-ad-overlay" id="spinAdOverlay">
    <div class="ad-title" id="spinAdTitle">🎰 Watch Ad to Spin</div>
    <button class="ad-btn" id="spinAdBtn">▶ Watch Ad</button>
    <div class="ad-sub">Ad completes in seconds</div>
  </div>

  <!-- Referral Rewards Modal -->
  <div class="confirm-overlay" id="refRewardsModal">
    <div class="confirm-box" style="text-align:left; max-width:320px;">
        <h3 style="margin:0 0 16px 0; color:#ffd60a; text-align:center; font-size:20px;">🎁 Referral Rewards</h3>
        <div style="font-size:14px; color:#ddd; margin-bottom:20px; line-height:1.6;">
            <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; margin-bottom:12px;">
                <b style="color:#fff;">Per Referral:</b><br>
                • You get <b style="color:#00e676;">+3 MythoPoints</b><br>
                • Friend gets <b style="color:#00e676;">+2 MythoPoints</b>
            </div>
            <b style="color:#fff;">Milestone Bonuses:</b><br>
            <div style="padding-left:8px; margin-top:6px;">
                1 Ref → +3 pts<br>
                3 Refs → 🥉 +10 pts<br>
                5 Refs → 🎡 +25 pts<br>
                10 Refs → 🥈 +70 pts<br>
                25 Refs → 🥇 +200 pts<br>
                50 Refs → 👑 +500 pts
            </div>
        </div>
        <button class="withdraw-btn" style="background:rgba(255,255,255,0.1); color:#fff;" onclick="document.getElementById('refRewardsModal').classList.remove('open')">Close</button>
    </div>
  </div>

  <!-- Referral Leaderboard Modal -->
  <div class="confirm-overlay" id="refLeaderboardModal">
    <div class="confirm-box" style="text-align:left; padding:24px 16px; max-height:80vh; display:flex; flex-direction:column; max-width:340px;">
        <h3 style="margin:0 0 12px 0; color:#ea80fc; text-align:center; font-size:18px;">🏆 Top Referrers</h3>
        <div id="ref-lb-content" style="overflow-y:auto; flex:1; margin-bottom:16px; min-height:200px;">
            <div class="spinner"></div>
        </div>
        <button class="withdraw-btn" style="background:rgba(255,255,255,0.1); color:#fff;" onclick="document.getElementById('refLeaderboardModal').classList.remove('open')">Close</button>
    </div>
  </div>

  <!-- ========== SCRATCH HISTORY MODAL (Add before closing </body> tag) ========== -->
  <div class="confirm-overlay" id="scratchHistoryModal">
    <div class="confirm-box" style="text-align:left; max-width:340px; padding: 24px 16px; max-height: 80vh; display: flex; flex-direction: column;">
        <h3 style="margin:0 0 16px 0; color:#ea80fc; text-align:center; font-size:18px;">🎟️ Scratch Cards</h3>
        <div id="scratch-list-content" style="overflow-y:auto; flex:1; margin-bottom:16px; min-height:220px; padding-right: 4px;">
            <div class="spinner"></div>
        </div>
        <button class="withdraw-btn" style="background:rgba(255,255,255,0.1); color:#fff;" onclick="document.getElementById('scratchHistoryModal').classList.remove('open')">Close</button>
    </div>
  </div>

  <script>
    // ─── TELEGRAM WEB APP ───
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.setHeaderColor('#0A0014');
    tg.setBackgroundColor('#000000');

    // ─── USER SETTINGS (Persistent) ───
    const userId = ${userId};
    let userSettings = {};

    // ─── PAYMENT CHAT STATE ───
    let selectedReceiver = null;
    let payChatPollInterval = null;
    let currentChatMessages = [];
    let unreadCountCache = {};

    async function loadUserSettings() {
      try {
        const res = await fetch('/api/settings/' + userId);
        const data = await res.json();
        if (data.success) {
          userSettings = data.settings;
          applySettingsToUI();
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
        // Apply defaults
        userSettings = {
          sound: true,
          haptic: true,
          visual: true,
          privacy: false,
          pillNav: false,
          shortNum: false,
          forceVerify: false
        };
        applySettingsToUI();
      }
    }

    function applySettingsToUI() {
      document.getElementById('setting-sound').checked = userSettings.sound !== undefined ? userSettings.sound : true;
      document.getElementById('setting-haptic').checked = userSettings.haptic !== undefined ? userSettings.haptic : true;
      document.getElementById('setting-visual').checked = userSettings.visual !== undefined ? userSettings.visual : true;
      document.getElementById('setting-privacy').checked = userSettings.privacy || false;
      document.getElementById('setting-pill').checked = userSettings.pillNav || false;
      document.getElementById('setting-shortnum').checked = userSettings.shortNum || false;
      document.getElementById('setting-forceverify').checked = userSettings.forceVerify || false;

      // Apply pill nav
      const tabBar = document.querySelector('.tab-bar');
      if (userSettings.pillNav) {
        tabBar.classList.add('floating-pill');
      } else {
        tabBar.classList.remove('floating-pill');
      }

      // Apply visual animations
      if (userSettings.visual === false) {
        let style = document.getElementById('kill-anims');
        if (!style) {
          style = document.createElement('style');
          style.id = 'kill-anims';
          style.innerHTML = '* { animation: none !important; transition: none !important; }';
          document.head.appendChild(style);
        }
      } else {
        const style = document.getElementById('kill-anims');
        if (style) style.remove();
      }

      updateUI();
    }

    async function saveUserSettings() {
      try {
        const settings = {
          sound: document.getElementById('setting-sound').checked,
          haptic: document.getElementById('setting-haptic').checked,
          visual: document.getElementById('setting-visual').checked,
          privacy: document.getElementById('setting-privacy').checked,
          pillNav: document.getElementById('setting-pill').checked,
          shortNum: document.getElementById('setting-shortnum').checked,
          forceVerify: document.getElementById('setting-forceverify').checked
        };
        userSettings = settings;
        const res = await fetch('/api/settings/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, settings: settings })
        });
        const data = await res.json();
        if (!data.success) {
          console.warn('Failed to save settings:', data.error);
        }
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
    }

    function closeSettings() {
      document.getElementById('settingsModal').classList.remove('open');
      saveUserSettings();
    }

    // ─── PURE CODE SOUND ENGINE & SETTINGS LOGIC ───
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSound(type) {
        if (!document.getElementById('setting-sound').checked) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        
        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'tick') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'win') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.2);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        }
    }

    // Intercept Haptics for Sound Sync
    const origImpact = tg.HapticFeedback.impactOccurred.bind(tg.HapticFeedback);
    const origNotify = tg.HapticFeedback.notificationOccurred.bind(tg.HapticFeedback);
    const origSelect = tg.HapticFeedback.selectionChanged.bind(tg.HapticFeedback);
    
    tg.HapticFeedback.impactOccurred = (style) => {
        if (document.getElementById('setting-haptic').checked) origImpact(style);
        playSound('tick');
    };
    tg.HapticFeedback.notificationOccurred = (type) => {
        if (document.getElementById('setting-haptic').checked) origNotify(type);
        if (type === 'success') playSound('win');
    };
    tg.HapticFeedback.selectionChanged = () => {
        if (document.getElementById('setting-haptic').checked) origSelect();
        playSound('click');
    };

    // Settings Event Listeners
    document.getElementById('openSettingsBtn').addEventListener('click', () => {
        playSound('click');
        document.getElementById('settingsModal').classList.add('open');
    });

    document.querySelectorAll('.toggle-switch').forEach(el => {
        el.addEventListener('change', () => {
            playSound('click');
            updateUI();
            
            if (el.id === 'setting-pill') {
                const tabBar = document.querySelector('.tab-bar');
                el.checked ? tabBar.classList.add('floating-pill') : tabBar.classList.remove('floating-pill');
            }
            if (el.id === 'setting-visual') {
                let style = document.getElementById('kill-anims');
                if (!el.checked && !style) {
                    style = document.createElement('style');
                    style.id = 'kill-anims';
                    style.innerHTML = '* { animation: none !important; transition: none !important; }';
                    document.head.appendChild(style);
                } else if (el.checked && style) {
                    style.remove();
                }
            }
            // Save settings on any toggle change
            saveUserSettings();
        });
    });

    // Helper: Short Number Formatter
    function formatNum(num) {
        if (!document.getElementById('setting-shortnum')?.checked) return num.toLocaleString();
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }

    // ─── USER DATA ───
    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser) {
      const name = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
      document.querySelectorAll('#ui-name, #profile-name').forEach(el => el.innerText = name);
      const idEls = document.querySelectorAll('#ui-id, #profile-id');
      if (tgUser.username) {
        idEls.forEach(el => el.innerText = '@' + tgUser.username + ' | ID: ' + tgUser.id);
      } else {
        idEls.forEach(el => el.innerText = 'ID: ' + tgUser.id);
      }
      if (tgUser.photo_url) {
        document.querySelectorAll('#ui-dp, #profile-dp').forEach(el => el.src = tgUser.photo_url);
        fetch('/api/sync-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, photo_url: tgUser.photo_url })
        }).catch(err => console.warn('Sync profile failed:', err));
      }
    }

    // ─── CONFIRM & SUCCESS MODALS ───
    const confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'confirm-overlay';
    confirmOverlay.innerHTML = \`
      <div class="confirm-box">
        <p id="confirm-text">Are you sure?</p>
        <div class="btn-row">
          <button class="btn-cancel" id="confirm-no">Cancel</button>
          <button class="btn-confirm" id="confirm-yes">Yes</button>
        </div>
      </div>
    \`;
    document.body.appendChild(confirmOverlay);
    let confirmCallback = null;
    document.getElementById('confirm-yes').addEventListener('click', () => {
      confirmOverlay.classList.remove('open');
      if (confirmCallback) confirmCallback(true);
    });
    document.getElementById('confirm-no').addEventListener('click', () => {
      confirmOverlay.classList.remove('open');
      if (confirmCallback) confirmCallback(false);
    });

    function showConfirm(text) {
      return new Promise((resolve) => {
        document.getElementById('confirm-text').innerText = text;
        confirmOverlay.classList.add('open');
        confirmCallback = (result) => {
          resolve(result);
          confirmCallback = null;
        };
      });
    }

    const successOverlay = document.createElement('div');
    successOverlay.className = 'success-overlay';
    successOverlay.innerHTML = \`
      <div class="success-box">
        <div class="check-circle">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <h3 id="success-title">Success!</h3>
        <p id="success-message">Transaction completed.</p>
      </div>
    \`;
    document.body.appendChild(successOverlay);

    function showSuccess(message, title = 'Success!') {
      return new Promise((resolve) => {
        document.getElementById('success-title').innerText = title;
        document.getElementById('success-message').innerText = message;
        successOverlay.classList.add('open');
        tg.HapticFeedback.notificationOccurred('success');
        setTimeout(() => {
          successOverlay.classList.remove('open');
          resolve();
        }, 2000);
      });
    }

    // ─── REACTIVE STATE MANAGEMENT ───
    const state = new Proxy({
      mythopoints: 0,
      streak: 0,
      credits: 0,
      referrals: 0,
      premium: { active: false, plan: 'Free', daysLeft: 0 },
      bank: { invested: 0, pendingYield: 0, loan: 0 },
      stats: { earned: 0, spent: 0 },
      chant: { totalTaps: 0, level: 'Seeker', multiplier: 1 },
      verified: false,
      payment: { used: 0, limit: 1 },
      spin: { canSpin: false, streak: 0, countdown: 'Available now!', roll: null, doubleUsed: false }
    }, {
      set(target, prop, value) {
        target[prop] = value;
        updateUI();
        return true;
      }
    });

    function updateUI() {
      // 1. Privacy Mode Logic
      const privacyOn = document.getElementById('setting-privacy')?.checked;
      const ptsNodes = ['ui-pts', 'ui-life-earn', 'ui-life-spent', 'profile-pts', 'ui-bank-invest', 'ui-bank-yield', 'ui-bank-loan'];
      
      ptsNodes.forEach(id => {
          const el = document.getElementById(id);
          if (el) privacyOn ? el.classList.add('privacy-blur') : el.classList.remove('privacy-blur');
      });

      // 2. Short Number Formatter Injection
      document.getElementById('ui-pts').innerText = formatNum(state.mythopoints);
      document.getElementById('ui-credits').innerText = formatNum(state.credits);
      document.getElementById('streak-count').innerText = formatNum(state.streak) + ' Day Streak';
      document.getElementById('ui-life-earn').innerText = formatNum(state.stats.earned);
      document.getElementById('ui-life-spent').innerText = formatNum(state.stats.spent);
      document.getElementById('profile-pts').innerText = formatNum(state.mythopoints);
      
      // 3. Force Verification Override Logic
      const forceVerify = document.getElementById('setting-forceverify')?.checked;
      const isVerified = state.verified || forceVerify;

      const badge = document.getElementById('ui-verified');
      if (isVerified) {
        badge.innerText = 'Online';
        badge.style.background = 'rgba(48,209,88,0.12)';
        badge.style.color = '#30d158';
      } else {
        badge.innerText = '! Unverified';
        badge.style.background = 'rgba(255,69,58,0.12)';
        badge.style.color = '#ff453a';
      }
      
      // Premium widget update
      if (state.premium.active) {
        document.getElementById('ui-prem-status').innerText = state.premium.plan || 'Premium';
        document.getElementById('ui-prem-days').innerText = state.premium.daysLeft + 'd left';
        document.getElementById('ui-prem-plan').innerText = 'Active subscription';
      } else {
        document.getElementById('ui-prem-status').innerText = 'Free';
        document.getElementById('ui-prem-days').innerText = '';
        document.getElementById('ui-prem-plan').innerText = 'No active plan';
      }
      
      document.getElementById('ui-bank-invest').innerText = formatNum(state.bank.invested) + ' pts';
      document.getElementById('ui-bank-yield').innerText = '+' + formatNum(state.bank.pendingYield);
      document.getElementById('ui-bank-loan').innerText = formatNum(state.bank.loan);
      
      // Chant
      document.getElementById('chant-level').innerText = state.chant.level;
      document.getElementById('chant-reward-multiplier').innerText = state.chant.multiplier;
      const remainder = state.chant.totalTaps % 1000;
      document.getElementById('chant-tap-count').innerText = remainder;
      
      const levels = [
        { name: 'Seeker', min: 0, multiplier: 1 },
        { name: 'Devotee', min: 100, multiplier: 1 },
        { name: 'Priest', min: 500, multiplier: 1 },
        { name: 'Ascended', min: 2000, multiplier: 2 },
        { name: 'Moksha', min: 10000, multiplier: 3 }
      ];
      let currentLevel = levels[0];
      for (let i = levels.length - 1; i >= 0; i--) {
        if (state.chant.totalTaps >= levels[i].min) {
          currentLevel = levels[i];
          break;
        }
      }
      let nextLevel = null;
      for (let i = 0; i < levels.length; i++) {
        if (levels[i].min > currentLevel.min) {
          nextLevel = levels[i];
          break;
        }
      }
      const progressEl = document.getElementById('chant-progress');
      if (nextLevel) {
        const progress = (state.chant.totalTaps - currentLevel.min) / (nextLevel.min - currentLevel.min) * 100;
        progressEl.style.width = Math.min(progress, 100) + '%';
      } else {
        progressEl.style.width = '100%';
      }
      
      const profileVerified = document.getElementById('profile-verified');
      if (isVerified) {
        profileVerified.innerText = '✅ Verified';
        profileVerified.style.color = '#30d158';
      } else {
        profileVerified.innerText = '❌ Unverified';
        profileVerified.style.color = '#ff453a';
      }
      
      // Spin
      document.getElementById('spin-streak').innerText = '🔥 Streak: ' + state.spin.streak + ' days';
      document.getElementById('spin-countdown').innerText = '⏳ Next spin: ' + state.spin.countdown;

      // Referral Progress Logic
      document.getElementById('ui-refs-count').innerText = formatNum(state.referrals);
      const milestones = [3, 5, 10, 25, 50];
      let nextTarget = milestones.find(m => state.referrals < m);
      let targetText, progressPercent;
      
      if (nextTarget) {
          targetText = formatNum(state.referrals) + "/" + formatNum(nextTarget);
          progressPercent = (state.referrals / nextTarget) * 100;
      } else {
          targetText = "MAX";
          progressPercent = 100;
      }
      
      document.getElementById('ui-refs-target').innerText = targetText;
      document.getElementById('ref-progress').style.width = Math.min(progressPercent, 100) + "%";
    }

    // ─── TAB SWITCHING ───
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = {
      home: document.getElementById('tab-home'),
      bank: document.getElementById('tab-bank'),
      store: document.getElementById('tab-store'),
      pay: document.getElementById('tab-pay'),
      profile: document.getElementById('tab-profile')
    };
    const navTitle = document.getElementById('navTitle');

    function switchTab(tabId) {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelector(\`.tab-btn[data-tab="\${tabId}"]\`).classList.add('active');
      Object.keys(tabContents).forEach(key => {
        tabContents[key].classList.toggle('active', key === tabId);
      });
      navTitle.innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
      tg.HapticFeedback.selectionChanged();
      if (tabId === 'bank') { loadBankData(); loadWithdrawHistory(); }
      if (tabId === 'profile') { loadHistory(1, true); loadLeaderboard(); loadRatingStatus(); }
      if (tabId === 'pay') { 
        loadRecentChats(); 
        checkUnreadCount(); 
      }
    }
    window.switchTab = switchTab;

    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
      });
    });

    // ─── SEARCH OVERLAY LOGIC ───
    const searchWidget = document.getElementById('searchWidget');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchBackBtn = document.getElementById('searchBackBtn');
    const searchInput = document.getElementById('searchInput');
    const serialRow = document.getElementById('serialRow');
    const searchContent = document.getElementById('searchContent');
    const searchSectionTitle = document.getElementById('searchSectionTitle');

    let serialsData = [];
    let selectedSerial = null;
    let selectedSeason = null;

    // Open search overlay
    searchWidget.addEventListener('click', () => {
      searchOverlay.classList.add('open');
      setTimeout(() => searchInput.focus(), 300);
      loadSerials();
    });

    // Close search overlay
    searchBackBtn.addEventListener('click', () => {
      searchOverlay.classList.remove('open');
      selectedSerial = null;
      selectedSeason = null;
    });

    // Search input handler
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length > 0) {
        filterSerials(query);
      } else {
        showSerials();
      }
    });

    // Load serials from API
    async function loadSerials() {
      try {
        const res = await fetch('/api/serials');
        const data = await res.json();
        if (data.success) {
          serialsData = data.serials;
          showSerials();
        }
      } catch (e) {
        console.error('Failed to load serials:', e);
      }
    }

    // Show serials as chips and list
    function showSerials() {
      renderSerialChips(serialsData);
      searchSectionTitle.innerText = 'Top Serials';
      renderSerialList(serialsData);
    }

    // Filter serials based on search
    function filterSerials(query) {
      const filtered = serialsData.filter(s => 
        s.displayName.toLowerCase().includes(query) || 
        s.name.toLowerCase().includes(query)
      );
      renderSerialChips(filtered);
      searchSectionTitle.innerText = filtered.length > 0 ? 'Search Results' : 'No Results Found';
      if (filtered.length > 0) {
        renderSerialList(filtered);
      } else {
        searchContent.innerHTML = \`
          <div class="search-empty">
            <div style="font-size:48px; margin-bottom:16px;">🔍</div>
            <p>No serials found matching "<strong>\${query}</strong>"</p>
            <p style="font-size:12px; color:rgba(255,255,255,0.3); margin-top:8px;">Try searching with a different name</p>
          </div>
        \`;
      }
    }

    // Render serial chips (scrollable row)
    function renderSerialChips(serials) {
      if (serials.length === 0) {
        serialRow.innerHTML = '';
        return;
      }
      let html = '';
      const showSerials = serials.slice(0, 20);
      showSerials.forEach(s => {
        const isActive = selectedSerial === s.name;
        html += \`
          <div class="serial-chip \${isActive ? 'active' : ''}" onclick="selectSerial('\${s.name}')">
            <img src="\${s.thumbnail}" alt="\${s.displayName}" onerror="this.src='https://i.ibb.co/7tvrS3gS/photo-2026-05-12-05-30-43-7641102945387282464.jpg'" />
            <span>\${s.displayName}</span>
          </div>
        \`;
      });
      serialRow.innerHTML = html;
    }

    // Render serial list (YouTube-style one per row)
    function renderSerialList(serials) {
      if (serials.length === 0) {
        searchContent.innerHTML = \`
          <div class="search-empty">
            <p>No serials available</p>
          </div>
        \`;
        return;
      }

      // If a serial is selected, show its seasons
      if (selectedSerial) {
        const serial = serialsData.find(s => s.name === selectedSerial);
        if (serial) {
          renderSeasons(serial);
          return;
        }
      }

      // Show all serials as a list (YouTube-style one per row)
      let html = '<div class="serial-list">';
      serials.forEach(s => {
        const totalEps = Object.values(s.seasons).reduce((a, b) => a + b, 0);
        html += \`
          <div class="serial-list-item" onclick="selectSerial('\${s.name}')">
            <img src="\${s.thumbnail}" class="thumb" alt="\${s.displayName}" onerror="this.src='https://i.ibb.co/7tvrS3gS/photo-2026-05-12-05-30-43-7641102945387282464.jpg'" />
            <div class="info">
              <div class="title">\${s.displayName}</div>
              <div class="sub">\${totalEps} episodes • \${Object.keys(s.seasons).length} seasons</div>
            </div>
            <div class="arrow">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="rgba(255,255,255,0.2)"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </div>
          </div>
        \`;
      });
      html += '</div>';
      searchContent.innerHTML = html;
    }

    // Render seasons for a selected serial
    function renderSeasons(serial) {
      const seasonKeys = Object.keys(serial.seasons).map(Number).sort((a, b) => a - b);
      let html = \`
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding:0 4px;">
          <button onclick="selectSerial(null)" style="background:none; border:none; color:#ea80fc; cursor:pointer; font-size:14px;">
            ← Back
          </button>
          <div style="font-size:16px; font-weight:600; flex:1;">\${serial.displayName}</div>
          <div style="font-size:12px; color:rgba(255,255,255,0.4);">\${seasonKeys.length} seasons</div>
        </div>
        <div class="season-grid">
      \`;
      
      seasonKeys.forEach(season => {
        const eps = serial.seasons[season];
        html += \`
          <div class="season-card" onclick="selectSeason(\${season})">
            <div class="season-num">S\${String(season).padStart(2, '0')}</div>
            <div class="season-eps">\${eps} episodes</div>
          </div>
        \`;
      });
      html += \`</div>\`;
      searchContent.innerHTML = html;
      searchSectionTitle.innerText = 'Select Season';
    }

    // Render episodes for a selected season
    function renderEpisodes(serial, season) {
      const totalEps = serial.seasons[season];
      const command = serial.command;
      const displayName = serial.displayName;
      
      let html = \`
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding:0 4px;">
          <button onclick="selectSeason(null)" style="background:none; border:none; color:#ea80fc; cursor:pointer; font-size:14px;">
            ← Back
          </button>
          <div style="font-size:16px; font-weight:600; flex:1;">\${displayName} - S\${String(season).padStart(2, '0')}</div>
          <div style="font-size:12px; color:rgba(255,255,255,0.4);">\${totalEps} eps</div>
        </div>
        <div class="episode-grid">
      \`;
      
      // Generate episode buttons
      for (let ep = 1; ep <= Math.min(totalEps, 100); ep++) {
        const epStr = String(ep).padStart(2, '0');
        const seasonStr = String(season).padStart(2, '0');
        let url = \`https://t.me/MythoSerialBot?start=\${command}_s\${seasonStr}e\${epStr}\`;
        
        // Special cases from csearch.py
        if (command === 'kr') {
          url = \`https://t.me/MythoSerialBot?start=kr_s01e\${epStr}\`;
        } else if (command === 'rlk') {
          const displaySeason = season === 1 ? 2 : season;
          url = \`https://t.me/MythoSerialBot?start=rlk_s\${String(displaySeason).padStart(2, '0')}e\${epStr}\`;
        } else if (command === 'spk') {
          const actualEp = (season - 1) * 100 + ep;
          url = \`https://t.me/MythoSerialBot?start=spk_s\${String(season).padStart(2, '0')}e\${actualEp}\`;
        } else if (command === 'srb') {
          const seasonNum = Math.floor((ep - 1) / 100) + 1;
          url = \`https://t.me/MythoSerialBot?start=srb_s\${String(seasonNum).padStart(2, '0')}e\${ep}\`;
        } else if (command === 'vg') {
          const seasonNum = Math.floor((ep - 1) / 100) + 1;
          url = \`https://t.me/MythoSerialBot?start=vg_s\${String(seasonNum).padStart(2, '0')}e\${ep}\`;
        } else if (command === 'jklk') {
          url = \`https://t.me/MythoSerialBot?start=jklk_s\${season}_e\${epStr}\`;
        } else if (command === 'rk') {
          url = \`https://t.me/MythoSerialBot?start=rk_s\${season}_e\${epStr}\`;
        }
        
        html += \`
          <a href="\${url}" class="episode-btn" onclick="tg.HapticFeedback.impactOccurred('light'); tg.openTelegramLink('\${url}'); return false;">
            E\${String(ep).padStart(2, '0')}
          </a>
        \`;
      }
      html += \`</div>\`;
      
      if (totalEps > 100) {
        html += \`
          <div style="text-align:center; margin-top:12px; font-size:12px; color:rgba(255,255,255,0.3);">
            Showing first 100 episodes. Use the bot command for more: /<b>\${command}</b>
          </div>
        \`;
      }
      
      searchContent.innerHTML = html;
      searchSectionTitle.innerText = 'Select Episode';
    }

    // Global functions for onclick
    window.selectSerial = function(name) {
      if (selectedSerial === name) {
        selectedSerial = null;
      } else {
        selectedSerial = name;
      }
      selectedSeason = null;
      showSerials();
      renderSerialChips(serialsData);
    };

    window.selectSeason = function(season) {
      if (selectedSeason === season) {
        selectedSeason = null;
      } else {
        selectedSeason = season;
      }
      const serial = serialsData.find(s => s.name === selectedSerial);
      if (serial && selectedSeason) {
        renderEpisodes(serial, selectedSeason);
      } else if (serial) {
        renderSeasons(serial);
      }
    };

    // ─── LOAD DASHBOARD DATA ───
    async function loadDashboard() {
      try {
        const res = await fetch('/api/ios-dashboard-data/' + userId);
        const data = await res.json();
        if (!data.success) return;
        
        state.mythopoints = data.profile.mythopoints || 0;
        state.streak = data.profile.streak || 0;
        state.verified = data.profile.is_verified || false;
        state.referrals = data.profile.referrals || 0;
        state.credits = data.search.credits || 0;
        state.premium = {
          active: data.premium.active || false,
          plan: data.premium.plan || 'Free',
          daysLeft: data.premium.daysLeft || 0
        };
        state.bank = {
          invested: data.bank.invested || 0,
          pendingYield: data.bank.pendingInterest || 0,
          loan: data.bank.loanDue || 0
        };
        state.stats = {
          earned: data.stats.lifetimeEarned || 0,
          spent: data.stats.lifetimeSpent || 0
        };
        state.payment = {
          used: data.payment?.usedToday || 0,
          limit: data.payment?.dailyLimit || 1
        };
        updateUI();
        loadSpinStatus();
      } catch (e) {
        console.error('Dashboard error:', e);
      }
    }

    // ─── SPIN & WIN (Enhanced) ───
    const spinAdOverlay = document.getElementById('spinAdOverlay');
    const spinAdBtn = document.getElementById('spinAdBtn');
    const spinAdTitle = document.getElementById('spinAdTitle');
    let spinAdResolve = null;
    let spinAdType = 'spin';

    function showSpinAd(type) {
      return new Promise((resolve) => {
        spinAdType = type;
        spinAdTitle.innerText = type === 'spin' ? '🎰 Watch Ad to Spin' : '🎯 Watch Ad to Double';
        spinAdOverlay.classList.add('open');
        spinAdResolve = resolve;
        tg.HapticFeedback.impactOccurred('medium');
      });
    }

    spinAdBtn.addEventListener('click', function() {
      if (typeof show_9055307 !== 'function') {
        alert('Ad service is loading or unavailable. Once Check If you enabled DNS OR Adblocker please disable it!');
        spinAdOverlay.classList.remove('open');
        if (spinAdResolve) spinAdResolve(false);
        return;
      }
      
      show_9055307().then(() => {
        spinAdOverlay.classList.remove('open');
        if (spinAdResolve) spinAdResolve(true);
        tg.HapticFeedback.notificationOccurred('success');
      }).catch((error) => {
        alert("Ad failed or was closed early. Please try again.");
        console.error("Monetag Error:", error);
        spinAdOverlay.classList.remove('open');
        if (spinAdResolve) spinAdResolve(false);
      });
    });

    spinAdOverlay.addEventListener('click', (e) => {
      if (e.target === spinAdOverlay) {
        // Do not close by clicking outside
      }
    });

    // === SPIN WHEEL LOGIC ===
    const spinCenterBtn = document.getElementById('spinCenterBtn');
    const spinResult = document.getElementById('spin-result');
    const spinRoll = document.getElementById('spin-roll');
    const spinPoints = document.getElementById('spin-points');
    const spinBonus = document.getElementById('spin-bonus');
    const spinError = document.getElementById('spin-error');

    let isSpinning = false;
    let lastSegment = -1;

    const wheelCanvas = document.getElementById('spinWheel');
    const ctx = wheelCanvas.getContext('2d');
    
    const segments = [
      { label: '1', color: '#ff0055', glow: '#ff4d4d' },
      { label: '2', color: '#6600ff', glow: '#9933ff' },
      { label: '3', color: '#ffaa00', glow: '#ffcc00' },
      { label: '4', color: '#00aa00', glow: '#00ff55' },
      { label: '5', color: '#0055ff', glow: '#00aaff' },
      { label: '6', color: '#aa00ff', glow: '#ff00aa' }
    ];
    const segmentAngle = (2 * Math.PI) / segments.length;

    function drawWheel(rotation = 0) {
      const w = wheelCanvas.width = 400; 
      const h = wheelCanvas.height = 400;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) / 2 - 20; 
      
      ctx.clearRect(0, 0, w, h);
      
      for (let i = 0; i < segments.length; i++) {
        const startAngle = rotation + i * segmentAngle;
        const endAngle = startAngle + segmentAngle;
        const midAngle = startAngle + segmentAngle / 2;
        
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, '#1a001a'); 
        grad.addColorStop(0.5, segments[i].color);
        grad.addColorStop(1, segments[i].glow);
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        const textX = cx + Math.cos(midAngle) * radius * 0.7;
        const textY = cy + Math.sin(midAngle) * radius * 0.7;
        
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.font = '900 36px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(segments[i].label, 0, 0);
        ctx.restore();
      }
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      const rimGrad = ctx.createLinearGradient(0, 0, w, h);
      rimGrad.addColorStop(0, '#FFDF00');
      rimGrad.addColorStop(0.5, '#FFF8DC');
      rimGrad.addColorStop(1, '#B8860B');
      ctx.lineWidth = 14;
      ctx.strokeStyle = rimGrad;
      ctx.stroke();
      
      const numDots = 24;
      for (let j = 0; j < numDots; j++) {
        const dotAngle = rotation + (j * 2 * Math.PI / numDots);
        const dotX = cx + Math.cos(dotAngle) * radius;
        const dotY = cy + Math.sin(dotAngle) * radius;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = (j % 2 === 0) ? '#FFFFFF' : '#FFD700'; 
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    let currentRotation = 0;
    drawWheel(currentRotation);

    spinCenterBtn.addEventListener('click', async function() {
        if (isSpinning) return;
        
        if (this.innerText === 'DOUBLE') {
            handleDouble();
            return;
        }

        if (!state.spin.canSpin) {
            spinError.innerText = 'You already spun today. Come back tomorrow!';
            return;
        }
        spinError.innerText = '';
        
        isSpinning = true;
        this.classList.add('disabled');
        spinResult.style.display = 'none';
        
        try {
            const res = await fetch('/api/spin/do/' + userId, { method: 'POST' });
            const data = await res.json();
            
            if (data.success) {
                const targetSegmentIndex = data.roll - 1; 
                const currentRotMod = currentRotation % (2 * Math.PI);
                
                const offsetAngle = -Math.PI / 2 - (targetSegmentIndex + 0.5) * segmentAngle;
                
                let rotationNeeded = offsetAngle - currentRotMod;
                while (rotationNeeded < 0) rotationNeeded += 2 * Math.PI;
                
                const extraSpins = 25 * 2 * Math.PI; 
                const targetRotation = currentRotation + rotationNeeded + extraSpins;
                
                const duration = 15000;
                const start = performance.now();
                const startRot = currentRotation;
                
                function animateSpin(time) {
                    const progress = Math.min((time - start) / duration, 1);
                    
                    const eased = 1 - Math.pow(1 - progress, 5); 
                    const rot = startRot + (targetRotation - startRot) * eased;
                    
                    drawWheel(rot);
                    
                    let topAngle = (3 * Math.PI / 2 - rot) % (2 * Math.PI);
                    if (topAngle < 0) topAngle += 2 * Math.PI;
                    const currentSegment = Math.floor(topAngle / segmentAngle);
                    
                    if (currentSegment !== lastSegment && progress < 0.99) {
                        tg.HapticFeedback.impactOccurred('light');
                        lastSegment = currentSegment;
                    }
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateSpin);
                    } else {
                        currentRotation = targetRotation;
                        tg.HapticFeedback.impactOccurred('heavy');
                        showSpinResult(data);
                    }
                }
                requestAnimationFrame(animateSpin);
            } else {
                spinError.innerText = data.error || 'Spin failed.';
                isSpinning = false;
                spinCenterBtn.classList.remove('disabled');
            }
        } catch (e) {
            spinError.innerText = 'Network error. Please try again.';
            isSpinning = false;
            spinCenterBtn.classList.remove('disabled');
        }
    });

    async function handleDouble() {
        const adCompleted = await showSpinAd('double');
        if (!adCompleted) {
            spinError.innerText = 'Ad not completed. Double failed.';
            return;
        }
        
        spinCenterBtn.classList.add('disabled');
        spinCenterBtn.innerText = 'WAIT...';
        
        try {
            const res = await fetch('/api/spin/double/' + userId, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                state.mythopoints = data.newBalance;
                state.spin.doubleUsed = true;
                updateUI();
                
                spinPoints.innerText = '+' + data.pointsAdded + ' MythoPoints (doubled)';
                spinCenterBtn.innerText = 'DONE';
                tg.HapticFeedback.notificationOccurred('success');
                await showSuccess('You doubled your spin!', 'Double Success');
            } else {
                spinError.innerText = data.error || 'Double failed.';
                spinCenterBtn.classList.remove('disabled');
                spinCenterBtn.innerText = 'DOUBLE';
            }
        } catch (e) {
            spinError.innerText = 'Network error.';
            spinCenterBtn.classList.remove('disabled');
            spinCenterBtn.innerText = 'DOUBLE';
        }
    }

    function showSpinResult(data) {
        state.mythopoints = data.newBalance;
        state.spin.canSpin = false;
        state.spin.streak = data.streak;
        state.spin.roll = data.roll;
        state.spin.doubleUsed = false;
        updateUI();
        
        spinResult.style.display = 'block';
        spinRoll.innerText = '🎲 ' + data.roll;
        
        let pointsMsg = '+' + data.pointsAdded + ' MythoPoints';
        if (data.bonus > 0) {
          pointsMsg += ' (incl. ' + data.bonus + ' bonus)';
          spinBonus.innerText = '🔥 Streak Bonus: +' + data.bonus + ' MythoPoints!';
        } else {
          spinBonus.innerText = '';
        }
        spinPoints.innerText = pointsMsg;
        
        if (data.canDouble !== false) {
          spinCenterBtn.classList.remove('disabled');
          spinCenterBtn.innerText = 'DOUBLE';
          spinCenterBtn.style.fontSize = '16px';
        } else {
          spinCenterBtn.classList.add('disabled');
          spinCenterBtn.innerText = 'DONE';
        }
        
        isSpinning = false;
        loadSpinStatus();
        triggerSpinCelebration(data.roll);
    }

    function triggerSpinCelebration(roll) {
      const end = Date.now() + 1500;
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ffd60a', '#d500f9', '#00e676'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ffd60a', '#d500f9', '#00e676'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }

    async function loadSpinStatus() {
      try {
        const res = await fetch('/api/spin/status/' + userId);
        const data = await res.json();
        if (data.success) {
          state.spin.canSpin = data.canSpin;
          state.spin.streak = data.streak;
          state.spin.countdown = data.countdown;
          state.spin.roll = data.roll;
          state.spin.doubleUsed = data.doubleUsed;
          updateUI();
          
          if (data.roll !== null && !data.doubleUsed && !isSpinning) {
            spinResult.style.display = 'block';
            spinRoll.innerText = '🎲 ' + data.roll;
            spinPoints.innerText = '+' + data.roll + ' MythoPoints';
            spinCenterBtn.innerText = 'DOUBLE';
            spinCenterBtn.style.fontSize = '16px';
            spinCenterBtn.classList.remove('disabled');
          } else if (data.roll !== null && data.doubleUsed && !isSpinning) {
            spinResult.style.display = 'block';
            spinRoll.innerText = '🎲 ' + data.roll;
            spinPoints.innerText = '+' + data.roll + ' MythoPoints (doubled)';
            spinCenterBtn.innerText = 'DONE';
            spinCenterBtn.classList.add('disabled');
          } else if (!isSpinning) {
            spinResult.style.display = 'none';
            if (data.canSpin) {
              spinCenterBtn.innerText = 'SPIN';
              spinCenterBtn.style.fontSize = '20px';
              spinCenterBtn.classList.remove('disabled');
            } else {
              spinCenterBtn.innerText = 'WAIT';
              spinCenterBtn.classList.add('disabled');
            }
          }
        }
      } catch (e) {
        console.error('Spin status error:', e);
      }
    }

    setInterval(loadSpinStatus, 1000);

    // ─── BANK DATA ───
    async function loadBankData() {
      try {
        const res = await fetch('/api/bank/status/' + userId);
        const data = await res.json();
        if (!data.success) return;
        state.bank.invested = data.invested || 0;
        state.bank.pendingYield = data.pendingInterest || 0;
        state.bank.loan = data.loanDue || 0;
        
        const claimBtn = document.getElementById('bank-claim-btn');
        if (data.pendingInterest > 0) {
          claimBtn.style.display = 'block';
          claimBtn.innerText = 'Claim +' + data.pendingInterest;
          claimBtn.onclick = () => claimInterest();
        } else {
          claimBtn.style.display = 'none';
        }
        updateUI();
      } catch (e) {}
    }

    async function claimInterest() {
      try {
        const res = await fetch('/api/bank/claim/' + userId, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          await showSuccess('Claimed ' + data.claimed + ' MythoPoints!', 'Interest Claimed');
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error || 'Failed to claim.');
        }
      } catch (e) {}
    }

    document.getElementById('invest-btn').addEventListener('click', async () => {
      const amount = parseInt(document.getElementById('invest-amount').value);
      if (!amount || amount < 1) return alert('Enter a valid amount.');
      const confirmed = await showConfirm(\`Invest \${amount} Mythopoints into MythoFund?\`);
      if (!confirmed) return;
      try {
        const res = await fetch('/api/bank/invest/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (data.success) {
          await showSuccess(data.message, 'Investment Successful');
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    document.getElementById('withdraw-btn').addEventListener('click', async () => {
      const amount = parseInt(document.getElementById('invest-amount').value);
      if (!amount || amount < 1) return alert('Enter a valid amount.');
      const confirmed = await showConfirm(\`Withdraw \${amount} Mythopoints from investment?\`);
      if (!confirmed) return;
      try {
        const res = await fetch('/api/bank/withdraw/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (data.success) {
          await showSuccess(data.message, 'Withdrawal Successful');
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    document.getElementById('loan-apply-btn').addEventListener('click', async () => {
      const confirmed = await showConfirm('Apply for a loan of 100 Mythopoints? (10% daily interest)');
      if (!confirmed) return;
      try {
        const res = await fetch('/api/bank/loan/apply/' + userId, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          await showSuccess(data.message, 'Loan Granted');
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    document.getElementById('loan-repay-btn').addEventListener('click', async () => {
      const confirmed = await showConfirm('Repay your active loan with interest?');
      if (!confirmed) return;
      try {
        const res = await fetch('/api/bank/loan/repay/' + userId, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          await showSuccess(data.message, 'Loan Repaid');
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    // ─── WITHDRAW ───
    async function loadWithdrawHistory() {
      try {
        const res = await fetch('/api/withdraw/history/' + userId);
        const data = await res.json();
        if (data.success && data.requests.length) {
          let html = '<div style="font-size:11px; color:rgba(255,255,255,0.3); margin-bottom:4px;">Recent Withdrawals</div>';
          data.requests.forEach(w => {
            const statusColor = w.status === 'Pending' ? '#ffd60a' : (w.status === 'Paid' ? '#30d158' : '#ff453a');
            html += \`
              <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:0.5px solid rgba(255,255,255,0.04); font-size:12px;">
                <span>₹\${w.amount} via \${w.method}</span>
                <span style="color:\${statusColor};">\${w.status}</span>
              </div>
            \`;
          });
          document.getElementById('withdraw-history').innerHTML = html;
        } else {
          document.getElementById('withdraw-history').innerHTML = '<div class="empty" style="font-size:12px; padding:8px;">No withdrawals yet.</div>';
        }
      } catch (e) {}
    }

    document.getElementById('withdraw-request-btn').addEventListener('click', async () => {
      const amount = parseInt(document.getElementById('withdraw-amount').value);
      const method = document.getElementById('withdraw-method').value.trim();
      if (!amount || amount < 10) return alert('Minimum withdraw is ₹10.');
      if (!method) return alert('Please enter a payment method.');
      const confirmed = await showConfirm(\`Withdraw ₹\${amount} via \${method}? This will deduct \${amount*10000} Mythopoints.\`);
      if (!confirmed) return;
      try {
        const res = await fetch('/api/withdraw/request/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, method })
        });
        const data = await res.json();
        if (data.success) {
          await showSuccess(data.message, 'Withdraw Requested');
          loadDashboard();
          loadWithdrawHistory();
          document.getElementById('withdraw-amount').value = '';
          document.getElementById('withdraw-method').value = '';
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    // ─── STORE ───
    const storeCosts = {
      'credits': 50,
      'skip_cooldown': 50,
      'mystery': 100,
      'coupon_10': 200,
      'coupon_20': 500,
      'coupon_30': 800,
      'coupon_50': 1500
    };
    const storeNames = {
      'credits': '5 Search Credits',
      'skip_cooldown': 'Skip Cooldown',
      'mystery': 'Mystery Box',
      'coupon_10': '10% OFF Coupon',
      'coupon_20': '20% OFF Coupon',
      'coupon_30': '30% OFF Coupon',
      'coupon_50': '50% OFF Coupon'
    };

    async function purchase(item) {
      const cost = storeCosts[item];
      const name = storeNames[item] || item;
      if (!cost) return alert('Invalid item.');
      const confirmed = await showConfirm(\`Purchase \${name} for \${cost} Mythopoints?\`);
      if (!confirmed) return;
      try {
        const res = await fetch('/api/store/purchase/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item })
        });
        const data = await res.json();
        if (data.success) {
          await showSuccess(data.message, 'Purchase Successful');
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    }
    window.purchase = purchase;

    // ─── PAYMENT ─── (UPDATED with read receipts, reactions, online status)
    
    const searchInputPay = document.getElementById('search-user');
    const searchResults = document.getElementById('search-results');
    const recentChatsContainer = document.getElementById('recent-chats-container');

    // Update online status periodically
    async function updateOnlineStatus() {
      try {
        await fetch('/api/payment/online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId })
        });
      } catch (e) {
        console.warn('Failed to update online status:', e);
      }
    }
    
    // Update online status every 30 seconds
    updateOnlineStatus();
    setInterval(updateOnlineStatus, 30000);

    searchInputPay.addEventListener('input', async function() {
      const query = this.value.trim();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        recentChatsContainer.style.display = 'block'; 
        return;
      }
      
      recentChatsContainer.style.display = 'none'; 
      
      try {
        const res = await fetch('/api/users/search?q=' + encodeURIComponent(query));
        const data = await res.json();
        if (data.success && data.users.length) {
          let html = '';
          data.users.forEach(u => {
            const avatar = u.photo_url ? \`<img src="\${u.photo_url}" class="result-avatar" />\` :
                          \`<div class="result-avatar">\${u.name.charAt(0).toUpperCase()}</div>\`;
            html += \`
              <div class="user-result" onclick="selectUserForPay(\${u.id}, '\${u.name}', '\${u.photo_url || ''}')" style="padding: 12px; display:flex; align-items:center; gap:14px; border-bottom:1px solid rgba(255,255,255,0.06);">
                \${avatar}
                <div class="result-info" style="flex:1;">
                  <div class="name" style="font-size:15px; font-weight:500;">\${u.name} \${u.username ? '@'+u.username : ''}</div>
                  <div class="sub" style="font-size:12px; color:rgba(255,255,255,0.4); margin-top:2px;">\${u.points} pts</div>
                </div>
                <div style="font-size:12px; color:rgba(255,255,255,0.3);">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                </div>
              </div>
            \`;
          });
          searchResults.innerHTML = html;
        } else {
          searchResults.innerHTML = '<div class="empty" style="font-size:12px; padding:12px;">No users found.</div>';
        }
      } catch (e) {}
    });

    async function loadRecentChats() {
      try {
        const res = await fetch('/api/payment/recent/' + userId);
        const data = await res.json();
        const listContainer = document.getElementById('recent-chats-list');
        
        if (data.success && data.recent.length > 0) {
          let html = '';
          data.recent.forEach(u => {
            const avatar = u.photo_url ? \`<img src="\${u.photo_url}" class="result-avatar" />\` :
                          \`<div class="result-avatar">\${u.name.charAt(0).toUpperCase()}</div>\`;
            
            const unreadBadge = u.unreadCount > 0 
                ? \`<div style="background:#00e676; color:#000; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:10px;">\${u.unreadCount}</div>\` 
                : '';
                
            const onlineDot = u.isOnline 
                ? \`<span class="online-dot" style="width:8px;height:8px;display:inline-block;"></span>\`
                : \`<span class="online-dot offline" style="width:8px;height:8px;display:inline-block;"></span>\`;

            html += \`
              <div class="user-result" onclick="selectUserForPay(\${u.id}, '\${u.name}', '\${u.photo_url || ''}')" style="padding: 12px; display:flex; align-items:center; gap:14px; border-bottom:1px solid rgba(255,255,255,0.06);">
                \${avatar}
                <div class="result-info" style="flex:1; overflow:hidden;">
                  <div class="name" style="font-size:15px; font-weight:500; display:flex; align-items:center; gap:4px;">
                    \${u.name} \${onlineDot}
                  </div>
                  <div class="sub" style="font-size:12px; color:rgba(255,255,255,0.4); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${u.lastMessage}</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                  \${unreadBadge}
                  <div style="font-size:12px; color:rgba(255,255,255,0.3);">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                  </div>
                </div>
              </div>
            \`;
          });
          listContainer.innerHTML = html;
        } else {
          listContainer.innerHTML = '<div class="empty" style="font-size:12px; padding:12px;">No recent chats yet. Send a payment to start!</div>';
        }
      } catch (e) {
        console.error("Error loading recent chats:", e);
      }
    }

    async function selectUserForPay(id, name, photo) {
      selectedReceiver = id;
      document.getElementById('paySearchArea').classList.add('hidden');
      document.getElementById('payFullscreen').classList.add('open');
      
      document.getElementById('payUserAvatar').src = photo || 'https://via.placeholder.com/100';
      document.getElementById('payUserName').innerHTML = name + ' <span class="online-dot offline" id="payOnlineDot"></span>';
      document.getElementById('payUserId').innerText = 'ID: ' + id;
      
      // Check online status
      checkUserOnlineStatus(id);
      
      loadPayChat(id);
      document.getElementById('payAmountInput').focus();
      document.getElementById('payStatus').innerHTML = '';

      // Mark messages as read
      fetch('/api/payment/chat/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, otherId: id })
      }).then(() => {
          checkUnreadCount();
      }).catch(e => console.log(e));
      
      // Start polling for new messages
      if (payChatPollInterval) {
        clearInterval(payChatPollInterval);
      }
      payChatPollInterval = setInterval(() => {
        if (selectedReceiver) {
          loadPayChat(selectedReceiver, true);
        }
      }, 3000);
    }

    window.selectUserForPay = selectUserForPay;

    document.getElementById('payBackBtn').addEventListener('click', function() {
      document.getElementById('payFullscreen').classList.remove('open');
      document.getElementById('paySearchArea').classList.remove('hidden');
      selectedReceiver = null;
      if (payChatPollInterval) {
        clearInterval(payChatPollInterval);
        payChatPollInterval = null;
      }
      loadRecentChats(); 
      checkUnreadCount();
    });

    async function checkUserOnlineStatus(userId) {
      try {
        const res = await fetch('/api/payment/online-status/' + userId);
        const data = await res.json();
        const dot = document.getElementById('payOnlineDot');
        if (data.success) {
          if (data.isOnline) {
            dot.className = 'online-dot';
          } else {
            dot.className = 'online-dot offline';
          }
        }
      } catch (e) {
        console.warn('Failed to check online status:', e);
      }
    }

    async function loadPayChat(receiverId, silent = false) {
      try {
        const res = await fetch('/api/payment/chat/' + userId + '?otherId=' + receiverId);
        const data = await res.json();
        if (data.success) {
          currentChatMessages = data.chats;
          const container = document.getElementById('payChatArea');
          
          let html = \`
            <div class="encryption-msg">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
              Your messages and payments are secured with 256-bit encryption
            </div>
          \`;

          if (data.chats.length === 0) {
            // Empty state - show welcome message
            html += \`
              <div style="text-align:center; padding:40px 20px; color:rgba(255,255,255,0.3);">
                <div style="font-size:48px; margin-bottom:16px;">💬</div>
                <p>No messages yet. Say hello or send a payment!</p>
              </div>
            \`;
          } else {
            let lastDate = '';
            const sorted = [...data.chats].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            sorted.forEach(c => {
              // Skip if deleted for this user
              if (c.deletedFor && c.deletedFor.includes(userId)) return;
              
              const isSent = c.senderId === userId;
              const dateObj = new Date(c.timestamp);
              const time = dateObj.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
              const dateStr = dateObj.toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'});
              
              if (dateStr !== lastDate) {
                html += \`<div class="chat-date">\${dateStr}</div>\`;
                lastDate = dateStr;
              }

              // Avatar for sender
              const senderPhoto = isSent ? (tgUser?.photo_url || null) : c.senderPhoto;
              const senderName = isSent ? (tgUser?.first_name || 'You') : (c.senderName || 'User');
              
              const avatar = senderPhoto ? 
                \`<img src="\${senderPhoto}" class="avatar" />\` : 
                \`<div class="avatar" style="background:#651fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">\${senderName.charAt(0)}</div>\`;
              
              let bubbleHtml = '';
              let isRead = c.read || false;
              
              if (c.type === 'payment') {
                const statusText = isSent ? 'SENT' : 'RECEIVED';
                bubbleHtml = \`
                  <div class="bubble payment">
                    <div class="payment-amount">M \${c.amount}</div>
                    <div class="payment-status success">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="background:#30d158; color:#0a0014; border-radius:50%; padding:2px;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      \${statusText} SECURELY
                    </div>
                    \${isSent ? '<div style="font-size:10px; color:rgba(255,255,255,0.4); margin-top:12px;">Tax: ' + (c.tax || 0) + ' pts</div>' : ''}
                  </div>
                \`;
              } else {
                bubbleHtml = \`<div class="bubble text">\${c.message}</div>\`;
              }
              
              // Reactions
              let reactionsHtml = '';
              if (c.reactions && c.reactions.length > 0) {
                const reactionMap = {};
                c.reactions.forEach(r => {
                  if (!reactionMap[r.reaction]) reactionMap[r.reaction] = [];
                  reactionMap[r.reaction].push(r.userId);
                });
                reactionsHtml = \`<div class="reaction-bar">\`;
                Object.keys(reactionMap).forEach(emoji => {
                  const count = reactionMap[emoji].length;
                  reactionsHtml += \`
                    <button class="reaction-btn" onclick="addReaction('\${c.messageId}', '\${emoji}')">
                      \${emoji} <span class="count">\${count}</span>
                    </button>
                  \`;
                });
                reactionsHtml += \`</div>\`;
              }
              
              // Message actions
              const actionsHtml = \`
                <div class="msg-actions">
                  <button onclick="showReactionPicker('\${c.messageId}')">😊</button>
                  \${isSent ? \`<button onclick="deleteMessageForSelf('\${c.messageId}')">🗑️</button>\` : ''}
                </div>
              \`;
              
              // Read receipt tick
              let tickHtml = '';
              if (isSent) {
                tickHtml = isRead ? 
                  \`<span class="tick" style="color:#30d158;">✓✓</span>\` : 
                  \`<span class="tick" style="color:rgba(255,255,255,0.3);">✓</span>\`;
              }
              
              html += \`
                <div class="chat-msg \${isSent ? 'sent' : 'received'}" data-message-id="\${c.messageId}">
                  \${avatar}
                  <div class="bubble-wrapper">
                    \${bubbleHtml}
                    \${reactionsHtml}
                    \${actionsHtml}
                    <div class="time">
                      \${time} \${tickHtml}
                    </div>
                  </div>
                </div>
              \`;
            });
          }
          container.innerHTML = html;
          container.scrollTop = container.scrollHeight;
          
          // If not silent, mark messages as read
          if (!silent && selectedReceiver) {
            fetch('/api/payment/chat/mark-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userId, otherId: selectedReceiver })
            }).then(() => {
              checkUnreadCount();
            }).catch(e => console.log(e));
          }
        }
      } catch (e) {
        console.error('Pay chat load error:', e);
      }
    }

    // ─── REACTION FUNCTIONS ───
    let reactionPickerMessageId = null;
    const reactionOptions = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];

    function showReactionPicker(messageId) {
      reactionPickerMessageId = messageId;
      // Create a reaction picker popup
      const existing = document.querySelector('.reaction-popup');
      if (existing) existing.remove();
      
      const popup = document.createElement('div');
      popup.className = 'reaction-popup open';
      reactionOptions.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'reaction-option';
        btn.textContent = emoji;
        btn.onclick = () => {
          addReaction(messageId, emoji);
          popup.remove();
        };
        popup.appendChild(btn);
      });
      
      // Find the message bubble
      const msgElement = document.querySelector(\`.chat-msg[data-message-id="\${messageId}"]\`);
      if (msgElement) {
        const bubble = msgElement.querySelector('.bubble-wrapper');
        if (bubble) {
          bubble.style.position = 'relative';
          bubble.appendChild(popup);
          // Auto close after 5 seconds
          setTimeout(() => {
            if (popup.parentNode) popup.remove();
          }, 5000);
        }
      }
      tg.HapticFeedback.impactOccurred('light');
    }
    window.showReactionPicker = showReactionPicker;

    async function addReaction(messageId, reaction) {
      try {
        const res = await fetch('/api/payment/chat/reaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, userId, reaction })
        });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.impactOccurred('light');
          if (selectedReceiver) {
            loadPayChat(selectedReceiver, true);
          }
        }
      } catch (e) {
        console.error('Reaction error:', e);
      }
    }
    window.addReaction = addReaction;

    // ─── DELETE MESSAGE FOR SELF ───
    async function deleteMessageForSelf(messageId) {
      const confirmed = await showConfirm('Delete this message for yourself?');
      if (!confirmed) return;
      
      try {
        const res = await fetch('/api/payment/chat/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, userId })
        });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          if (selectedReceiver) {
            loadPayChat(selectedReceiver, true);
          }
        }
      } catch (e) {
        console.error('Delete error:', e);
      }
    }
    window.deleteMessageForSelf = deleteMessageForSelf;

    // ─── CLEAR CHAT HISTORY ───
    async function clearChatHistory() {
      if (!selectedReceiver) return;
      const confirmed = await showConfirm('Clear all messages with this user for yourself?');
      if (!confirmed) return;
      
      try {
        const res = await fetch('/api/payment/chat/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, otherId: selectedReceiver })
        });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          await showSuccess('Chat history cleared for you.', 'Cleared');
          if (selectedReceiver) {
            loadPayChat(selectedReceiver, true);
          }
        }
      } catch (e) {
        console.error('Clear chat error:', e);
      }
    }
    window.clearChatHistory = clearChatHistory;

    // Add clear chat button to header
    document.querySelector('.chat-header').insertAdjacentHTML('beforeend', \`
      <button onclick="clearChatHistory()" style="background:none;border:none;color:#ff453a;font-size:12px;cursor:pointer;padding:4px;">✕</button>
    \`);

    // ─── PAYMENT SEND ───
    document.getElementById('paySendBtn').addEventListener('click', async function() {
      const inputVal = document.getElementById('payAmountInput').value.trim();
      if (!inputVal || !selectedReceiver) return;
      
      const isNumeric = /^\\d+$/.test(inputVal);
      
      if (isNumeric) {
          const amount = parseInt(inputVal);
          if (amount < 200) {
              document.getElementById('payStatus').innerHTML = '<span style="color:#ff453a;">Minimum 200 MythoPoints.</span>';
              return;
          }
          const processing = document.getElementById('payment-processing');
          processing.classList.add('active');
          this.disabled = true;
          
          try {
            const res = await fetch('/api/payment/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: userId, receiverId: selectedReceiver, amount: amount })
            });
            const data = await res.json();
            processing.classList.remove('active');
            this.disabled = false;
            
            if (data.success) {
              tg.HapticFeedback.notificationOccurred('success');
              document.getElementById('payAmountInput').value = '';
              document.getElementById('payStatus').innerHTML = '';
              loadDashboard();
              loadPayChat(selectedReceiver);
            } else {
              document.getElementById('payStatus').innerHTML = '<span style="color:#ff453a;">' + data.error + '</span>';
              tg.HapticFeedback.notificationOccurred('error');
            }
          } catch (e) {
            processing.classList.remove('active');
            this.disabled = false;
            document.getElementById('payStatus').innerHTML = '<span style="color:#ff453a;">Network error.</span>';
          }
      } else {
          try {
              const res = await fetch('/api/payment/chat/message', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      senderId: userId, 
                      receiverId: selectedReceiver, 
                      message: inputVal,
                      senderName: tgUser?.first_name || 'User'
                  })
              });
              const data = await res.json();
              if (data.success) {
                  document.getElementById('payAmountInput').value = '';
                  document.getElementById('payStatus').innerHTML = '';
                  loadPayChat(selectedReceiver);
              }
          } catch(e) {
              console.error(e);
          }
      }
    });

    document.getElementById('payAmountInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('paySendBtn').click();
        }
    });
    
    // ─── CHECK UNREAD COUNT & UPDATE BADGE ───
    async function checkUnreadCount() {
      try {
        const res = await fetch('/api/payment/unread/' + userId);
        const data = await res.json();
        if (data.success) {
          const badge = document.getElementById('payUnreadBadge');
          const total = data.total || 0;
          if (total > 0) {
            badge.textContent = total > 99 ? '99+' : total;
            badge.classList.add('show');
          } else {
            badge.classList.remove('show');
          }
        }
      } catch (e) {
        console.warn('Failed to check unread count:', e);
      }
    }
    
    // Check unread count every 10 seconds
    setInterval(checkUnreadCount, 10000);
    checkUnreadCount();

    // ─── HISTORY ───
    let historyPage = 1;
    let historyLoading = false;
    let historyHasMore = true;
    const historyContainer = document.getElementById('ui-history-list');

    async function loadHistory(page, reset = false) {
      if (historyLoading) return;
      historyLoading = true;
      
      if (reset) {
        historyPage = 1;
        historyHasMore = true;
        historyContainer.innerHTML = '';
        document.getElementById('history-loader').style.display = 'none';
      }
      
      const loader = document.getElementById('history-loader');
      if (page > 1) loader.style.display = 'block';
      
      try {
        const res = await fetch(\`/api/history/\${userId}?filter=ALL&page=\${page}\`);
        const data = await res.json();
        if (!data.success || data.history.length === 0) {
          historyHasMore = false;
          loader.style.display = 'none';
          if (page === 1) {
            historyContainer.innerHTML = '<div class="empty">No transactions found.</div>';
          }
          historyLoading = false;
          return;
        }
        
        const html = data.history.map(item => {
          const isEarn = item.type === 'EARNED';
          const isTax = item.type === 'TAX';
          const sign = isEarn ? '+' : '-';
          const cls = isEarn ? 'val-pos' : 'val-neg';
          const date = new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
          let iconClass = 'default';
          let iconSvg = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm0 8h-2v2h2z"/></svg>';
          if (isEarn) {
            iconClass = 'earn';
            iconSvg = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
          } else if (isTax) {
            iconClass = 'tax';
            iconSvg = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm0 8h-2v2h2z"/></svg>';
          } else {
            iconClass = 'spend';
            iconSvg = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
          }
          return \`
            <div class="list-item" style="padding:8px 12px;">
              <div class="tx-icon" style="width:28px;height:28px;">\${iconSvg}</div>
              <div class="item-content">
                <div class="item-left">
                  <p style="font-size:13px;">\${item.reason || item.type}</p>
                  <span style="font-size:10px;">\${date}</span>
                </div>
                <div class="item-right \${cls}" style="font-size:13px;">\${sign}\${item.amount}</div>
              </div>
            </div>
          \`;
        }).join('');
        
        if (reset || page === 1) {
          historyContainer.innerHTML = html;
        } else {
          historyContainer.innerHTML += html;
        }
        
        historyPage = page;
        historyHasMore = data.history.length >= 15;
        loader.style.display = 'none';
        historyLoading = false;
        setupHistoryObserver();
      } catch (e) {
        console.error('History error:', e);
        historyContainer.innerHTML = '<div class="empty" style="color:#ff453a;">Failed to load history.</div>';
        loader.style.display = 'none';
        historyLoading = false;
      }
    }

    let historyObserver = null;
    function setupHistoryObserver() {
      if (historyObserver) historyObserver.disconnect();
      const sentinel = document.createElement('div');
      sentinel.id = 'history-sentinel';
      sentinel.style.height = '2px';
      sentinel.style.opacity = '0';
      historyContainer.appendChild(sentinel);
      historyObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && historyHasMore && !historyLoading) {
          loadHistory(historyPage + 1, false);
        }
      }, { root: historyContainer, rootMargin: '100px' });
      historyObserver.observe(sentinel);
    }

    // ─── LEADERBOARD ───
    let lbPage = 1, lbFilter = 'all', lbTotalPages = 1;
    async function loadLeaderboard() {
      const list = document.getElementById('lb-list');
      list.innerHTML = '<div class="spinner"></div>';
      try {
        const res = await fetch(\`/api/leaderboard/\${userId}?timeframe=\${lbFilter}&page=\${lbPage}\`);
        const data = await res.json();
        if (!data.success) throw new Error('API error');
        lbTotalPages = data.totalPages || 1;
        document.getElementById('lb-page-info').innerText = \`Page \${data.page} of \${lbTotalPages}\`;
        if (data.users.length === 0) {
          list.innerHTML = '<div class="empty">No users found.</div>';
          return;
        }
        let html = '<div class="list-card">';
        data.users.forEach((u, idx) => {
          const rank = (data.page - 1) * 10 + idx + 1;
          let rankClass = 'lb-rank';
          if (rank === 1) rankClass += ' gold';
          else if (rank === 2) rankClass += ' silver';
          else if (rank === 3) rankClass += ' bronze';
          else rankClass += ' default';
          const isSelf = u.user_id == userId;
          if (isSelf) rankClass += ' self';
          const nameClass = isSelf ? 'lb-name self-highlight' : 'lb-name';
          const youTag = isSelf ? '<span class="you-tag">You</span>' : '';
          let avatarHtml = '';
          if (u.photo_url) {
            avatarHtml = \`<img src="\${u.photo_url}" class="lb-avatar" style="object-fit: cover;" />\`;
          } else {
            const initial = u.name ? u.name.charAt(0).toUpperCase() : '?';
            const hue = (u.user_id * 137) % 360;
            const bgColor = \`hsl(\${hue}, 70%, 40%)\`;
            avatarHtml = \`<div class="lb-avatar" style="background:\${bgColor};">\${initial}</div>\`;
          }
          const rankBadge = \`#\${rank}\`;
          html += \`
            <div class="lb-item \${rankClass}" style="\${isSelf ? 'background:rgba(213,0,249,0.05); border-left:3px solid #d500f9;' : ''}">
              <div class="lb-avatar-wrap">
                \${avatarHtml}
                <div class="rank-badge">\${rankBadge}</div>
              </div>
              <div class="lb-info">
                <span class="\${nameClass}">\${u.name} \${youTag}</span>
              </div>
              <div class="lb-pts">\${u.points} pts</div>
            </div>
          \`;
        });
        if (data.currentUser) {
          const cu = data.currentUser;
          html += \`
            <div class="lb-self-row">
              <span>🕵️‍♀️ Your Rank: <strong class="lb-self-rank">#\${cu.rank || 'Unranked'}</strong></span>
              <span class="lb-self-pts">\${cu.points} pts</span>
            </div>
          \`;
        }
        html += '</div>';
        list.innerHTML = html;
      } catch (e) {
        list.innerHTML = '<div class="empty" style="color:#ff453a;">Failed to load leaderboard.</div>';
      }
    }

    document.querySelectorAll('.lb-filter').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        lbFilter = this.dataset.filter;
        lbPage = 1;
        loadLeaderboard();
      });
    });
    document.getElementById('lb-prev').addEventListener('click', () => {
      if (lbPage > 1) { lbPage--; loadLeaderboard(); }
    });
    document.getElementById('lb-next').addEventListener('click', () => {
      if (lbPage < lbTotalPages) { lbPage++; loadLeaderboard(); }
    });

    // ─── RATING ───
    let userRated = false;
    async function loadRatingStatus() {
      try {
        const res = await fetch('/api/rating/status/' + userId);
        const data = await res.json();
        if (data.success) {
          const statusDiv = document.getElementById('rating-status');
          const starContainer = document.getElementById('star-container');
          const msgDiv = document.getElementById('rating-message');
          if (data.userRating) {
            userRated = true;
            statusDiv.innerHTML = \`<p style="color:#ffd60a; font-size:12px;">You rated \${data.userRating} ⭐ | Avg: \${data.average.toFixed(1)} (\${data.totalRatings} ratings)</p>\`;
            starContainer.style.display = 'none';
            msgDiv.innerText = 'Thanks for rating!';
          } else {
            userRated = false;
            statusDiv.innerHTML = \`<p style="color:rgba(255,255,255,0.3); font-size:12px;">Avg Rating: \${data.average.toFixed(1)} (\${data.totalRatings} ratings)</p>\`;
            starContainer.style.display = 'flex';
            msgDiv.innerText = 'Tap a star to rate!';
          }
        }
      } catch (e) {}
    }

    document.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', async function() {
        if (userRated) return;
        const rating = parseInt(this.dataset.value);
        const confirmed = await showConfirm(\`Rate MythoBot \${rating} stars? You'll earn 10 Mythopoints.\`);
        if (!confirmed) return;
        try {
          const res = await fetch('/api/rating/submit/' + userId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
          });
          const data = await res.json();
          if (data.success) {
            await showSuccess(data.message, 'Rating Submitted');
            loadRatingStatus();
            loadDashboard();
          } else {
            alert(data.error);
          }
        } catch (e) {}
      });
    });

    // ─── WATCH & EARN FAB LOGIC ───
    const earnFab = document.getElementById('earnFab');
    if(earnFab) {
        earnFab.addEventListener('click', async function() {
            if (typeof show_9055307 !== 'function') {
                alert('Ad service is still loading. Please wait a moment.');
                return;
            }

            const confirmed = await showConfirm('Watch a quick ad to earn 1 to 3 MythoPoints? (Max 5 per day)');
            if (!confirmed) return;
            
            show_9055307().then(() => {
                tg.HapticFeedback.notificationOccurred('success');
                fetch('/api/watch-earn/claim/' + userId, { method: 'POST' })
                    .then(res => res.json())
                    .then(async data => {
                        if(data.success) {
                            state.mythopoints = data.newBalance;
                            updateUI();
                            await showSuccess('+' + data.reward + ' MythoPoints!', 'Reward Claimed'); 
                        } else {
                            alert(data.error || "Error claiming reward.");
                        }
                    }).catch(err => {
                        alert("Network error while claiming reward.");
                    });
            }).catch((error) => {
                alert("Ad failed to load or was closed early.");
                console.error("Monetag Error:", error);
            });
        });
    }
  
    // ─── CHANT & EARN ───
    const CHANT_KEY = 'mytho_chant_' + userId;
    let chantTapCount = 0;
    const orb = document.getElementById('chant-orb');
    const textEl = document.getElementById('chant-text');
    const editBtn = document.getElementById('chant-edit');
    
    let chantText = localStorage.getItem('chantText') || 'Radha Radha';
    textEl.innerText = chantText;
    
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newText = prompt('Enter your chant:', chantText);
      if (newText && newText.trim().length > 0) {
        chantText = newText.trim();
        textEl.innerText = chantText;
        localStorage.setItem('chantText', chantText);
        tg.HapticFeedback.selectionChanged();
      }
    });

    function loadChantPersistence() {
      try {
        const saved = localStorage.getItem(CHANT_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          chantTapCount = data.taps || 0;
          const lastTap = data.lastTap || 0;
          if (Date.now() - lastTap > 600000) {
            chantTapCount = 0;
            localStorage.removeItem(CHANT_KEY);
          }
        }
      } catch (e) {}
    }

    function saveChantPersistence() {
      try {
        localStorage.setItem(CHANT_KEY, JSON.stringify({
          taps: chantTapCount,
          lastTap: Date.now()
        }));
      } catch (e) {}
    }

    async function fetchChantStats() {
      try {
        const res = await fetch('/api/chant/stats/' + userId);
        const data = await res.json();
        if (data.success) {
          const serverTaps = data.totalTaps || 0;
          const total = serverTaps + chantTapCount;
          state.chant.totalTaps = total;
          updateUI();
          
          const levels = [
            { name: 'Seeker', min: 0, multiplier: 1 },
            { name: 'Devotee', min: 100, multiplier: 1 },
            { name: 'Priest', min: 500, multiplier: 1 },
            { name: 'Ascended', min: 2000, multiplier: 2 },
            { name: 'Moksha', min: 10000, multiplier: 3 }
          ];
          let currentLevel = levels[0];
          for (let i = levels.length - 1; i >= 0; i--) {
            if (state.chant.totalTaps >= levels[i].min) {
              currentLevel = levels[i];
              break;
            }
          }
          state.chant.level = currentLevel.name;
          state.chant.multiplier = currentLevel.multiplier;
          updateUI();
        }
      } catch (e) {
        console.error('Failed to fetch chant stats:', e);
      }
    }

    const orbContainer = document.getElementById('orb3d-container');
    orbContainer.addEventListener('mousemove', (e) => {
      const rect = orbContainer.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      orb.style.transform = \`rotateY(\${x * 15}deg) rotateX(\${-y * 15}deg)\`;
    });
    orbContainer.addEventListener('mouseleave', () => {
      orb.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });

    let lastTapTime = 0;
    orb.addEventListener('click', async function(e) {
      const now = Date.now();
      if (now - lastTapTime < 1000) {
        tg.HapticFeedback.impactOccurred('light');
        return;
      }
      lastTapTime = now;
      
      this.style.transform = 'scale(0.92)';
      setTimeout(() => { this.style.transform = ''; }, 150);
      
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement('div');
      ripple.className = 'ripple';
      ripple.style.width = '20px';
      ripple.style.height = '20px';
      ripple.style.left = (x - 10) + 'px';
      ripple.style.top = (y - 10) + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
      
      tg.HapticFeedback.impactOccurred('light');
      
      spawnFloatingText(e.clientX || (rect.left + rect.width/2), e.clientY || (rect.top + rect.height/2), '+1');
      
      chantTapCount++;
      saveChantPersistence();
      
      const currentTotal = state.chant.totalTaps || 0;
      state.chant.totalTaps = currentTotal + 1;
      updateUI();
      
      if (chantTapCount >= 1000) {
        tg.HapticFeedback.impactOccurred('heavy');
        await syncChantTaps(chantTapCount);
        chantTapCount = 0;
        localStorage.removeItem(CHANT_KEY);
        await fetchChantStats();
        orb.classList.add('chant-mint-animation');
        setTimeout(() => orb.classList.remove('chant-mint-animation'), 600);
        const multiplier = state.chant.multiplier || 1;
        await showSuccess(\`You earned \${multiplier} Mythopoint(s) for 1000 chants!\`, 'Chant Rewarded!');
        loadDashboard();
      }
    });

    function spawnFloatingText(x, y, text) {
      const el = document.createElement('div');
      el.className = 'floating-tap';
      el.innerText = text;
      el.style.left = (x - 15) + 'px';
      el.style.top = (y - 15) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }

    async function syncChantTaps(taps) {
      try {
        const res = await fetch('/api/chant/sync/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newTaps: taps })
        });
        const data = await res.json();
        if (!data.success) {
          console.error('Sync failed:', data.error);
        }
      } catch (e) {
        console.error('Sync error:', e);
      }
    }

    async function loadChantLeaderboard() {
      const list = document.getElementById('chant-lb-list');
      try {
        const res = await fetch('/api/chant/leaderboard?limit=5');
        const data = await res.json();
        if (data.success && data.leaderboard.length) {
          let html = '';
          data.leaderboard.forEach((item, index) => {
            const avatar = item.photo ? \`<img src="\${item.photo}" class="chant-lb-avatar" />\` :
                          \`<div class="chant-lb-avatar" style="background:#651fff;">\${item.name.charAt(0)}</div>\`;
            html += \`
              <div class="chant-lb-item">
                <span class="chant-lb-rank">#\${index+1}</span>
                \${avatar}
                <span class="chant-lb-name">\${item.name}</span>
                <span class="chant-lb-taps">\${item.taps}</span>
              </div>
            \`;
          });
          list.innerHTML = html;
        } else {
          list.innerHTML = '<div class="empty" style="font-size:11px; padding:4px 0;">No chanters yet.</div>';
        }
      } catch (e) {
        list.innerHTML = '<div class="empty" style="font-size:11px; padding:4px 0;">Failed to load.</div>';
      }
    }

    // ─── REFERRAL FUNCTIONS ───
    function shareReferral() {
        const botUsername = "MythoSerialBot"; 
        const link = \`https://t.me/\${botUsername}?start=${userId}\`;
        const text = \`Join me on MythoserialBot and Watch Mythology Serials Free & earn free Mythopoints! 🚀\\n\\n\${link}\`;
        
        tg.openTelegramLink(\`https://t.me/share/url?url=\${encodeURIComponent(link)}&text=\${encodeURIComponent(text)}\`);
    }

    function showRefRewards() {
        tg.HapticFeedback.impactOccurred('light');
        document.getElementById('refRewardsModal').classList.add('open');
    }

    async function showRefLeaderboard() {
        tg.HapticFeedback.impactOccurred('light');
        document.getElementById('refLeaderboardModal').classList.add('open');
        const content = document.getElementById('ref-lb-content');
        content.innerHTML = '<div class="spinner"></div>';
        
        try {
            const res = await fetch('/api/referral/leaderboard');
            const data = await res.json();
            
            if (data.success && data.leaderboard.length > 0) {
                let html = '';
                data.leaderboard.forEach((u, i) => {
                    const rank = i + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔹';
                    const avatar = u.photo 
                        ? \`<img src="\${u.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />\` 
                        : \`<div style="width:32px;height:32px;border-radius:50%;background:#651fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:#fff;">\${u.name.charAt(0).toUpperCase()}</div>\`;
                    
                    html += \`
                        <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:0.5px solid rgba(255,255,255,0.06);">
                            <div style="width:24px; text-align:center; font-size:16px;">\${medal}</div>
                            \${avatar}
                            <div style="flex:1; font-weight:500; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#fff;">\${u.name}</div>
                            <div style="font-weight:700; color:#00e676; font-size:14px; background:rgba(0,230,118,0.1); padding:4px 8px; border-radius:12px;">\${u.refs}</div>
                        </div>
                    \`;
                });
                content.innerHTML = html;
            } else {
                content.innerHTML = '<div class="empty" style="padding:20px;">No referrals yet. Be the first!</div>';
            }
        } catch (e) {
            content.innerHTML = '<div class="empty" style="color:#ff453a;">Failed to load leaderboard.</div>';
        }
    }

    // ─── SCRATCH CARD HISTORY LOGIC ───
    async function openScratchHistory() {
        tg.HapticFeedback.impactOccurred('light');
        document.getElementById('scratchHistoryModal').classList.add('open');
        const content = document.getElementById('scratch-list-content');
        content.innerHTML = '<div class="spinner"></div>';
        
        try {
            const res = await fetch('/api/scratch/history/' + userId);
            const data = await res.json();
            
            if (data.success && data.cards.length > 0) {
                let html = '';
                data.cards.forEach(card => {
                    if (card.scratched) {
                        html += \`
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; margin-bottom:8px; border:1px solid rgba(48,209,88,0.2);">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="font-size:24px;">🎉</div>
                                    <div>
                                        <div style="font-size:14px; font-weight:600; color:#fff;">Claimed Card</div>
                                        <div style="font-size:11px; color:rgba(255,255,255,0.4);">Token: \${card.token.substring(0,6)}...</div>
                                    </div>
                                </div>
                                <div style="font-weight:700; color:#30d158; font-size:15px;">+\${card.reward || 0} pts</div>
                            </div>
                        \`;
                    } else {
                        html += \`
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:linear-gradient(135deg, rgba(213,0,249,0.1), rgba(255,159,28,0.1)); border-radius:12px; margin-bottom:8px; border:1px solid rgba(213,0,249,0.3);">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="font-size:24px;">🎁</div>
                                    <div>
                                        <div style="font-size:14px; font-weight:600; color:#fff;">Unscratched</div>
                                        <div style="font-size:11px; color:#ea80fc;">Ready to reveal!</div>
                                    </div>
                                </div>
                                <button onclick="tg.openTelegramLink('https://t.me/MythoSerialBot?start=scratch_\${card.token}')" style="background: linear-gradient(135deg, #ff9f1c, #d500f9); border:none; padding:6px 12px; border-radius:12px; color:#fff; font-weight:600; font-size:12px; cursor:pointer; box-shadow: 0 4px 10px rgba(213,0,249,0.3);">Scratch</button>
                            </div>
                        \`;
                    }
                });
                content.innerHTML = html;
            } else {
                content.innerHTML = '<div class="empty" style="padding:20px;">No scratch cards found. Claim your daily card in the bot!</div>';
            }
        } catch (e) {
            content.innerHTML = '<div class="empty" style="color:#ff453a;">Failed to load cards.</div>';
        }
    }

    // ─── INIT ───
    async function init() {
      await loadUserSettings();
      loadChantPersistence();
      await loadDashboard();
      await fetchChantStats();
      await loadChantLeaderboard();
      await loadSpinStatus();
      loadRecentChats();
      checkUnreadCount();
      
      if (document.getElementById('tab-bank').classList.contains('active')) { 
        loadBankData(); 
        loadWithdrawHistory(); 
      }
      if (document.getElementById('tab-profile').classList.contains('active')) { 
        loadHistory(1, true); 
        loadLeaderboard(); 
        loadRatingStatus(); 
      }

      if (typeof show_9055307 === 'function') {
          show_9055307({
            type: 'inApp',
            inAppSettings: {
              frequency: 2,
              capping: 0.1,
              interval: 30,
              timeout: 5,
              everyPage: false
            }
          }).catch(e => console.log("Auto-ad skipped or not ready:", e));
      }
    }
    
    init();

  </script>
</body>
</html>
    `);
});
                
    
// ==========================================
// QUIZ CREATOR MINI APP UI (V6 - Mobile Optimized & Clean CSS)
// ==========================================
app.get("/create-quiz-app/:userId", (req, res) => {
    const userId = req.params.userId;
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
        <title>Quiz Creator</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
                background: linear-gradient(-45deg, #1c0a2b, #3b0d66, #0a0014, #1a0033); 
                background-size: 400% 400%; 
                animation: gradientMesh 12s ease infinite;
                margin: 0; padding: 0 0 110px 0; 
                color: #ffffff; 
                min-height: 100vh;
                -webkit-font-smoothing: antialiased;
                letter-spacing: -0.01em;
            }

            @keyframes gradientMesh {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            .container { 
                width: 100%; max-width: 500px; margin: 0 auto; 
                padding: 20px 16px; 
                animation: fadeUp 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            
            .header-icon { font-size: 44px; margin-bottom: 6px; text-shadow: 0 10px 30px rgba(213,0,249,0.6); }
            
            .form-group { margin-bottom: 14px; text-align: left; }
            .form-group label { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.8px;}
            
            .form-control { 
                width: 100%; padding: 14px; border-radius: 14px; 
                background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); 
                color: #fff; font-size: 15px; outline: none; 
                transition: all 0.3s; 
            }
            .form-control:focus { border-color: #ea80fc; background: rgba(255,255,255,0.08); box-shadow: 0 0 15px rgba(213,0,249,0.2); }
            textarea.form-control { resize: none; font-family: inherit; }

            .q-card { 
                background: rgba(28,28,30,0.65); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); 
                border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 20px; 
                margin-bottom: 16px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.4); 
            }
            .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 800; color: #ea80fc; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
            
            .btn-remove { background: rgba(255,69,58,0.1); color: #ff453a; border: none; padding: 6px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; }
            .btn-remove:active { transform: scale(0.9); }
            
            .btn-add { background: rgba(48,209,88,0.1); color: #30d158; border: 1px dashed rgba(48,209,88,0.3); width: 100%; padding: 16px; border-radius: 16px; font-weight: 800; font-size: 14px; margin-bottom: 24px; cursor: pointer; }
            .btn-add:active { transform: scale(0.97); }

            /* Interactive Option Cards (QuizBot Style) */
            .options-group { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
            .option-card { 
                display: flex; align-items: center; padding: 4px 12px; 
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); 
                border-radius: 14px; cursor: pointer; transition: all 0.2s; 
            }
            .option-card input[type="radio"] { display: none; }
            .radio-custom { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); display: inline-block; position: relative; margin-right: 10px; flex-shrink: 0; transition: all 0.2s; }
            
            .option-card.selected { 
                border-color: #30d158; background: rgba(48,209,88,0.12); 
                box-shadow: 0 0 15px rgba(48,209,88,0.2); 
            }
            .option-card.selected .radio-custom { border-color: #30d158; background: #30d158; }
            .option-card.selected .radio-custom::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #000; font-size: 13px; font-weight: 900; }
            
            .option-card .opt-val { flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; outline: none; padding: 10px 0; font-weight: 500; }
            .option-card .opt-val::placeholder { color: rgba(255,255,255,0.3); }

            .q-exp { border: none; background: rgba(255,255,255,0.04); border-radius: 12px; padding: 12px; }
            
            /* iOS Toggle Switch */
            .setting-item { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
            .toggle-switch { position: relative; width: 46px; height: 26px; appearance: none; background: rgba(120,120,128,0.32); border-radius: 26px; outline: none; cursor: pointer; transition: background 0.3s; flex-shrink: 0; }
            .toggle-switch:checked { background: #d500f9; box-shadow: 0 0 12px rgba(213,0,249,0.4); }
            .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; background: #fff; border-radius: 50%; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
            .toggle-switch:checked::after { transform: translateX(20px); }

            /* Sticky Bottom Action Bar */
            .sticky-action-bar {
                position: fixed; bottom: 0; left: 0; width: 100%;
                background: rgba(15, 5, 25, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border-top: 1px solid rgba(255,255,255,0.08);
                padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
                display: flex; gap: 10px; z-index: 100;
                box-shadow: 0 -10px 30px rgba(0,0,0,0.5);
                transform: translateY(100%); transition: transform 0.3s ease;
            }
            .sticky-action-bar.visible { transform: translateY(0); }
            
            .sticky-action-bar .btn-publish { flex: 2; background: linear-gradient(135deg, #d500f9, #651fff); border: none; padding: 14px; border-radius: 14px; color: #fff; font-weight: 800; font-size: 15px; box-shadow: 0 6px 20px rgba(213,0,249,0.4); cursor: pointer; }
            .sticky-action-bar .btn-clear { flex: 1; background: rgba(255,69,58,0.1); border: 1px solid rgba(255,69,58,0.2); border-radius: 14px; color: #ff453a; font-weight: 700; font-size: 13px; cursor: pointer; }

            .top-bar-save { position: fixed; top: 10px; right: 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); padding: 4px 10px; border-radius: 16px; font-size: 10px; color: #30d158; font-weight: 700; z-index: 100; opacity: 0; transition: opacity 0.3s; border: 1px solid rgba(48,209,88,0.3); }
            .top-bar-save.show { opacity: 1; }

            .loader { 
                border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #d500f9;
                border-radius: 50%; width: 36px; height: 36px; animation: spin 0.8s linear infinite; 
                margin: 0 auto 16px auto;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="top-bar-save" id="save-indicator">✓ Saved</div>
        
        <div class="container" id="main-content">
            <div style="text-align: center;">
                <div class="header-icon">✨</div>
                <h2 style="font-weight: 800; font-size: 22px; margin-bottom: 4px;">Create New Quiz</h2>
                <p style="margin-bottom: 24px; color: rgba(255,255,255,0.5); font-size: 13px;">Progress autosaves securely.</p>
            </div>
            
            <div id="quiz-form">
                <div class="q-card" style="margin-bottom: 24px; border-color: rgba(213,0,249,0.3); background: rgba(45,10,80,0.35);">
                    <div class="form-group">
                        <label>Quiz Title</label>
                        <input type="text" id="q-title" class="form-control" placeholder="e.g. Ramayana Epic Quiz" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="q-desc" class="form-control" rows="2" placeholder="Brief description" required></textarea>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Time Per Question (Sec)</label>
                        <input type="number" id="q-time" class="form-control" value="15" required>
                    </div>
                </div>

                <div id="questions-container"></div>

                <button type="button" class="btn-add" onclick="addQuestion()">+ Add New Question</button>
            </div>
            
            <div id="loading" style="display:none; margin-top:30px; text-align:center;">
                <div class="loader"></div>
                <p style="color: #ea80fc; font-weight: 800; font-size: 14px;">Publishing to Database...</p>
            </div>
        </div>

        <!-- Sticky Bottom Action Bar -->
        <div class="sticky-action-bar visible" id="actionBar">
            <button class="btn-clear" onclick="clearDrafts()">🗑️ Clear</button>
            <button class="btn-publish" id="publish-btn" onclick="submitQuiz()">🚀 Publish Quiz</button>
        </div>

        <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            tg.setHeaderColor('#1c0a2b');
            
            const userId = \`${userId}\`;
            const storageKey = \`mytho_quiz_draft_\${userId}\`;
            let questionCount = 0;
            let saveTimeout;

            function triggerConfetti() {
                const end = Date.now() + 1500;
                (function frame() {
                    confetti({ particleCount: 4, angle: 60, spread: 50, origin: { x: 0 }, colors: ['#ea80fc', '#30d158', '#ffd60a'] });
                    confetti({ particleCount: 4, angle: 120, spread: 50, origin: { x: 1 }, colors: ['#ea80fc', '#30d158', '#ffd60a'] });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());
            }

            function updateOptionStyles(cardId) {
                const card = document.getElementById(cardId);
                if (!card) return;
                card.querySelectorAll('.option-card').forEach(oc => {
                    const radio = oc.querySelector('input[type="radio"]');
                    if (radio && radio.checked) {
                        oc.classList.add('selected');
                    } else {
                        oc.classList.remove('selected');
                    }
                });
            }

            function addQuestion() {
                questionCount++;
                const id = questionCount;
                const container = document.getElementById('questions-container');
                const qDiv = document.createElement('div');
                qDiv.className = 'q-card';
                qDiv.id = \`q-card-\${id}\`;

                qDiv.innerHTML = \`
                    <div class="q-header">
                        <span>Question \${id}</span>
                        <button class="btn-remove" onclick="removeQuestion(\${id})">✕ Remove</button>
                    </div>
                    
                    <textarea class="form-control q-text" rows="2" placeholder="Ask a question..." required></textarea>
                    
                    <div class="options-group">
                        <label class="option-card selected">
                            <input type="radio" name="q-\${id}-ans" value="0" checked>
                            <span class="radio-custom"></span>
                            <input type="text" class="opt-val" placeholder="Option 1" required>
                        </label>
                        <label class="option-card">
                            <input type="radio" name="q-\${id}-ans" value="1">
                            <span class="radio-custom"></span>
                            <input type="text" class="opt-val" placeholder="Option 2" required>
                        </label>
                        <label class="option-card">
                            <input type="radio" name="q-\${id}-ans" value="2">
                            <span class="radio-custom"></span>
                            <input type="text" class="opt-val" placeholder="Option 3" required>
                        </label>
                        <label class="option-card">
                            <input type="radio" name="q-\${id}-ans" value="3">
                            <span class="radio-custom"></span>
                            <input type="text" class="opt-val" placeholder="Option 4" required>
                        </label>
                    </div>

                    <input type="text" class="form-control q-exp" placeholder="Explanation (Optional)">
                    
                    <div class="setting-item">
                        <span style="font-size:12px; font-weight:800; color:#ffd60a;">⚡ Rapid Fire (7s)</span>
                        <input type="checkbox" class="toggle-switch q-rapid">
                    </div>
                \`;
                
                container.appendChild(qDiv);
                
                qDiv.querySelectorAll('input[type="radio"]').forEach(r => r.addEventListener('change', () => {
                    tg.HapticFeedback.impactOccurred('light');
                    updateOptionStyles(\`q-card-\${id}\`);
                    triggerAutoSave();
                }));

                tg.HapticFeedback.selectionChanged();
                triggerAutoSave();
                return id;
            }

            function removeQuestion(id) {
                const el = document.getElementById(\`q-card-\${id}\`);
                if (el) {
                    el.style.transform = 'scale(0.9)';
                    el.style.opacity = '0';
                    setTimeout(() => {
                        el.remove();
                        triggerAutoSave();
                    }, 200);
                }
                tg.HapticFeedback.impactOccurred('medium');
            }

            function saveState() {
                const data = {
                    title: document.getElementById('q-title').value,
                    desc: document.getElementById('q-desc').value,
                    time: document.getElementById('q-time').value,
                    questions: []
                };
                
                document.querySelectorAll('.q-card').forEach(card => {
                    const textNode = card.querySelector('.q-text');
                    if (!textNode) return; 

                    const opts = card.querySelectorAll('.opt-val');
                    const radios = card.querySelectorAll('input[type="radio"]');
                    let ansIndex = 0;
                    radios.forEach((r, i) => { if(r.checked) ansIndex = i; });
                    
                    data.questions.push({
                        text: textNode.value,
                        opt1: opts[0] ? opts[0].value : '',
                        opt2: opts[1] ? opts[1].value : '',
                        opt3: opts[2] ? opts[2].value : '',
                        opt4: opts[3] ? opts[3].value : '',
                        ansIndex: ansIndex,
                        exp: card.querySelector('.q-exp').value,
                        isRapid: card.querySelector('.q-rapid').checked
                    });
                });
                
                localStorage.setItem(storageKey, JSON.stringify(data));
                const indicator = document.getElementById('save-indicator');
                indicator.classList.add('show');
                setTimeout(() => indicator.classList.remove('show'), 1500);
            }

            function triggerAutoSave() {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveState, 400); 
            }

            function loadState() {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    try {
                        const data = JSON.parse(saved);
                        document.getElementById('q-title').value = data.title || '';
                        document.getElementById('q-desc').value = data.desc || '';
                        document.getElementById('q-time').value = data.time || '15';
                        
                        document.getElementById('questions-container').innerHTML = '';
                        questionCount = 0;
                        
                        if (data.questions && data.questions.length > 0) {
                            data.questions.forEach(q => {
                                const id = addQuestion();
                                const card = document.getElementById(\`q-card-\${id}\`);
                                card.querySelector('.q-text').value = q.text || '';
                                const opts = card.querySelectorAll('.opt-val');
                                opts[0].value = q.opt1 || '';
                                opts[1].value = q.opt2 || '';
                                opts[2].value = q.opt3 || '';
                                opts[3].value = q.opt4 || '';
                                
                                const radios = card.querySelectorAll('input[type="radio"]');
                                if (q.ansIndex >= 0 && q.ansIndex < 4) radios[q.ansIndex].checked = true;
                                
                                card.querySelector('.q-exp').value = q.exp || '';
                                card.querySelector('.q-rapid').checked = q.isRapid || false;
                                updateOptionStyles(\`q-card-\${id}\`);
                            });
                        } else {
                            addQuestion();
                        }
                    } catch(e) {
                        addQuestion();
                    }
                } else {
                    addQuestion();
                }
            }

            function clearDrafts() {
                if(confirm("Delete all drafted questions?")) {
                    tg.HapticFeedback.impactOccurred('heavy');
                    localStorage.removeItem(storageKey);
                    location.reload();
                }
            }

            document.getElementById('quiz-form').addEventListener('input', triggerAutoSave);
            document.getElementById('quiz-form').addEventListener('change', triggerAutoSave);

            async function submitQuiz() {
                const title = document.getElementById('q-title').value.trim();
                const desc = document.getElementById('q-desc').value.trim();
                const time = document.getElementById('q-time').value.trim();
                
                if (!title || !desc || !time) {
                    alert('Please fill out the Quiz Title and Description!');
                    return tg.HapticFeedback.notificationOccurred('error');
                }

                const cards = document.getElementById('questions-container').querySelectorAll('.q-card');
                if (cards.length === 0) {
                    alert('Add at least one question!');
                    return tg.HapticFeedback.notificationOccurred('error');
                }

                const questions = [];
                let hasError = false;

                cards.forEach(card => {
                    const text = card.querySelector('.q-text').value.trim();
                    const optInputs = card.querySelectorAll('.opt-val');
                    const op1 = optInputs[0].value.trim();
                    const op2 = optInputs[1].value.trim();
                    const op3 = optInputs[2].value.trim();
                    const op4 = optInputs[3].value.trim();
                    
                    const radios = card.querySelectorAll('input[type="radio"]');
                    let ansIndex = 0;
                    radios.forEach((r, i) => { if(r.checked) ansIndex = i; });
                    
                    if (!text || !op1 || !op2 || !op3 || !op4) hasError = true;

                    const options = [op1, op2, op3, op4];
                    questions.push({
                        question: text,
                        options: options,
                        answer: options[ansIndex],
                        explanation: card.querySelector('.q-exp').value.trim() || 'Good job! 🤕',
                        is_rapid_fire: card.querySelector('.q-rapid').checked
                    });
                });

                if (hasError) {
                    alert('Please ensure all question boxes and 4 options are completely filled!');
                    return tg.HapticFeedback.notificationOccurred('error');
                }

                const payload = { userId, title, description: desc, time_per_question: parseInt(time), questions };

                document.getElementById('quiz-form').style.display = 'none';
                document.getElementById('actionBar').classList.remove('visible'); 
                document.getElementById('loading').style.display = 'block';
                tg.HapticFeedback.impactOccurred('heavy');

                try {
                    const res = await fetch('/api/quiz/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        tg.HapticFeedback.notificationOccurred('success');
                        triggerConfetti();
                        localStorage.removeItem(storageKey);
                        
                        const commandText = \`/quizstart <group_id> \${data.quiz_id}\`;
                        
                        document.getElementById('loading').innerHTML = \`
                            <div style="font-size:56px; margin-bottom:12px;">🏆</div>
                            <h3 style="color:#30d158; font-size:24px; margin-bottom: 6px; font-weight: 900;">Quiz is Ready!</h3>
                            <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 20px;">Your quiz has been successfully deployed.</p>
                            
                            <div style="background: rgba(45,10,80,0.6); padding: 18px; border-radius: 16px; text-align:left; margin-bottom: 24px; border: 1px solid rgba(213,0,249,0.3);">
                                <p style="margin: 0 0 6px 0; color: #fff; font-size: 13px; font-weight: 800; text-transform: uppercase;">📌 Start the Quiz</p>
                                <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.4;">
                                    Send this command in your Telegram group:
                                </p>
                                <div style="background: rgba(0,0,0,0.6); padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; border: 1px solid rgba(255,255,255,0.08);">
                                    <code style="color: #ea80fc; font-size: 13px; word-break: break-all; user-select: all;">\${commandText}</code>
                                    <button onclick="navigator.clipboard.writeText('\${commandText}'); tg.HapticFeedback.impactOccurred('light'); this.innerText='Copied! ✓'; setTimeout(()=> {this.innerText='📋 Copy Command';}, 2000);" style="background: rgba(255,255,255,0.1); border: none; padding: 10px; border-radius: 10px; color: #fff; font-size: 12px; font-weight: bold; cursor: pointer;">📋 Copy Command</button>
                                </div>
                            </div>
                            
                            <button class="btn-publish" style="width: 100%; background: #fff; color: #000; padding: 16px; border-radius: 16px; font-weight: 900; font-size: 15px; border: none; cursor: pointer;" onclick="tg.close()">CLOSE APP</button>
                        \`;
                    } else {
                        throw new Error(data.error);
                    }
                } catch (e) {
                    alert('Error creating quiz: ' + e.message);
                    document.getElementById('quiz-form').style.display = 'block';
                    document.getElementById('actionBar').classList.add('visible');
                    document.getElementById('loading').style.display = 'none';
                }
            }

            loadState();
        </script>
    </body>
    </html>
    `);
});



// ------------------------------------------------------------
// 1. BACKEND REST APIs FOR MANAGING QUIZZES
// ------------------------------------------------------------

// List all quizzes for a user
app.get("/api/quiz/manage/list/:userId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const quizzes = await quizMetadataCollection.find({ created_by: userId }).sort({ created_at: -1 }).toArray();
        res.json({ success: true, quizzes });
    } catch (e) {
        console.error("List Quizzes Error:", e);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Get specific quiz details & questions
app.get("/api/quiz/manage/detail/:userId/:quizId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const quizId = new ObjectId(req.params.quizId);
        
        const metadata = await quizMetadataCollection.findOne({ _id: quizId, created_by: userId });
        if (!metadata) return res.status(404).json({ success: false, error: "Quiz not found." });

        const questions = await quizCollection.find({ quiz_id: quizId }).toArray();
        res.json({ success: true, metadata, questions });
    } catch (e) {
        console.error("Quiz Detail Error:", e);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Edit & Save Quiz (Metadata + Questions)
app.put("/api/quiz/manage/edit/:userId/:quizId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const quizId = new ObjectId(req.params.quizId);
        const { title, description, time_per_question, questions } = req.body;

        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ success: false, error: "Missing required fields." });
        }

        const existing = await quizMetadataCollection.findOne({ _id: quizId, created_by: userId });
        if (!existing) return res.status(404).json({ success: false, error: "Unauthorized." });

        const category = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

        // Update Metadata
        await quizMetadataCollection.updateOne({ _id: quizId }, {
            $set: {
                title: title,
                description: description,
                category: category,
                time_per_question: time_per_question || 15,
                total_questions: questions.length,
                updated_at: new Date()
            }
        });

        // Replace old questions with new ones
        await quizCollection.deleteMany({ quiz_id: quizId });
        
        const questionDocs = questions.map(q => ({
            quiz_id: quizId,
            category: category,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            is_active: true,
            is_rapid_fire: q.is_rapid_fire === true 
        }));

        await quizCollection.insertMany(questionDocs);

        res.json({ success: true, message: "Quiz updated successfully!" });
    } catch (e) {
        console.error("Edit Quiz Error:", e);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Delete a quiz
app.delete("/api/quiz/manage/delete/:userId/:quizId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const quizId = new ObjectId(req.params.quizId);

        const existing = await quizMetadataCollection.findOne({ _id: quizId, created_by: userId });
        if (!existing) return res.status(404).json({ success: false, error: "Unauthorized." });

        await quizMetadataCollection.deleteOne({ _id: quizId });
        await quizCollection.deleteMany({ quiz_id: quizId });

        res.json({ success: true, message: "Quiz deleted." });
    } catch (e) {
        console.error("Delete Quiz Error:", e);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// ------------------------------------------------------------
// 2. FRONTEND MINI APP ROUTE
// ------------------------------------------------------------
app.get("/manage-quiz-app/:userId", (req, res) => {
    const userId = req.params.userId;
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
        <title>Manage Quizzes</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
                background: linear-gradient(-45deg, #1c0a2b, #3b0d66, #0a0014, #1a0033); 
                background-size: 400% 400%; animation: gradientMesh 12s ease infinite;
                margin: 0; padding: 0 0 110px 0; color: #ffffff; min-height: 100vh;
            }
            @keyframes gradientMesh { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            
            .container { padding: 20px 16px; max-width: 500px; margin: 0 auto; }
            .header-title { font-weight: 800; font-size: 22px; text-align: center; margin-bottom: 20px; color: #ea80fc; }
            
            /* List View Styles */
            .quiz-card { background: rgba(28,28,30,0.65); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 20px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; }
            .quiz-card-title { font-size: 16px; font-weight: 700; color: #fff; }
            .quiz-card-stats { font-size: 12px; color: rgba(255,255,255,0.5); }
            .btn-group { display: flex; gap: 10px; margin-top: 8px; }
            .btn { flex: 1; padding: 10px; border-radius: 12px; border: none; font-weight: 700; font-size: 13px; cursor: pointer; transition: transform 0.2s; }
            .btn:active { transform: scale(0.95); }
            .btn-edit { background: rgba(48,209,88,0.15); color: #30d158; border: 1px solid rgba(48,209,88,0.3); }
            .btn-delete { background: rgba(255,69,58,0.15); color: #ff453a; border: 1px solid rgba(255,69,58,0.3); }

            /* Edit View Styles */
            #edit-view { display: none; }
            .form-group { margin-bottom: 14px; }
            .form-group label { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-transform: uppercase; }
            .form-control { width: 100%; padding: 14px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 14px; outline: none; margin-bottom: 12px;}
            .form-control:focus { border-color: #ea80fc; }
            
            .q-card { background: rgba(45,10,80,0.35); border: 1px solid rgba(213,0,249,0.3); padding: 16px; border-radius: 20px; margin-bottom: 16px; }
            .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 800; color: #ea80fc; font-size: 13px; text-transform: uppercase; }
            .btn-remove { background: rgba(255,69,58,0.1); color: #ff453a; border: none; padding: 6px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; }
            .btn-add { background: rgba(48,209,88,0.1); color: #30d158; border: 1px dashed rgba(48,209,88,0.3); width: 100%; padding: 16px; border-radius: 16px; font-weight: 800; font-size: 14px; margin-bottom: 24px; cursor: pointer; }
            
            .options-group { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
            .option-card { display: flex; align-items: center; padding: 4px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; cursor: pointer; }
            .option-card input[type="radio"] { display: none; }
            .radio-custom { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); margin-right: 10px; position: relative; }
            .option-card.selected { border-color: #30d158; background: rgba(48,209,88,0.12); }
            .option-card.selected .radio-custom { border-color: #30d158; background: #30d158; }
            .option-card.selected .radio-custom::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #000; font-size: 13px; font-weight: 900; }
            .option-card .opt-val { flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; outline: none; padding: 10px 0; }

            .setting-item { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
            .toggle-switch { position: relative; width: 46px; height: 26px; appearance: none; background: rgba(120,120,128,0.32); border-radius: 26px; outline: none; cursor: pointer; transition: background 0.3s; }
            .toggle-switch:checked { background: #d500f9; }
            .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; background: #fff; border-radius: 50%; transition: transform 0.3s; }
            .toggle-switch:checked::after { transform: translateX(20px); }

            .sticky-action-bar { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(15, 5, 25, 0.9); padding: 16px; display: flex; gap: 10px; z-index: 100; box-shadow: 0 -10px 30px rgba(0,0,0,0.5); }
            .btn-save { flex: 1; background: linear-gradient(135deg, #d500f9, #651fff); border: none; padding: 14px; border-radius: 14px; color: #fff; font-weight: 800; font-size: 15px; box-shadow: 0 6px 20px rgba(213,0,249,0.4); cursor: pointer; }
            
            .loader { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #d500f9; border-radius: 50%; width: 36px; height: 36px; animation: spin 0.8s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .empty-state { text-align: center; color: rgba(255,255,255,0.4); margin-top: 40px; font-size: 14px; }
        </style>
    </head>
    <body>
        <!-- View 1: List All Quizzes -->
        <div class="container" id="list-view">
            <div class="header-title">📊 Manage Quizzes</div>
            <div id="quiz-list"><div class="loader"></div></div>
        </div>

        <!-- View 2: Edit Single Quiz -->
        <div class="container" id="edit-view">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <button onclick="closeEdit()" style="background:none; border:none; color:#ea80fc; font-weight:700; font-size:16px;">← Back</button>
                <div class="header-title" style="margin:0;">Edit Quiz</div>
            </div>
            
            <input type="hidden" id="edit-quiz-id">
            <div class="q-card" style="border-color:rgba(255,255,255,0.1); background:rgba(28,28,30,0.65);">
                <div class="form-group"><label>Quiz Title</label><input type="text" id="q-title" class="form-control" required></div>
                <div class="form-group"><label>Description</label><textarea id="q-desc" class="form-control" rows="2" required></textarea></div>
                <div class="form-group"><label>Time Per Question (Sec)</label><input type="number" id="q-time" class="form-control" required></div>
            </div>

            <div id="questions-container"></div>
            <button class="btn-add" onclick="addBlankQuestion()">+ Add New Question</button>

            <div class="sticky-action-bar">
                <button class="btn-save" id="btn-save" onclick="saveEdits()">💾 Save Changes</button>
            </div>
        </div>

        <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            tg.setHeaderColor('#1c0a2b');
            const userId = \`${userId}\`;
            let questionCount = 0;

            // Load all user quizzes
            async function loadQuizzes() {
                const list = document.getElementById('quiz-list');
                try {
                    const res = await fetch(\`/api/quiz/manage/list/\${userId}\`);
                    const data = await res.json();
                    
                    if (data.success && data.quizzes.length > 0) {
                        list.innerHTML = data.quizzes.map(q => \`
                            <div class="quiz-card" id="card-\${q._id}">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div class="quiz-card-title">\${q.title}</div>
                                </div>
                                <div class="quiz-card-stats">Questions: \${q.total_questions} • Time: \${q.time_per_question}s</div>
                                <div class="btn-group">
                                    <button class="btn btn-edit" onclick="openEdit('\${q._id}')">✏️ Edit</button>
                                    <button class="btn btn-delete" onclick="deleteQuiz('\${q._id}')">🗑️ Delete</button>
                                </div>
                            </div>
                        \`).join('');
                    } else {
                        list.innerHTML = '<div class="empty-state">No quizzes found. Create one first!</div>';
                    }
                } catch(e) {
                    list.innerHTML = '<div class="empty-state">Failed to load quizzes.</div>';
                }
            }

            // Open Edit Form and Fetch Questions
            async function openEdit(quizId) {
                tg.HapticFeedback.impactOccurred('light');
                document.getElementById('list-view').style.display = 'none';
                document.getElementById('edit-view').style.display = 'block';
                document.getElementById('questions-container').innerHTML = '<div class="loader"></div>';
                
                try {
                    const res = await fetch(\`/api/quiz/manage/detail/\${userId}/\${quizId}\`);
                    const data = await res.json();
                    if(data.success) {
                        document.getElementById('edit-quiz-id').value = data.metadata._id;
                        document.getElementById('q-title').value = data.metadata.title;
                        document.getElementById('q-desc').value = data.metadata.description;
                        document.getElementById('q-time').value = data.metadata.time_per_question;
                        
                        document.getElementById('questions-container').innerHTML = '';
                        questionCount = 0;

                        if(data.questions && data.questions.length > 0) {
                            data.questions.forEach(q => renderQuestionHTML(q));
                        } else {
                            addBlankQuestion();
                        }
                    }
                } catch(e) {
                    alert('Error loading quiz details.');
                    closeEdit();
                }
            }

            function closeEdit() {
                tg.HapticFeedback.impactOccurred('light');
                document.getElementById('edit-view').style.display = 'none';
                document.getElementById('list-view').style.display = 'block';
            }

            // Render existing question logic
            function renderQuestionHTML(qData = null) {
                questionCount++;
                const id = questionCount;
                const container = document.getElementById('questions-container');
                const qDiv = document.createElement('div');
                qDiv.className = 'q-card';
                qDiv.id = \`q-card-\${id}\`;

                // Handle pre-filled data if exists
                const text = qData ? qData.question : '';
                const opts = qData && qData.options ? qData.options : ['', '', '', ''];
                const ans = qData ? qData.answer : '';
                const exp = qData ? qData.explanation : '';
                const isRapid = qData ? qData.is_rapid_fire : false;
                
                let selectedIndex = 0;
                if(qData && qData.options) {
                    selectedIndex = qData.options.indexOf(ans);
                    if(selectedIndex === -1) selectedIndex = 0;
                }

                qDiv.innerHTML = \`
                    <div class="q-header">
                        <span>Question \${id}</span>
                        <button class="btn-remove" onclick="removeQuestion(\${id})">✕ Remove</button>
                    </div>
                    <textarea class="form-control q-text" rows="2" placeholder="Ask a question..." required>\${text}</textarea>
                    
                    <div class="options-group">
                        \${opts.map((opt, i) => \`
                            <label class="option-card \${i === selectedIndex ? 'selected' : ''}">
                                <input type="radio" name="q-\${id}-ans" value="\${i}" \${i === selectedIndex ? 'checked' : ''}>
                                <span class="radio-custom"></span>
                                <input type="text" class="opt-val" placeholder="Option \${i+1}" value="\${opt}" required>
                            </label>
                        \`).join('')}
                    </div>

                    <input type="text" class="form-control q-exp" placeholder="Explanation (Optional)" value="\${exp}">
                    
                    <div class="setting-item">
                        <span style="font-size:12px; font-weight:800; color:#ffd60a;">⚡ Rapid Fire (7s)</span>
                        <input type="checkbox" class="toggle-switch q-rapid" \${isRapid ? 'checked' : ''}>
                    </div>
                \`;
                
                container.appendChild(qDiv);
                
                // Attach radio listeners for styling
                qDiv.querySelectorAll('input[type="radio"]').forEach(r => r.addEventListener('change', () => {
                    tg.HapticFeedback.impactOccurred('light');
                    qDiv.querySelectorAll('.option-card').forEach(oc => oc.classList.remove('selected'));
                    r.closest('.option-card').classList.add('selected');
                }));
            }

            function addBlankQuestion() {
                tg.HapticFeedback.selectionChanged();
                renderQuestionHTML(null);
            }

            function removeQuestion(id) {
                const el = document.getElementById(\`q-card-\${id}\`);
                if (el) el.remove();
                tg.HapticFeedback.impactOccurred('medium');
            }

            // Save Edits to DB
            async function saveEdits() {
                const quizId = document.getElementById('edit-quiz-id').value;
                const title = document.getElementById('q-title').value.trim();
                const desc = document.getElementById('q-desc').value.trim();
                const time = document.getElementById('q-time').value.trim();
                const btnSave = document.getElementById('btn-save');

                const cards = document.getElementById('questions-container').querySelectorAll('.q-card');
                if (cards.length === 0) return alert('Add at least one question!');

                const questions = [];
                let hasError = false;

                cards.forEach(card => {
                    const text = card.querySelector('.q-text').value.trim();
                    const optInputs = card.querySelectorAll('.opt-val');
                    const op1 = optInputs[0].value.trim();
                    const op2 = optInputs[1].value.trim();
                    const op3 = optInputs[2].value.trim();
                    const op4 = optInputs[3].value.trim();
                    
                    const radios = card.querySelectorAll('input[type="radio"]');
                    let ansIndex = 0;
                    radios.forEach((r, i) => { if(r.checked) ansIndex = i; });
                    
                    if (!text || !op1 || !op2 || !op3 || !op4) hasError = true;

                    const options = [op1, op2, op3, op4];
                    questions.push({
                        question: text,
                        options: options,
                        answer: options[ansIndex],
                        explanation: card.querySelector('.q-exp').value.trim(),
                        is_rapid_fire: card.querySelector('.q-rapid').checked
                    });
                });

                if (hasError) return alert('Fill all questions and options fully!');

                btnSave.innerText = "Saving...";
                tg.HapticFeedback.impactOccurred('heavy');

                try {
                    const res = await fetch(\`/api/quiz/manage/edit/\${userId}/\${quizId}\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, description: desc, time_per_question: parseInt(time), questions })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        tg.HapticFeedback.notificationOccurred('success');
                        closeEdit();
                        loadQuizzes();
                    } else {
                        alert(data.error);
                    }
                } catch(e) {
                    alert('Error updating quiz.');
                } finally {
                    btnSave.innerText = "💾 Save Changes";
                }
            }

            // Delete a quiz
            async function deleteQuiz(quizId) {
                if(confirm("Are you sure you want to permanently delete this quiz?")) {
                    tg.HapticFeedback.impactOccurred('heavy');
                    try {
                        const res = await fetch(\`/api/quiz/manage/delete/\${userId}/\${quizId}\`, { method: 'DELETE' });
                        const data = await res.json();
                        if(data.success) {
                            document.getElementById(\`card-\${quizId}\`).remove();
                            tg.HapticFeedback.notificationOccurred('success');
                        } else {
                            alert(data.error);
                        }
                    } catch(e) {
                        alert('Error deleting quiz.');
                    }
                }
            }

            loadQuizzes();
        </script>
    </body>
    </html>
    `);
});

                      

// ========================
// HOME & FALLBACK ROUTE
// ========================
app.get("*", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="monetag" content="dd375c54069194ddf7fada46bc8b141b">
          <title>Welcome to MythoSerial</title>
          ${THEME_CSS}
      </head>
      <body>
          <div class="container">
              <div style="font-size:60px; margin-bottom:10px;">🤖</div>
              <h2>Welcome to MythoSerial</h2>
              <p>To use our premium services, play games, and earn rewards, please join our official Telegram bot!</p>
              <a href="https://t.me/MythoSerialBot" class="btn" style="display:inline-block; box-sizing:border-box;">Launch Telegram Bot</a>
          </div>
      </body>
      </html>
    `);
});

// Start Server – Wait for DB connection first
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Fully Secured Anti-Bypass Server running on port ${PORT}`);
  });
}
startServer();
