// ============================================================
// index.js – Premium Frontend (No Emojis, All SVG, Enhanced UI)
// ============================================================

import express from "express";
import { MongoClient } from "mongodb";
import crypto from "crypto";

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
let paymentChatCollection;
// --- NEW COLLECTIONS FOR REELS ---
let userLikesCollection, commentsCollection;
let reelsCollection;  

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
    // --- new ---
    reelsCollection = db.collection("reels");
    userLikesCollection = db.collection("user_likes");
    commentsCollection = db.collection("comments");
    
    console.log("✅ MongoDB connected for all collections");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
  }
}
connectDB();

// ========================
// GLOBAL THEME (used by other pages)
// ========================
const THEME_CSS = `
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; 
      background: radial-gradient(circle at 50% 50%, #16002b 0%, #07000d 100%); 
      color: #ffffff; overflow: hidden; 
    }
    body::before { 
      content: ''; position: absolute; width: 150vw; height: 150vh; 
      background: radial-gradient(circle, rgba(255, 0, 255, 0.05) 0%, transparent 60%); 
      z-index: 0; animation: pulse 8s infinite alternate; 
    }
    @keyframes pulse { 
      0% { transform: scale(1); opacity: 0.5; } 
      100% { transform: scale(1.1); opacity: 1; } 
    }
    .container { 
      position: relative; z-index: 1; background: rgba(30, 0, 50, 0.35); 
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); 
      border: 1px solid rgba(255, 0, 255, 0.2); 
      box-shadow: 0 8px 32px 0 rgba(255, 0, 255, 0.15), inset 0 0 15px rgba(138, 43, 226, 0.2); 
      padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; 
    }
    h1, h2 { 
      margin-bottom: 15px; font-size: 26px; color: #ff66ff; 
      text-shadow: 0 0 15px rgba(255, 105, 180, 0.8); 
    }
    .error-title { color: #ff1744 !important; text-shadow: 0 0 15px rgba(255, 23, 68, 0.8) !important; }
    p { color: #d8b4e2; font-size: 15px; margin-bottom: 20px; line-height: 1.5; }
    .btn { 
      background: linear-gradient(135deg, #d500f9, #651fff); 
      box-shadow: 0 0 15px rgba(213, 0, 249, 0.4); color: white; border: none; 
      padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 8px; 
      cursor: pointer; transition: all 0.3s ease; width: 100%; text-transform: uppercase; letter-spacing: 1px;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 0 25px rgba(213, 0, 249, 0.7); }
    .loader { 
      border: 3px solid rgba(255,255,255,0.05); border-top: 3px solid #ff66ff; 
      border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; 
      margin: 0 auto 20px auto; box-shadow: 0 0 15px rgba(255, 102, 255, 0.5); 
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .manual-box { 
      display: none; background: rgba(213, 0, 249, 0.1); 
      border: 1px solid rgba(213, 0, 249, 0.3); padding: 15px; border-radius: 8px; 
      margin-top: 20px; text-align: left; box-shadow: inset 0 0 10px rgba(213, 0, 249, 0.15); 
    }
    a { color: #ea80fc; text-decoration: none; font-weight: bold; transition: 0.3s; }
    a:hover { text-shadow: 0 0 8px rgba(234, 128, 252, 0.8); }
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
          <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Access Denied</title>
          ${THEME_CSS}
      </head>
      <body>
          <div class="container">
              <div style="font-size:60px; margin-bottom:10px;">🚫</div>
              <h2 class="error-title">Bypass Detected</h2>
              <p>Unauthorized request detected.</p>
              <div class="manual-box" style="display:block; text-align:center;">
                  <p style="color:white; margin:0;">Please Don't Bypass Support Admin To Open Ads 🕵️‍♀️</p>
              </div>
          </div>
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
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #d500f9;
                --gold-light: #FFDF00;
                --gold-dark: #D4AF37;
                --bg-dark: #0a0011;
            }
            
            * { box-sizing: border-box; }
            
            body {
                margin: 0; padding: 0; font-family: 'Poppins', sans-serif;
                background: radial-gradient(circle at 50% -20%, #2b004a 0%, var(--bg-dark) 80%);
                color: #fff; display: flex; flex-direction: column; align-items: center; 
                min-height: 100vh; overflow: hidden; user-select: none;
            }

            .bg-glow {
                position: absolute; width: 100vw; height: 100vh;
                background: radial-gradient(circle at 50% 40%, rgba(213, 0, 249, 0.15) 0%, transparent 60%);
                animation: pulseGlow 4s ease-in-out infinite alternate;
                z-index: 0; pointer-events: none;
            }

            @keyframes pulseGlow {
                0% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            .profile-card {
                position: relative; z-index: 10;
                background: rgba(255, 255, 255, 0.04);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                width: 90%; max-width: 400px; border-radius: 20px; 
                padding: 18px 20px; margin-top: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.02);
                display: flex; align-items: center; gap: 15px;
            }

            .profile-img {
                width: 55px; height: 55px; border-radius: 14px;
                border: 2px solid rgba(213, 0, 249, 0.5); object-fit: cover;
                background: #1a1a1a; box-shadow: 0 4px 15px rgba(213, 0, 249, 0.4);
            }

            .profile-info { flex-grow: 1; }
            .profile-info h3 { margin: 0 0 2px 0; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; }
            .profile-info p { margin: 0; font-size: 11px; color: #bbb; }
            
            .stats-badge {
                background: rgba(0, 230, 118, 0.1); border: 1px solid rgba(0, 230, 118, 0.3);
                color: #00e676; padding: 6px 12px; border-radius: 10px;
                font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px;
                margin-top: 8px; transition: all 0.3s ease;
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
                width: 280px; height: 280px; border-radius: 24px;
                background: linear-gradient(135deg, #3a0088, #d500f9);
                padding: 4px; box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(213, 0, 249, 0.3);
                animation: float 6s ease-in-out infinite;
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-15px); box-shadow: 0 35px 70px rgba(0,0,0,0.9), 0 0 50px rgba(213, 0, 249, 0.5); }
            }

            .scratch-inner {
                position: relative; width: 100%; height: 100%;
                border-radius: 20px; background: radial-gradient(circle at top, #1a0033, #000);
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
                background: linear-gradient(135deg, #d500f9, #651fff);
                border: none; padding: 16px 40px; color: white; font-weight: 800;
                border-radius: 30px; font-size: 16px; letter-spacing: 1.5px;
                box-shadow: 0 10px 25px rgba(213, 0, 249, 0.5);
                text-transform: uppercase; cursor: pointer; display: none;
                transition: transform 0.2s, box-shadow 0.2s;
                opacity: 0; transform: translateY(20px);
            }

            .btn-close.show { display: block; animation: slideUpFade 0.6s forwards ease-out; }
            @keyframes slideUpFade { to { opacity: 1; transform: translateY(0); } }
            .btn-close:active { transform: scale(0.95); }
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
                if (!isDrawing || isRevealed) return;
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

// ========================
// ENTRY POINTS (unchanged)
// ========================
app.get("/link/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;
  
  try {
    const adData = await searchAdsCollection.findOne({
      $or: [ { verify_token: token }, { token: token } ],
      $or: [ { user_id: parseInt(userId) }, { user_id: userId.toString() } ]
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
        $or: [ { verify_token: token }, { token: token } ],
        $or: [ { user_id: parseInt(userId) }, { user_id: userId.toString() } ]
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
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, sans-serif;
                background-color: var(--ios-bg); margin: 0; padding: 0; padding-bottom: calc(85px + var(--safe-area-bottom));
                color: var(--ios-text); -webkit-font-smoothing: antialiased; user-select: none;
            }

            .header {
                position: sticky; top: 0; z-index: 50;
                background: rgba(255, 255, 255, 0.75);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border-bottom: 0.5px solid rgba(0,0,0,0.1);
                padding: 16px; text-align: center; font-weight: 600; font-size: 17px;
                letter-spacing: -0.4px;
            }

            .card {
                background: var(--ios-card); border-radius: 12px; margin: 16px; padding: 16px;
            }

            .profile-header { 
                display: flex; align-items: center; gap: 15px; 
                border-bottom: 0.5px solid var(--ios-light-gray); 
                padding-bottom: 16px; margin-bottom: 16px; 
            }
            .profile-pic { 
                width: 64px; height: 64px; border-radius: 50%; 
                object-fit: cover; background: var(--ios-light-gray); 
            }
            .profile-info h2 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px; }
            .profile-info p { margin: 4px 0 0 0; color: var(--ios-gray); font-size: 13px; }
            
            .balance-box { text-align: center; padding: 5px 0; }
            .balance-box h3 { margin: 0; font-size: 13px; color: var(--ios-gray); font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
            .balance-box .amount { font-size: 38px; font-weight: 700; color: var(--ios-blue); margin: 8px 0; letter-spacing: -1px; }
            
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
                color: var(--ios-gray); cursor: pointer; font-size: 10px; font-weight: 500;
                transition: 0.2s;
            }
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
            db.collection("users").findOne({ user_id: uid }),
            db.collection("bank").findOne({ user_id: uid }),
            db.collection("search_limits").findOne({ user_id: uid }),
            db.collection("premium_users").findOne({ user_id: uid }),
            db.collection("user_stats").findOne({ user_id: uid }),
            db.collection("mphistory").find({ user_id: uid }).sort({ date: -1 }).limit(20).toArray(),
            db.collection("ratings").findOne({ _id: uid })
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
        const paymentCount = await db.collection("payment_limits").countDocuments({
            user_id: uid,
            date: today
        });

        const allRatings = await db.collection("ratings").find({ rating: { $exists: true } }).toArray();
        const totalRatings = allRatings.length;
        const avgRating = totalRatings > 0 ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) : 0;

        res.json({
            success: true,
            profile: {
                mythopoints: user?.mythopoints || 0,
                streak: user?.streak || 0,
                is_verified: user?.is_verified || false
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
// 💸 PAYMENT API – WITH CHAT SUPPORT
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
                
                // Save payment chat message
                await paymentChatCollection.insertOne({
                    senderId: sender,
                    receiverId: receiver,
                    amount: amt,
                    receiverAmount: receiverAmount,
                    tax: tax,
                    message: `💸 Payment of ${amt} Mythopoints sent!`,
                    timestamp: new Date(),
                    type: 'payment'
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
// PAYMENT CHAT API
// ==========================================

app.get("/api/payment/chat/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const chats = await paymentChatCollection
            .find({
                $or: [{ senderId: uid }, { receiverId: uid }]
            })
            .sort({ timestamp: -1 })
            .limit(50)
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
                isSent: c.senderId === uid
            };
        });
        
        res.json({ success: true, chats: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/payment/chat/message", async (req, res) => {
    try {
        const { senderId, receiverId, message } = req.body;
        if (!senderId || !receiverId || !message) {
            return res.status(400).json({ success: false, error: "Missing fields." });
        }
        
        await paymentChatCollection.insertOne({
            senderId: parseInt(senderId),
            receiverId: parseInt(receiverId),
            message: message,
            timestamp: new Date(),
            type: 'message'
        });
        
        res.json({ success: true });
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
// 🎬 MYTHOREELS – API FEED
// ==========================================

app.get("/api/reels/feed", async (req, res) => {
    try {
        const userId = parseInt(req.query.userId) || 0;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get videos from files collection (you may filter by mime_type if needed)
        const files = await filesCollection
            .find({})
            .sort({ uploaded_at: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Get user details for all uploaders
        const userIds = files.map(f => f.uploader_user_id).filter(id => id);
        let userMap = {};
        if (userIds.length) {
            const users = await usersCollection
                .find({ user_id: { $in: userIds } })
                .project({ user_id: 1, first_name: 1, username: 1, photo_url: 1 })
                .toArray();
            users.forEach(u => userMap[u.user_id] = u);
        }

        // Enrich each reel with likes, comments, and user info
        const reels = await Promise.all(files.map(async (file) => {
            const fileId = file.file_id;
            const likes = await userLikesCollection.countDocuments({ file_id: fileId, like_type: "like" });
            const comments = await commentsCollection.countDocuments({ file_id: fileId });
            const isLiked = userId ? await userLikesCollection.countDocuments({ user_id: userId, file_id: fileId, like_type: "like" }) > 0 : false;
            const uploader = userMap[file.uploader_user_id] || {};
            return {
                file_id: fileId,
                file_name: file.file_name || "Untitled",
                caption: file.caption || "",
                uploader_user_id: file.uploader_user_id,
                uploader_name: uploader.first_name || uploader.username || `User ${file.uploader_user_id}`,
                uploader_avatar: uploader.photo_url || "",
                uploaded_at: file.uploaded_at,
                likes: likes,
                comments_count: comments,
                is_liked: isLiked
            };
        }));

        res.json({ success: true, reels, page });
    } catch (error) {
        console.error("Reels feed error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// MINI APP ROUTE – PREMIUM FRONTEND (UPDATED with Chat & Pay & Reels)
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
  <style>
    /* === RESET & GLOBAL === */
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
      background: #0a0014;
      background-image: radial-gradient(circle at 50% 0%, rgba(101,31,255,0.15) 0%, transparent 60%), 
                        radial-gradient(circle at 80% 80%, rgba(213,0,249,0.08) 0%, transparent 50%);
      color: #ffffff;
      min-height: 100vh;
      padding-bottom: 80px;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      user-select: none;
      -webkit-touch-callout: none;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
    ::-webkit-scrollbar-thumb { background: #d500f9; border-radius: 10px; }

    /* === GLASS CARD === */
    .glass {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 0.5px solid rgba(255,255,255,0.07);
      border-radius: 24px;
      padding: 16px;
      margin: 12px 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(213,0,249,0.04);
      transition: all 0.3s ease;
    }
    .glass-title {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .glass-title svg {
      width: 24px;
      height: 24px;
      fill: #ea80fc;
    }

    /* === NAVBAR === */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(10,0,20,0.75);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-bottom: 0.5px solid rgba(255,255,255,0.06);
      padding: 16px 20px;
      text-align: center;
      font-weight: 600;
      font-size: 18px;
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
      background: rgba(10,0,20,0.85);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-top: 0.5px solid rgba(255,255,255,0.06);
      display: flex;
      justify-content: space-around;
      padding: 8px 0 calc(8px + env(safe-area-inset-bottom, 20px)) 0;
      z-index: 100;
    }
    .tab-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: rgba(255,255,255,0.3);
      font-size: 10px;
      font-weight: 500;
      transition: all 0.25s;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      min-width: 48px;
      position: relative;
    }
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

    /* === WIDGETS === */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .widget {
      background: rgba(45,10,80,0.35);
      border: 0.5px solid rgba(255,255,255,0.05);
      border-radius: 22px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3), inset 0 0 15px rgba(213,0,249,0.03);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      transition: transform 0.2s;
    }
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
      display: inline-block;
      background: linear-gradient(135deg, #ffd60a, #f59e0b);
      color: #000;
      border: none;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(255,214,10,0.4);
    }
    .upgrade-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(255,214,10,0.6);
    }
    .upgrade-btn:active {
      transform: scale(0.95);
    }

    /* Search Credits Widget Enhanced */
    .w-search {
      border: 0.5px solid rgba(10,132,255,0.2);
      background: linear-gradient(135deg, rgba(10,132,255,0.08), rgba(0,230,118,0.05));
      position: relative;
      overflow: hidden;
    }
    .w-search .widget-value { color: #0a84ff; }
    .w-search .widget-title { color: rgba(10,132,255,0.7); }
    
    .refill-btn {
      display: inline-block;
      background: linear-gradient(135deg, #0a84ff, #5e5ce6);
      color: #fff;
      border: none;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(10,132,255,0.4);
    }
    .refill-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(10,132,255,0.6);
    }
    .refill-btn:active {
      transform: scale(0.95);
    }

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

    /* === AI FAB === */
    .ai-fab {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #d500f9, #651fff);
      border: none;
      box-shadow: 0 4px 30px rgba(213,0,249,0.5);
      color: white;
      font-size: 20px;
      font-weight: 800;
      cursor: pointer;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: pulseGlow 2s infinite alternate;
    }
    .ai-fab:active { transform: scale(0.9); }
    @keyframes pulseGlow {
      0% { box-shadow: 0 4px 30px rgba(213,0,249,0.3); }
      100% { box-shadow: 0 4px 50px rgba(213,0,249,0.8); }
    }

    /* === AI CHAT OVERLAY === */
    .ai-chat-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 300;
      justify-content: center;
      align-items: flex-end;
    }
    .ai-chat-overlay.open { display: flex; }
    .ai-chat-panel {
      width: 100%;
      max-width: 420px;
      height: 80vh;
      background: #0a0014;
      border-radius: 30px 30px 0 0;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .ai-chat-header {
      padding: 16px 20px;
      background: rgba(10,0,20,0.8);
      backdrop-filter: blur(10px);
      border-bottom: 0.5px solid rgba(255,255,255,0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .ai-chat-header h3 { font-weight: 600; font-size: 18px; }
    .ai-chat-header .close-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      padding: 0 8px;
    }
    .ai-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 15px;
      line-height: 1.4;
      word-wrap: break-word;
    }
    .msg.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #d500f9, #651fff);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .msg.bot {
      align-self: flex-start;
      background: rgba(255,255,255,0.06);
      color: #eee;
      border-bottom-left-radius: 4px;
    }
    .msg.bot b { color: #ea80fc; }
    .ai-chat-footer {
      padding: 12px 16px;
      background: rgba(10,0,20,0.8);
      border-top: 0.5px solid rgba(255,255,255,0.04);
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .ai-chat-footer input {
      flex: 1;
      padding: 10px 14px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02);
      color: #fff;
      font-size: 15px;
      outline: none;
    }
    .ai-chat-footer input::placeholder { color: rgba(255,255,255,0.2); }
    .ai-chat-footer button {
      padding: 10px 18px;
      border-radius: 20px;
      border: none;
      background: linear-gradient(135deg, #d500f9, #651fff);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.1s;
    }
    .ai-chat-footer button:active { transform: scale(0.95); }
    .ai-clear-btn {
      background: rgba(255,69,58,0.15) !important;
      color: #ff453a !important;
      border: 1px solid rgba(255,69,58,0.15) !important;
    }
    .typing-indicator {
      align-self: flex-start;
      color: rgba(255,255,255,0.25);
      font-size: 14px;
      padding: 4px 12px;
    }
    @media (max-width: 480px) {
      .ai-chat-panel { height: 90vh; border-radius: 20px 20px 0 0; }
      .ai-fab { bottom: 90px; right: 16px; width: 54px; height: 54px; font-size: 18px; }
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
      background: #0a0014;
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

    /* === PAYMENT - CHAT STYLE === */
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
    }
    .payment-chat-container .chat-msg.sent .bubble {
      background: linear-gradient(135deg, #d500f9, #651fff);
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
      background: linear-gradient(135deg, #d500f9, #651fff);
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
    .store-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 0.5px solid rgba(255,255,255,0.04);
    }
    .store-item:last-child { border-bottom: none; }
    .store-item button {
      background: linear-gradient(135deg, #d500f9, #651fff);
      border: none;
      padding: 4px 14px;
      border-radius: 20px;
      color: white;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .store-item button:active { transform: scale(0.92); }

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
      background: linear-gradient(135deg, #d500f9, #651fff);
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
      background: #1a0a2b;
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
    .confirm-box .btn-confirm { background: linear-gradient(135deg, #d500f9, #651fff); color: #fff; }

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
      background: #0a0014;
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
      transition: width 0.3s ease;
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

    /* ===== REELS STYLES ===== */
    .reels-fab {
      position: fixed;
      bottom: 170px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6b6b, #d500f9);
      border: none;
      box-shadow: 0 4px 30px rgba(213,0,249,0.5);
      color: white;
      cursor: pointer;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: pulseGlow 2s infinite alternate;
    }
    .reels-fab:active { transform: scale(0.9); }
    @media (max-width: 480px) {
      .reels-fab { bottom: 150px; right: 16px; width: 54px; height: 54px; }
    }

    .reels-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: #000;
      z-index: 400;
      flex-direction: column;
    }
    .reels-overlay.open { display: flex; }

    .reels-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(10px);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #fff;
      flex-shrink: 0;
    }
    .reels-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      padding: 0 8px;
    }

    .reels-container {
      flex: 1;
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      height: 100%;
      background: #000;
      scroll-behavior: smooth;
    }
    .reels-container::-webkit-scrollbar { display: none; }

    .reel-item {
      position: relative;
      width: 100%;
      height: 100vh;
      scroll-snap-align: start;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    .reel-item video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }
    .reel-item .reel-overlay-ui {
      position: absolute;
      bottom: 80px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      color: #fff;
      pointer-events: none;
    }
    .reel-item .reel-overlay-ui .left {
      pointer-events: auto;
    }
    .reel-item .reel-overlay-ui .right {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      pointer-events: auto;
    }
    .reel-item .reel-overlay-ui .right button {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }
    .reel-item .reel-overlay-ui .right button span {
      font-size: 12px;
    }
    .reel-item .reel-overlay-ui .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .reel-item .reel-overlay-ui .user-info img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid #fff;
    }
    .reel-item .reel-overlay-ui .caption {
      font-size: 14px;
      line-height: 1.4;
      max-width: 80%;
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
    }
  </style>
</head>
<body>

  <!-- NAVBAR -->
  <div class="navbar" id="navTitle">Home</div>

  <!-- ========== TAB: HOME ========== -->
  <div id="tab-home" class="tab-content active">
    <div class="profile-hdr">
      <img id="ui-dp" class="profile-pic" src="https://via.placeholder.com/150/2d0a50/ea80fc?text=User" alt="DP">
      <div class="profile-info">
        <h1 id="ui-name">Loading...</h1>
        <p id="ui-id">ID: ${userId}</p>
        <div class="badge" id="ui-verified">Checking...</div>
      </div>
      <a href="http://t.me/MythoSerialBot/stream" target="_blank" class="switch-btn" title="Open Stream">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm0 8h-2v2h2z"/></svg>
      </a>
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
          <a href="https://t.me/MythoSerialBot?start=upgrade" target="_blank" class="upgrade-btn" onclick="tg.HapticFeedback.impactOccurred('medium')">Upgrade</a>
        </div>
        <div class="widget-value" style="font-size:20px; margin-top:4px;">
          <span id="ui-prem-status">Free</span>
          <span id="ui-prem-days" style="font-size:12px; color:rgba(255,255,255,0.3); font-weight:400; margin-left:4px;"></span>
        </div>
        <div style="font-size:10px; color:rgba(255,255,255,0.2); margin-top:2px;">
          <span id="ui-prem-plan">No active plan</span>
        </div>
      </div>
      <!-- Search Credits Widget - Enhanced -->
      <div class="widget w-search">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#0a84ff"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <span class="widget-title" style="font-size:10px; margin:0;">Search Credits</span>
          </div>
          <a href="https://t.me/MythoSerialBot?start=get" target="_blank" class="refill-btn" onclick="tg.HapticFeedback.impactOccurred('medium')">Refill</a>
        </div>
        <div class="widget-value" style="font-size:22px; margin-top:4px;">
          <span id="ui-credits">0</span>
          <span style="font-size:14px; color:rgba(255,255,255,0.2)">/5</span>
        </div>
        <div style="font-size:10px; color:rgba(255,255,255,0.2); margin-top:2px;">
          Refill With /get
        </div>
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
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm0 8h-2v2h2z"/></svg>
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
      <div id="store-items">
        <div class="store-item"><span>🔑 5 Search Credits</span><button onclick="purchase('credits')">50 pts</button></div>
        <div class="store-item"><span>⏱️ Skip Cooldown</span><button onclick="purchase('skip_cooldown')">50 pts</button></div>
        <div class="store-item"><span>🎁 Mystery Box</span><button onclick="purchase('mystery')">100 pts</button></div>
        <div class="store-item"><span>🎟️ 10% OFF Coupon</span><button onclick="purchase('coupon_10')">200 pts</button></div>
        <div class="store-item"><span>🎟️ 20% OFF Coupon</span><button onclick="purchase('coupon_20')">500 pts</button></div>
        <div class="store-item"><span>🎟️ 30% OFF Coupon</span><button onclick="purchase('coupon_30')">800 pts</button></div>
        <div class="store-item"><span>🎟️ 50% OFF Coupon</span><button onclick="purchase('coupon_50')">1500 pts</button></div>
      </div>
    </div>
  </div>

  <!-- ========== TAB: PAY (Chat & Pay) ========== -->
  <div id="tab-pay" class="tab-content">
    <div class="glass" style="padding:12px 14px;">
      <div class="glass-title" style="font-size:15px; margin-bottom:6px;">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm0 8h-2v2h2z"/></svg>
        Payment Chat
      </div>
      <p style="font-size:11px; color:rgba(255,255,255,0.4); margin-bottom:6px;">Min 200 pts | 15% tax | 1 payment/day</p>
      
      <input type="text" id="search-user" class="search-user-input" placeholder="Search user by name or ID..." />
      <div id="search-results"></div>
      
      <div id="selected-user" style="display:none;">
        <div class="selected-user-badge">
          <span>💬 Sending to: <strong id="selected-name"></strong></span>
          <button class="remove-btn" onclick="clearSelectedUser()">✕</button>
        </div>
      </div>
      
      <div class="payment-chat-container" id="payment-chat-container">
        <div class="empty" style="padding:8px; font-size:12px;">Select a user to start chatting</div>
      </div>
      
      <div class="payment-chat-input-row">
        <input type="text" id="chat-input" placeholder="Type a message..." />
        <button id="chat-send-btn">Send</button>
      </div>
      
      <div style="margin-top:8px; border-top:0.5px solid rgba(255,255,255,0.06); padding-top:8px;">
        <div class="upi-display" id="upi-display">₹0</div>
        <div class="upi-numpad" id="upi-numpad">
          <button data-value="1">1</button>
          <button data-value="2">2</button>
          <button data-value="3">3</button>
          <button data-value="4">4</button>
          <button data-value="5">5</button>
          <button data-value="6">6</button>
          <button data-value="7">7</button>
          <button data-value="8">8</button>
          <button data-value="9">9</button>
          <button data-value="clear" class="clear-btn">⌫</button>
          <button data-value="0">0</button>
          <button data-value="send" style="background:linear-gradient(135deg,#d500f9,#651fff);">Pay</button>
        </div>
      </div>
      
      <div class="payment-processing" id="payment-processing">
        <svg class="svg-loader" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#d500f9" stroke-width="6" 
            stroke-dasharray="251.2" stroke-dashoffset="251.2"
            style="animation: dash 1.5s ease-in-out infinite; transform-origin: center; transform: rotate(-90deg);"/>
          <text x="50" y="54" text-anchor="middle" fill="#fff" font-size="12" font-weight="600">Processing</text>
        </svg>
        <style>
          @keyframes dash {
            0% { stroke-dashoffset: 251.2; }
            50% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -251.2; }
          }
        </style>
        <p style="color:rgba(255,255,255,0.5); font-size:12px;">Verifying transaction...</p>
      </div>
      
      <div id="payment-status" style="margin-top:4px; text-align:center; font-size:12px;"></div>
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

  <!-- ========== TAB BAR ========== -->
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
    <div class="tab-btn" data-tab="pay">
      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v10zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
      <span>Pay</span>
    </div>
    <div class="tab-btn" data-tab="profile">
      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      <span>Profile</span>
    </div>
  </div>

  <!-- ========== AI FAB ========== -->
  <button class="ai-fab" id="aiFab">AI</button>

  <!-- ========== REELS FAB ========== -->
  <button class="reels-fab" id="reelsFab">
    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
      <path d="M18 4v1h-2V4c0-.552.448-1 1-1s1 .448 1 1zm-6 0v1H9V4c0-.552.448-1 1-1s1 .448 1 1zm4 4v1h-2V8c0-.552.448-1 1-1s1 .448 1 1zm-2-5V2c0-.552.448-1 1-1s1 .448 1 1v1h-2zM6 4v1H4V4c0-.552.448-1 1-1s1 .448 1 1zm-2 8V8c0-.552.448-1 1-1s1 .448 1 1v4c0 .552-.448 1-1 1s-1-.448-1-1zm2 6c0 .552-.448 1-1 1s-1-.448-1-1v-1h2v1zm12-4v3c0 .552-.448 1-1 1s-1-.448-1-1v-3c0-.552.448-1 1-1s1 .448 1 1zm-6 1h2v-1h-2v1zm-4 2h4v-1H8v1zm10-1v-2h-2v2h2z"/>
    </svg>
  </button>

  <!-- ========== AI CHAT OVERLAY ========== -->
  <div class="ai-chat-overlay" id="aiChatOverlay">
    <div class="ai-chat-panel">
      <div class="ai-chat-header">
        <h3>🤖 Mytho AI</h3>
        <button class="close-btn" id="aiCloseBtn">✕</button>
      </div>
      <div class="ai-chat-messages" id="aiMessages">
        <div class="msg bot">Hey! Ask me anything about MythoSerial or just chat. 😊</div>
      </div>
      <div class="ai-chat-footer">
        <input type="text" id="aiInput" placeholder="Type a message..." />
        <button id="aiSendBtn">Send</button>
        <button id="aiClearBtn" class="ai-clear-btn" title="Clear Memory">🗑️</button>
      </div>
    </div>
  </div>

  <!-- ========== REELS OVERLAY ========== -->
  <div class="reels-overlay" id="reelsOverlay">
    <div class="reels-header">
      <span style="font-weight:600; font-size:18px;">🎬 Reels</span>
      <button class="reels-close" id="reelsClose">✕</button>
    </div>
    <div class="reels-container" id="reelsContainer">
      <!-- Reels injected by JS -->
    </div>
  </div>

  <script>
    // ─── TELEGRAM WEB APP ───
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.setHeaderColor('#0A0014');
    tg.setBackgroundColor('#000000');

    const userId = ${userId};

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
      premium: { active: false, plan: 'Free', daysLeft: 0 },
      bank: { invested: 0, pendingYield: 0, loan: 0 },
      stats: { earned: 0, spent: 0 },
      chant: { totalTaps: 0, level: 'Seeker', multiplier: 1 },
      verified: false,
      payment: { used: 0, limit: 1 }
    }, {
      set(target, prop, value) {
        target[prop] = value;
        updateUI();
        return true;
      }
    });

    function updateUI() {
      document.getElementById('ui-pts').innerText = state.mythopoints.toLocaleString();
      document.getElementById('ui-credits').innerText = state.credits;
      document.getElementById('streak-count').innerText = state.streak + ' Day Streak';
      document.getElementById('ui-life-earn').innerText = state.stats.earned.toLocaleString();
      document.getElementById('ui-life-spent').innerText = state.stats.spent.toLocaleString();
      document.getElementById('profile-pts').innerText = state.mythopoints.toLocaleString();
      document.getElementById('profile-streak').innerText = state.streak;
      
      const badge = document.getElementById('ui-verified');
      if (state.verified) {
        badge.innerText = '✓ Secured Node';
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
      
      document.getElementById('ui-bank-invest').innerText = state.bank.invested.toLocaleString() + ' pts';
      document.getElementById('ui-bank-yield').innerText = '+' + state.bank.pendingYield.toLocaleString();
      document.getElementById('ui-bank-loan').innerText = state.bank.loan.toLocaleString();
      
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
      if (state.verified) {
        profileVerified.innerText = '✅ Verified';
        profileVerified.style.color = '#30d158';
      } else {
        profileVerified.innerText = '❌ Unverified';
        profileVerified.style.color = '#ff453a';
      }
      
      document.getElementById('payment-status').innerHTML = \`Daily payments: \${state.payment.used}/\${state.payment.limit}\`;
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
      if (tabId === 'pay') { loadPaymentChat(); loadPaymentStatus(); }
    }
    window.switchTab = switchTab;

    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
      });
    });

    // ─── LOAD DASHBOARD DATA ───
    async function loadDashboard() {
      try {
        const res = await fetch('/api/ios-dashboard-data/' + userId);
        const data = await res.json();
        if (!data.success) return;
        
        state.mythopoints = data.profile.mythopoints || 0;
        state.streak = data.profile.streak || 0;
        state.verified = data.profile.is_verified || false;
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
      } catch (e) {
        console.error('Dashboard error:', e);
      }
    }

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

    // ─── PAYMENT CHAT ───
    let selectedReceiver = null;
    let upiAmount = 0;
    let chatPollInterval = null;

    document.getElementById('search-user').addEventListener('input', async function() {
      const query = this.value.trim();
      if (query.length < 2) {
        document.getElementById('search-results').innerHTML = '';
        return;
      }
      try {
        const res = await fetch('/api/users/search?q=' + encodeURIComponent(query));
        const data = await res.json();
        if (data.success && data.users.length) {
          let html = '';
          data.users.forEach(u => {
            const avatar = u.photo_url ? \`<img src="\${u.photo_url}" class="result-avatar" />\` :
                          \`<div class="result-avatar">\${u.name.charAt(0).toUpperCase()}</div>\`;
            html += \`
              <div class="user-result" onclick="selectUser(\${u.id}, '\${u.name}', '\${u.photo_url || ''}')">
                \${avatar}
                <div class="result-info">
                  <div class="name">\${u.name} \${u.username ? '@' + u.username : ''}</div>
                  <div class="sub">\${u.points} pts</div>
                </div>
              </div>
            \`;
          });
          document.getElementById('search-results').innerHTML = html;
        } else {
          document.getElementById('search-results').innerHTML = '<div class="empty" style="font-size:12px; padding:8px;">No users found.</div>';
        }
      } catch (e) {}
    });

    function selectUser(id, name, photo) {
      selectedReceiver = id;
      document.getElementById('selected-user').style.display = 'block';
      document.getElementById('selected-name').innerText = name;
      document.getElementById('search-results').innerHTML = '';
      document.getElementById('search-user').value = name;
      loadPaymentChat();
      // Auto-focus chat input
      document.getElementById('chat-input').focus();
    }
    window.selectUser = selectUser;

    function clearSelectedUser() {
      selectedReceiver = null;
      document.getElementById('selected-user').style.display = 'none';
      document.getElementById('search-user').value = '';
      document.getElementById('payment-chat-container').innerHTML = '<div class="empty" style="padding:8px; font-size:12px;">Select a user to start chatting</div>';
      if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
      }
    }
    window.clearSelectedUser = clearSelectedUser;

    async function loadPaymentChat() {
      if (!selectedReceiver) {
        document.getElementById('payment-chat-container').innerHTML = '<div class="empty" style="padding:8px; font-size:12px;">Select a user to start chatting</div>';
        return;
      }
      try {
        const res = await fetch('/api/payment/chat/' + userId);
        const data = await res.json();
        if (data.success) {
          const container = document.getElementById('payment-chat-container');
          const filtered = data.chats.filter(c => 
            (c.senderId === selectedReceiver || c.receiverId === selectedReceiver) ||
            (c.senderId === userId && c.receiverId === selectedReceiver) ||
            (c.receiverId === userId && c.senderId === selectedReceiver)
          );
          
          if (filtered.length === 0) {
            container.innerHTML = '<div class="empty" style="padding:8px; font-size:12px;">No messages yet. Start a conversation!</div>';
          } else {
            let html = '';
            filtered.reverse().forEach(c => {
              const isSent = c.senderId === userId;
              const time = new Date(c.timestamp).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
              const avatar = isSent ? 
                (tgUser?.photo_url ? \`<img src="\${tgUser.photo_url}" class="avatar" />\` : \`<div class="avatar">\${(tgUser?.first_name || 'U').charAt(0)}</div>\`) :
                (c.senderPhoto ? \`<img src="\${c.senderPhoto}" class="avatar" />\` : \`<div class="avatar">\${(c.senderName || 'U').charAt(0)}</div>\`);
              
              let content = '';
              if (c.type === 'payment') {
                content = \`
                  <div class="payment-card">
                    💸 Payment of <span class="amount">\${c.amount}</span> Mythopoints sent!
                    <div style="font-size:10px; color:rgba(255,255,255,0.4);">Tax: \${c.tax || 0} pts</div>
                  </div>
                \`;
              } else {
                content = c.message || '';
              }
              
              html += \`
                <div class="chat-msg \${isSent ? 'sent' : 'received'}">
                  \${avatar}
                  <div>
                    <div class="bubble">\${content}</div>
                    <div class="time">\${time}</div>
                  </div>
                </div>
              \`;
            });
            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
          }
        }
      } catch (e) {
        console.error('Chat load error:', e);
      }
    }

    async function sendChatMessage() {
      const input = document.getElementById('chat-input');
      const msg = input.value.trim();
      if (!msg || !selectedReceiver) return;
      
      try {
        await fetch('/api/payment/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: userId,
            receiverId: selectedReceiver,
            message: msg
          })
        });
        input.value = '';
        tg.HapticFeedback.impactOccurred('light');
        loadPaymentChat();
      } catch (e) {
        alert('Failed to send message.');
      }
    }

    document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });

    // UPI Numpad
    document.querySelectorAll('.upi-numpad button').forEach(btn => {
      btn.addEventListener('click', function() {
        const value = this.dataset.value;
        if (value === 'clear') {
          upiAmount = Math.floor(upiAmount / 10);
        } else if (value === 'send') {
          sendPayment();
          return;
        } else {
          const num = parseInt(value);
          upiAmount = upiAmount * 10 + num;
        }
        document.getElementById('upi-display').innerText = '₹' + upiAmount;
        tg.HapticFeedback.impactOccurred('light');
      });
    });

    async function sendPayment() {
      if (!selectedReceiver) {
        alert('Please select a receiver first.');
        return;
      }
      if (upiAmount < 200) {
        alert('Minimum 200 Mythopoints.');
        return;
      }
      
      const processing = document.getElementById('payment-processing');
      processing.classList.add('active');
      
      try {
        const res = await fetch('/api/payment/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: userId,
            receiverId: selectedReceiver,
            amount: upiAmount
          })
        });
        const data = await res.json();
        processing.classList.remove('active');
        
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          await showSuccess(\`Payment of \${upiAmount} Mythopoints sent successfully!\`, 'Payment Successful');
          loadDashboard();
          loadPaymentStatus();
          loadPaymentChat();
          upiAmount = 0;
          document.getElementById('upi-display').innerText = '₹0';
        } else {
          alert(data.error);
          tg.HapticFeedback.notificationOccurred('error');
        }
      } catch (e) {
        processing.classList.remove('active');
        alert('Network error. Please try again.');
      }
    }

    async function loadPaymentStatus() {
      try {
        const res = await fetch('/api/ios-dashboard-data/' + userId);
        const data = await res.json();
        if (data.success && data.payment) {
          state.payment.used = data.payment.usedToday || 0;
          state.payment.limit = data.payment.dailyLimit || 1;
          updateUI();
        }
      } catch (e) {}
    }

    // ─── HISTORY with Infinite Scroll ───
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

    // ─── AI CHAT ───
    const aiFab = document.getElementById('aiFab');
    const aiOverlay = document.getElementById('aiChatOverlay');
    const aiClose = document.getElementById('aiCloseBtn');
    const aiMessages = document.getElementById('aiMessages');
    const aiInput = document.getElementById('aiInput');
    const aiSend = document.getElementById('aiSendBtn');
    const aiClear = document.getElementById('aiClearBtn');

    aiFab.addEventListener('click', () => {
      aiOverlay.classList.add('open');
      aiInput.focus();
      tg.HapticFeedback.impactOccurred('medium');
    });
    aiClose.addEventListener('click', () => aiOverlay.classList.remove('open'));
    aiOverlay.addEventListener('click', (e) => {
      if (e.target === aiOverlay) aiOverlay.classList.remove('open');
    });

    function addMessage(text, sender) {
      const div = document.createElement('div');
      div.className = 'msg ' + sender;
      div.innerHTML = text;
      aiMessages.appendChild(div);
      aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    async function sendMessage() {
      const msg = aiInput.value.trim();
      if (!msg) return;
      addMessage(msg, 'user');
      aiInput.value = '';
      const typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.innerText = 'Mythobot is typing...';
      aiMessages.appendChild(typing);
      aiMessages.scrollTop = aiMessages.scrollHeight;

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, message: msg })
        });
        const data = await res.json();
        typing.remove();
        if (data.success) {
          addMessage(data.reply, 'bot');
          tg.HapticFeedback.notificationOccurred('success');
        } else {
          addMessage('❌ Something went wrong. Try again.', 'bot');
        }
      } catch (e) {
        typing.remove();
        addMessage('❌ Network error. Please check your connection.', 'bot');
      }
    }

    aiSend.addEventListener('click', sendMessage);
    aiInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

    aiClear.addEventListener('click', async () => {
      if (confirm('Clear conversation memory?')) {
        try {
          await fetch('/api/ai/clear/' + userId, { method: 'POST' });
          aiMessages.innerHTML = '<div class="msg bot">Memory cleared. Start fresh!</div>';
          tg.HapticFeedback.notificationOccurred('warning');
        } catch (e) {}
      }
    });

    // ─── CHANT & EARN (1 second cooldown) ───
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

    // ─── REELS ───
    let reelsData = [];
    let currentReelIndex = 0;
    let reelsPage = 1;
    let reelsLoading = false;
    let reelsHasMore = true;

    const reelsFab = document.getElementById('reelsFab');
    const reelsOverlay = document.getElementById('reelsOverlay');
    const reelsClose = document.getElementById('reelsClose');
    const reelsContainer = document.getElementById('reelsContainer');

    reelsFab.addEventListener('click', () => {
      reelsOverlay.classList.add('open');
      if (reelsData.length === 0) loadReels(1, true);
    });

    reelsClose.addEventListener('click', () => {
      reelsOverlay.classList.remove('open');
      // Pause all videos
      document.querySelectorAll('.reel-item video').forEach(v => v.pause());
    });

    async function loadReels(page, reset = false) {
      if (reelsLoading) return;
      reelsLoading = true;
      try {
        const res = await fetch(\`/api/reels/feed?userId=\${userId}&page=\${page}&limit=10\`);
        const data = await res.json();
        if (data.success) {
          if (reset) {
            reelsData = data.reels;
            reelsContainer.innerHTML = '';
            reelsPage = page;
            reelsHasMore = data.reels.length === 10;
          } else {
            reelsData = reelsData.concat(data.reels);
            reelsHasMore = data.reels.length === 10;
          }
          renderReels(reset);
        }
      } catch (e) {
        console.error('Reels fetch error:', e);
      } finally {
        reelsLoading = false;
      }
    }

    function renderReels(reset) {
      if (reset) reelsContainer.innerHTML = '';
      reelsData.forEach((reel) => {
        // Avoid duplicates
        if (document.getElementById(\`reel-\${reel.file_id}\`)) return;
        const reelDiv = document.createElement('div');
        reelDiv.className = 'reel-item';
        reelDiv.id = \`reel-\${reel.file_id}\`;
        reelDiv.innerHTML = \`
          <video src="/stream/\${reel.file_id}" muted playsinline preload="metadata" loop></video>
          <div class="reel-overlay-ui">
            <div class="left">
              <div class="user-info">
                <img src="\${reel.uploader_avatar || 'https://via.placeholder.com/36'}" alt="avatar">
                <span style="font-weight:600;">\${reel.uploader_name}</span>
              </div>
              <div class="caption">\${reel.caption || reel.file_name || ''}</div>
            </div>
            <div class="right">
              <button class="reel-like-btn" data-fileid="\${reel.file_id}" data-liked="\${reel.is_liked}">
                <span style="font-size:32px;">\${reel.is_liked ? '❤️' : '🤍'}</span>
                <span>\${reel.likes || 0}</span>
              </button>
              <button class="reel-comment-btn" data-fileid="\${reel.file_id}">
                <span style="font-size:32px;">💬</span>
                <span>\${reel.comments_count || 0}</span>
              </button>
            </div>
          </div>
        \`;
        reelsContainer.appendChild(reelDiv);
      });

      // Attach event listeners
      document.querySelectorAll('.reel-like-btn').forEach(btn => {
        btn.removeEventListener('click', handleReelLike);
        btn.addEventListener('click', handleReelLike);
      });
      document.querySelectorAll('.reel-comment-btn').forEach(btn => {
        btn.removeEventListener('click', handleReelComment);
        btn.addEventListener('click', handleReelComment);
      });

      // Setup auto-play and infinite scroll
      setupReelIntersection();
    }

    function setupReelIntersection() {
      const videos = document.querySelectorAll('.reel-item video');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.6 });
      videos.forEach(v => observer.observe(v));

      // Infinite scroll
      const lastReel = reelsContainer.lastElementChild;
      if (lastReel) {
        const scrollObserver = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && reelsHasMore && !reelsLoading) {
            loadReels(++reelsPage, false);
          }
        }, { root: reelsContainer, threshold: 0.1 });
        scrollObserver.observe(lastReel);
      }
    }

    async function handleReelLike(e) {
      const btn = e.currentTarget;
      const fileId = btn.dataset.fileid;
      const liked = btn.dataset.liked === 'true';
      const action = liked ? 'remove' : 'like';
      try {
        const res = await fetch('/api/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: parseInt(fileId), action })
        });
        const data = await res.json();
        if (data.success) {
          const newLiked = data.action === 'liked';
          btn.dataset.liked = newLiked;
          btn.innerHTML = \`<span style="font-size:32px;">\${newLiked ? '❤️' : '🤍'}</span><span>\${data.likes}</span>\`;
          tg.HapticFeedback.impactOccurred('light');
        }
      } catch (e) {}
    }

    async function handleReelComment(e) {
      const fileId = e.currentTarget.dataset.fileid;
      const comment = prompt('Write a comment:');
      if (comment && comment.trim()) {
        try {
          const res = await fetch('/api/add-comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: parseInt(fileId), comment: comment.trim() })
          });
          if (res.ok) {
            tg.HapticFeedback.notificationOccurred('success');
            const btn = e.currentTarget;
            const countSpan = btn.querySelector('span:last-child');
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = currentCount + 1;
          }
        } catch (e) {}
      }
    }

    // Close overlay on outside click
    reelsOverlay.addEventListener('click', (e) => {
      if (e.target === reelsOverlay) {
        reelsOverlay.classList.remove('open');
      }
    });

    // ─── INIT ───
    async function init() {
      loadChantPersistence();
      await loadDashboard();
      await fetchChantStats();
      await loadChantLeaderboard();
      
      if (document.getElementById('tab-bank').classList.contains('active')) { 
        loadBankData(); 
        loadWithdrawHistory(); 
      }
      if (document.getElementById('tab-profile').classList.contains('active')) { 
        loadHistory(1, true); 
        loadLeaderboard(); 
        loadRatingStatus(); 
      }
      if (document.getElementById('tab-pay').classList.contains('active')) { 
        loadPaymentChat(); 
        loadPaymentStatus(); 
      }
    }
    
    init();
  </script>
</body>
</html>
    `);
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
// AI MEMORY FUNCTIONS (unchanged)
// ==========================================
async function addToMemory(userId, message) {
    const key = `${userId}:${userId}`;
    const doc = await usersCollection.findOne({ user_id: key });
    if (!doc) {
        await usersCollection.insertOne({
            user_id: key,
            chat_id: parseInt(userId),
            user_id_num: parseInt(userId),
            conversation: [message],
            total_messages: 1,
            first_seen: new Date(),
            last_seen: new Date()
        });
    } else {
        let conv = doc.conversation || [];
        conv.push(message);
        if (conv.length > 1000) conv = conv.slice(-1000);
        await usersCollection.updateOne(
            { user_id: key },
            {
                $set: {
                    conversation: conv,
                    total_messages: conv.length,
                    last_seen: new Date()
                }
            }
        );
    }
}

async function getMemory(userId) {
    const key = `${userId}:${userId}`;
    const doc = await usersCollection.findOne({ user_id: key });
    if (doc && doc.conversation) {
        const recent = doc.conversation.slice(-14);
        return recent.join('\n');
    }
    return '';
}

async function clearMemory(userId) {
    const key = `${userId}:${userId}`;
    await usersCollection.updateOne(
        { user_id: key },
        {
            $set: {
                conversation: [],
                total_messages: 0
            }
        },
        { upsert: true }
    );
}

// ==========================================
// AI API ENDPOINT (unchanged)
// ==========================================
app.post("/api/ai", async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ success: false, error: "Missing userId or message" });
        }

        await addToMemory(userId, `User: ${message}`);

        let sysPrompt = "You are MythoBot. made by @sandip10x Talk in a friendly, Gen-Z Hinglish tone. Be direct. Rules: 1. Keep replies under 500 chars. 2. Use <b>bold</b> for keywords. 3. No markdown.";

        const SERIAL_COMMANDS = {
            "shiv shakti": "/ss s01e01",
            "dwarkadheesh": "/d s01e01",
            "karmadhikari shanidev": "/karm s01e01",
            "chandra dev": "/cd s01e01",
            "mahishasura mardini": "/mm s01e01",
            "jai mahalakshmi": "/jm s01e01",
            "chandra nandni": "/cn s01e01",
            "brij ke gopal": "/bkg s01e01",
            "yashomati maiya ke nandlala": "/ymkn s01e01",
            "meera": "/meera s01e01",
            "bangla": "/bang s01e01",
            "dharm yoddha garud": "/dyg s01e01",
            "siya ke ram": "/skr s01e01",
            "ram siya ke luv kush": "/rsklk s01e01",
            "tenali rama": "/tr s01e01",
            "devon ke dev mahadev": "/dkdm s01e01",
            "karn sangini": "/ks s01e01",
            "bolo ambe maa ki jai": "/maa s01e01",
            "sriman rama": "/rama s01e01",
            "the legend of hanuman": "/tloh s01e01",
            "ramayan luv kush": "/ramayan2 s01e01",
            "hatim": "/hatim s01e01",
            "ramanand sagar ramayan": "/ramayan s01e01",
            "shrimad ramayan": "/sr s01e01",
            "ramayan sabke jeevan ka aadhar": "/rsjka s01e01",
            "radhakrishn": "/rk s1 e01",
            "veer hanuman": "/vh s01e01",
            "prithviraj chauhan": "/cspc s01e01",
            "suryaputra karn": "/spk s01e01",
            "jai kanhaiya laal ki": "/jklk s1 e01",
            "kaamdhenu gaumata": "/kg s01e01",
            "kakbhushundi ramayan": "/kr s01e01",
            "mata saraswati": "/ms s01e01",
            "shri krishna": "/sk s01e01",
            "mahabharat": "/mb s01e01",
            "jag jaanani maa vaishnodevi": "/jjmv s01e01",
            "shri tirupati balaji": "/stb s01e01",
            "ganesh kartikey": "/gk s01e01",
            "kurukshetra": "/kurukshetra s01e01",
            "mahabharat - ek dharmayudh": "/med s01e01",
            "budh dev": "/bd s01e01"
        };

        function detectSerial(text) {
            const lower = text.toLowerCase().trim();
            for (const [name, cmd] of Object.entries(SERIAL_COMMANDS)) {
                if (lower.includes(name)) return { serial: name, command: cmd };
            }
            return null;
        }

        let finalPrompt = "";
        const serial = detectSerial(message);
        if (serial) {
            finalPrompt = `${sysPrompt} Task: User wants ${serial.serial}. Tell them to send: ${serial.command}`;
        } else {
            let history = await getMemory(userId);
            if (history && history.length > 400) {
                history = "..." + history.slice(-400);
            }
            if (history) {
                finalPrompt = `${sysPrompt} Chat context: ${history}. User says: ${message}`;
            } else {
                finalPrompt = `${sysPrompt} User says: ${message}`;
            }
        }

        const encoded = encodeURIComponent(finalPrompt);
        const apiUrl = `https://apis.prexzyvilla.site/ai/gpt-5?text=${encoded}`;
        
        let fetchModule;
        try { fetchModule = (await import('node-fetch')).default; } catch (e) { fetchModule = fetch; }
        
        const response = await fetchModule(apiUrl);
        let reply = null;
        
        if (response.ok) {
            const data = await response.json();
            reply = data.text || data.reply || data.response || data.message || data.data || null;
            if (reply && typeof reply === 'string') {
                reply = reply.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                reply = reply.replace(/\n/g, ' ');
            }
        }

        if (!reply) {
            reply = "Arre yaar, lagta hai network devlok (API) mein thoda busy chal raha hai! Thodi der mein wapas try kar 😅✨";
        }

        await addToMemory(userId, `Mythobot: ${reply}`);

        res.json({ success: true, reply });
    } catch (error) {
        console.error("AI API error:", error);
        res.status(500).json({ success: false, error: "AI service unavailable" });
    }
});

// ==========================================
// AI MEMORY ENDPOINTS
// ==========================================
app.get("/api/ai/memory/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const memory = await getMemory(userId);
        res.json({ success: true, memory });
    } catch (e) {
        res.status(500).json({ success: false, error: "Failed to fetch memory" });
    }
});

app.post("/api/ai/clear/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        await clearMemory(userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: "Failed to clear memory" });
    }
});

// ========================
// FALLBACK HOME ROUTE
// ========================
app.get("*", (req, res) => {
    res.redirect('https://t.me/MythoSerialBot');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Fully Secured Anti-Bypass Server running on port ${PORT}`);
});
