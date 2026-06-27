// ============================================================
// index.js – Full Express Server with Banking, Store & Payments
// ============================================================

import express from "express";
import { MongoClient } from "mongodb";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parsing for API requests
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
let doubleCollection;
let urlShortenerCollection;
let maskCollection;
let searchAdsCollection; 
let scratchCollection;
let usersCollection;
let mpHistoryCollection;
let userStatsCollection;
let bankCollection;
let couponsCollection;
let searchLimitCollection;
let paymentLimitCollection;
let ipVerificationCollection;

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
    
    console.log("✅ MongoDB connected for all collections");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
  }
}
connectDB();

// ========================
// GLOBAL THEME (Glassmorphism & Cosmic Neon)
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
      .btn:hover { 
          transform: translateY(-2px); box-shadow: 0 0 25px rgba(213, 0, 249, 0.7); 
      }
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
    if (points < 100) return "🌱 Novice";
    if (points < 500) return "⚔️ Warrior";
    if (points < 1500) return "🛡️ Knight";
    if (points < 3000) return "🐉 Dragon Slayer";
    return "👑 Mythic Lord";
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
                <div style="font-size:60px; margin-bottom:10px;">🚫🤖</div>
                <h2 class="error-title">Bypass Bot Detected!</h2>
                <p>You attempted to use a bypass method or external script to skip verification.</p>
                <div class="manual-box" style="display:block; text-align:center;">
                    <p style="color:white; margin:0;">Please click the original <b>shortxlinks</b> link in Telegram to proceed securely.</p>
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
          <h2>🎉 Verification Complete!</h2>
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
            <h2 style="color: #ff4757; text-shadow: 0 0 10px rgba(255, 71, 87, 0.5);">❌ Access Denied</h2>
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
          <h2 style="color: #00ffcc; text-shadow: 0 0 10px rgba(0, 255, 204, 0.5);">✅ Verified Successfully</h2>
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
                    💠 <span id="user-points">${currentPoints}</span> MP
                </div>
            </div>
        </div>

        <div id="floating-reward" class="floating-points">+${reward} MythoPoints!</div>

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
      <h2>✅ Token generated!</h2>
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
// UNIFIED APPLE iOS PROFILE MINI APP
// ==========================================

// 1. API: Fetch Unified User Data & Activity History (unchanged)
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

// 2. RENDER: The Apple iPhone UI (unchanged)
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
// UNIFIED iOS PURPLE DASHBOARD (ALL FEATURES) – ADDED NEW TABS
// ==========================================

// 1. API: Extract all user data across multiple collections (updated to include bank/store)
app.get("/api/ios-dashboard-data/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const db = client.db("Mytho");
        const now = Math.floor(Date.now() / 1000);

        const [user, bank, search, premium, stats, history] = await Promise.all([
            db.collection("users").findOne({ user_id: uid }),
            db.collection("bank").findOne({ user_id: uid }),
            db.collection("search_limits").findOne({ user_id: uid }),
            db.collection("premium_users").findOne({ user_id: uid }),
            db.collection("user_stats").findOne({ user_id: uid }),
            db.collection("mphistory").find({ user_id: uid }).sort({ date: -1 }).limit(20).toArray()
        ]);

        let pendingInterest = 0;
        let activeLoan = false;
        let loanDue = 0;

        if (bank) {
            if (bank.invested > 0) {
                const cycles = Math.floor((now - bank.last_claim_time) / 86400);
                if (cycles > 0) pendingInterest = Math.floor(bank.invested * 0.05 * cycles); // 5% daily
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

        // Get daily payment count for today
        const today = new Date().toISOString().split('T')[0];
        const paymentCount = await db.collection("payment_limits").countDocuments({
            user_id: uid,
            date: today
        });

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
            }
        });
    } catch (error) {
        console.error("Dashboard API Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
    }
});

// ==========================================
// 🏦 BANKING API (cbank.py logic)
// ==========================================

// Helper: Get or create bank document
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

// Helper: Calculate pending interest
function calculateInterest(invested, lastClaimTime) {
    if (invested <= 0) return 0;
    const now = Math.floor(Date.now() / 1000);
    const cycles = Math.floor((now - lastClaimTime) / 86400);
    if (cycles < 1) return 0;
    return Math.floor(invested * 0.05 * cycles); // 5% daily
}

// Helper: Calculate loan due
function calculateLoanDue(principal, takenAt) {
    if (principal <= 0) return 0;
    const now = Math.floor(Date.now() / 1000);
    let cycles = Math.floor((now - takenAt) / 86400);
    cycles = Math.max(1, cycles);
    const interest = Math.floor(principal * 0.10 * cycles);
    const total = principal + interest;
    return Math.min(total, principal * 5);
}

// GET bank status
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

// POST: Invest (add funds)
app.post("/api/bank/invest/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Invalid amount" });

        const bank = await getBank(uid);
        const user = await usersCollection.findOne({ user_id: uid });
        if (!user) return res.status(404).json({ success: false, error: "User not found" });
        if (user.mythopoints < amount) return res.status(400).json({ success: false, error: "Insufficient balance" });

        // Check if pending interest exists – if so, force claim first
        const pending = calculateInterest(bank.invested, bank.last_claim_time);
        if (pending > 0) {
            return res.status(400).json({ success: false, error: "Claim pending interest before investing" });
        }

        // Deduct from wallet
        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: -amount } });
        // Update bank: increase invested, reset timer
        await bankCollection.updateOne(
            { user_id: uid },
            {
                $inc: { invested: amount },
                $set: { last_claim_time: Math.floor(Date.now() / 1000) }
            }
        );

        // Log transaction
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

// POST: Withdraw (remove funds)
app.post("/api/bank/withdraw/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Invalid amount" });

        const bank = await getBank(uid);
        if (bank.invested < amount) return res.status(400).json({ success: false, error: "Not enough invested" });

        // Check pending interest
        const pending = calculateInterest(bank.invested, bank.last_claim_time);
        if (pending > 0) {
            return res.status(400).json({ success: false, error: "Claim pending interest before withdrawing" });
        }

        // Update bank
        await bankCollection.updateOne(
            { user_id: uid },
            {
                $inc: { invested: -amount },
                $set: { last_claim_time: Math.floor(Date.now() / 1000) }
            }
        );

        // Add to wallet
        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: amount } });

        // Log
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

// POST: Claim interest
app.post("/api/bank/claim/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const bank = await getBank(uid);
        const pending = calculateInterest(bank.invested, bank.last_claim_time);

        if (pending < 1) return res.status(400).json({ success: false, error: "No interest to claim" });

        // Update: advance last_claim_time by cycles
        const now = Math.floor(Date.now() / 1000);
        const cycles = Math.floor((now - bank.last_claim_time) / 86400);
        const newClaimTime = bank.last_claim_time + (cycles * 86400);

        await bankCollection.updateOne(
            { user_id: uid },
            { $set: { last_claim_time: newClaimTime, notified_for_claim: false } }
        );

        // Add to wallet
        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: pending } });

        // Log
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

// POST: Apply for loan
app.post("/api/bank/loan/apply/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const bank = await getBank(uid);
        if (bank.loan_active) return res.status(400).json({ success: false, error: "Loan already active" });

        const principal = 100; // LOAN_PRINCIPAL
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

        // Credit user
        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: principal } });

        // Log
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

// POST: Repay loan
app.post("/api/bank/loan/repay/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const bank = await getBank(uid);
        if (!bank.loan_active) return res.status(400).json({ success: false, error: "No active loan" });

        const due = calculateLoanDue(bank.loan_principal, bank.loan_taken_at);
        const user = await usersCollection.findOne({ user_id: uid });
        if (!user || user.mythopoints < due) return res.status(400).json({ success: false, error: "Insufficient balance" });

        // Deduct
        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: -due } });

        // Clear loan
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

        // Log
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
// 🛍️ STORE API (cstore.py logic)
// ==========================================

// Helper: Generate coupon
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

// POST: Purchase store item
app.post("/api/store/purchase/:userId", async (req, res) => {
    try {
        const uid = parseInt(req.params.userId);
        const { item } = req.body; // 'credits', 'skip_cooldown', 'mystery', 'coupon_10', etc.

        const user = await usersCollection.findOne({ user_id: uid });
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        // Define items and costs
        const items = {
            credits: { cost: 50, name: "5 Search Credits" },
            skip_cooldown: { cost: 50, name: "Skip Cooldown" },
            mystery: { cost: 100, name: "Mystery Box" },
        };
        // Coupons: discount% -> cost mapping
        const couponCosts = { 10: 200, 20: 500, 30: 800, 40: 1000, 50: 1500 };

        let cost = 0;
        let action = null;
        let reward = null;

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
                // Gacha
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
                    result = "🎰 JACKPOT! You won 300 Mythopoints!";
                } else if (outcome === "credits") {
                    await searchLimitCollection.updateOne({ user_id: uid }, { $inc: { credits: 10 } }, { upsert: true });
                    result = "🔑 You found 10 Search Credits!";
                } else if (outcome === "coupon") {
                    const code = await generateCoupon(uid, 15);
                    result = `🎟️ You found a 15% OFF coupon! Code: ${code}`;
                } else {
                    result = "💨 OOF! The box was empty.";
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

        // Check balance
        if (user.mythopoints < cost) return res.status(400).json({ success: false, error: "Insufficient Mythopoints" });

        // Deduct cost
        await usersCollection.updateOne({ user_id: uid }, { $inc: { mythopoints: -cost } });

        // Execute action
        const result = await action();

        // Log spend
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
// 💸 PAYMENT API with IP verification, tax, daily limit
// ==========================================

// Helper: Check daily payment limit
async function canMakePayment(userId) {
    const today = new Date().toISOString().split('T')[0];
    const count = await paymentLimitCollection.countDocuments({
        user_id: userId,
        date: today
    });
    return count < 1; // daily limit = 1
}

// POST /api/payment/send
app.post("/api/payment/send", async (req, res) => {
    try {
        const { senderId, receiverId, amount } = req.body;

        const sender = parseInt(senderId);
        const receiver = parseInt(receiverId);
        const amt = parseInt(amount);

        // Basic validations
        if (!sender || !receiver || !amt) {
            return res.status(400).json({ success: false, error: "Missing fields." });
        }
        if (sender === receiver) {
            return res.status(400).json({ success: false, error: "Cannot send to yourself." });
        }
        if (amt < 200) {
            return res.status(400).json({ success: false, error: "Minimum payment is 200 Mythopoints." });
        }

        // Check daily limit for sender
        const canPay = await canMakePayment(sender);
        if (!canPay) {
            return res.status(400).json({ success: false, error: "Daily payment limit reached (1 per day)." });
        }

        // Get sender and receiver details
        const senderDoc = await usersCollection.findOne({ user_id: sender });
        const receiverDoc = await usersCollection.findOne({ user_id: receiver });
        if (!senderDoc || !receiverDoc) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        // Check IP verification (anti-multiple accounts)
        const senderIpRecord = await ipVerificationCollection.findOne({ userId: sender });
        const receiverIpRecord = await ipVerificationCollection.findOne({ userId: receiver });
        if (!senderIpRecord || !receiverIpRecord) {
            return res.status(400).json({ success: false, error: "Both users must be verified." });
        }
        if (senderIpRecord.ip === receiverIpRecord.ip) {
            return res.status(400).json({ success: false, error: "Same IP detected. Multiple accounts not allowed." });
        }

        // Check balance (sender)
        if (senderDoc.mythopoints < amt) {
            return res.status(400).json({ success: false, error: "Insufficient balance." });
        }

        // Calculate tax (15%) – receiver gets 85%
        const tax = Math.floor(amt * 0.15);
        const receiverAmount = amt - tax;

        // Perform atomic transactions
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                // Deduct from sender
                await usersCollection.updateOne(
                    { user_id: sender },
                    { $inc: { mythopoints: -amt } },
                    { session }
                );
                // Add to receiver
                await usersCollection.updateOne(
                    { user_id: receiver },
                    { $inc: { mythopoints: receiverAmount } },
                    { session }
                );
                // Record payment limit
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
                // Log sender spend
                await mpHistoryCollection.insertOne({
                    user_id: sender,
                    amount: amt,
                    type: "SPENT",
                    reason: `Payment to ${receiver}`,
                    date: new Date()
                }, { session });
                // Log receiver earn
                await mpHistoryCollection.insertOne({
                    user_id: receiver,
                    amount: receiverAmount,
                    type: "EARNED",
                    reason: `Payment from ${sender}`,
                    date: new Date()
                }, { session });
                // Log tax (optional: log to system account)
                await mpHistoryCollection.insertOne({
                    user_id: 0, // system account
                    amount: tax,
                    type: "TAX",
                    reason: `Tax on payment ${sender}->${receiver}`,
                    date: new Date()
                }, { session });
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

// GET /api/users/search?q=...
app.get("/api/users/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, users: [] });

        const query = {
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { first_name: { $regex: q, $options: 'i' } },
                // also allow search by user_id if q is numeric
            ]
        };
        const numericQ = parseInt(q);
        if (!isNaN(numericQ)) {
            query.$or.push({ user_id: numericQ });
        }

        const users = await usersCollection.find(query)
            .limit(10)
            .project({ user_id: 1, username: 1, first_name: 1, mythopoints: 1 })
            .toArray();

        const formatted = users.map(u => ({
            id: u.user_id,
            name: u.first_name || u.username || `User ${u.user_id}`,
            username: u.username || null,
            points: u.mythopoints || 0
        }));

        res.json({ success: true, users: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// MINI APP ROUTE (with AI floating button) – UPDATED WITH NEW TABS
// ==========================================

app.get("/mini/:userId", (req, res) => {
    const userId = req.params.userId;
    // Full Mini App HTML (as provided earlier) but we need to add new tabs: Store & Payment.
    // We'll embed the updated HTML with additional tabs.
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Mytho Mini</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    /* ----- RESET & GLOBAL ----- */
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
      background: #0a0014;
      background-image: radial-gradient(circle at 50% 0%, rgba(101,31,255,0.2) 0%, transparent 60%);
      color: #ffffff;
      min-height: 100vh;
      padding-bottom: 80px;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
    ::-webkit-scrollbar-thumb { background: #d500f9; border-radius: 10px; }

    /* ----- GLASS CARD ----- */
    .glass {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 0.5px solid rgba(255,255,255,0.08);
      border-radius: 22px;
      padding: 16px;
      margin: 12px 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 10px rgba(213,0,249,0.05);
      transition: all 0.3s ease;
    }

    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(10,0,20,0.65);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-bottom: 0.5px solid rgba(255,255,255,0.1);
      padding: 16px;
      text-align: center;
      font-weight: 600;
      font-size: 17px;
      letter-spacing: -0.4px;
      color: #fff;
    }

    .tab-content { display: none; animation: fadeIn 0.3s ease; }
    .tab-content.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

    .tab-bar {
      position: fixed;
      bottom: 0;
      width: 100%;
      background: rgba(15,0,30,0.85);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-top: 0.5px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-around;
      padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 20px)) 0;
      z-index: 100;
      overflow-x: auto;
    }
    .tab-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: rgba(255,255,255,0.5);
      font-size: 10px;
      font-weight: 500;
      transition: 0.2s;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      padding: 0 6px;
      min-width: 56px;
    }
    .tab-btn svg { width: 26px; height: 26px; margin-bottom: 4px; fill: currentColor; }
    .tab-btn.active { color: #ea80fc; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .widget {
      background: rgba(45,10,80,0.4);
      border: 0.5px solid rgba(255,255,255,0.08);
      border-radius: 22px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 10px rgba(213,0,249,0.05);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .widget-full { grid-column: span 2; }
    .widget-icon { font-size: 24px; margin-bottom: 8px; }
    .widget-title { font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .widget-value { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .widget-sub { font-size: 12px; color: #ea80fc; margin-top: 4px; font-weight: 500; }
    .w-premium { border: 0.5px solid rgba(255,214,10,0.3); background: rgba(255,214,10,0.05); }
    .w-premium .widget-value { color: #ffd60a; }
    .w-bank { border: 0.5px solid rgba(48,209,88,0.3); background: rgba(48,209,88,0.05); }
    .w-bank .widget-value { color: #30d158; }

    .profile-hdr {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .profile-pic {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 2px solid #d500f9;
      object-fit: cover;
      background: #1c0a2b;
    }
    .profile-info h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .profile-info p { margin: 4px 0 0 0; font-size: 14px; color: #ea80fc; font-weight: 500; }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      background: rgba(213,0,249,0.2);
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      margin-top: 6px;
    }

    .list-card { background: rgba(45,10,80,0.4); border-radius: 20px; border: 0.5px solid rgba(255,255,255,0.08); overflow: hidden; }
    .list-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 0.5px solid rgba(255,255,255,0.05); }
    .list-item:last-child { border-bottom: none; }
    .item-left p { margin: 0; font-size: 15px; font-weight: 500; }
    .item-left span { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; display: inline-block; }
    .item-right { font-weight: 600; font-size: 16px; }
    .val-pos { color: #30d158; }
    .val-neg { color: #ff453a; }

    .spinner { width: 40px; height: 40px; border: 3px solid rgba(213,0,249,0.2); border-top-color: #d500f9; border-radius: 50%; animation: spin 1s linear infinite; margin: 40px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { text-align: center; color: rgba(255,255,255,0.5); padding: 30px 20px; font-size: 14px; }

    .ai-fab {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #d500f9, #651fff);
      border: none;
      box-shadow: 0 4px 20px rgba(213,0,249,0.6);
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
      0% { box-shadow: 0 4px 20px rgba(213,0,249,0.4); }
      100% { box-shadow: 0 4px 40px rgba(213,0,249,0.9); }
    }

    .ai-chat-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
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
      box-shadow: 0 -10px 40px rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .ai-chat-header {
      padding: 16px 20px;
      background: rgba(10,0,20,0.8);
      backdrop-filter: blur(10px);
      border-bottom: 0.5px solid rgba(255,255,255,0.1);
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
      background: rgba(255,255,255,0.08);
      color: #eee;
      border-bottom-left-radius: 4px;
    }
    .msg.bot b { color: #ea80fc; }
    .ai-chat-footer {
      padding: 12px 16px;
      background: rgba(10,0,20,0.8);
      border-top: 0.5px solid rgba(255,255,255,0.05);
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .ai-chat-footer input {
      flex: 1;
      padding: 10px 14px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #fff;
      font-size: 15px;
      outline: none;
    }
    .ai-chat-footer input::placeholder { color: rgba(255,255,255,0.3); }
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
      background: rgba(255,69,58,0.2) !important;
      color: #ff453a !important;
      border: 1px solid rgba(255,69,58,0.3) !important;
    }
    .typing-indicator {
      align-self: flex-start;
      color: rgba(255,255,255,0.3);
      font-size: 14px;
      padding: 4px 12px;
    }
    @media (max-width: 480px) {
      .ai-chat-panel { height: 90vh; border-radius: 20px 20px 0 0; }
      .ai-fab { bottom: 90px; right: 16px; width: 54px; height: 54px; font-size: 18px; }
    }

    .lb-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 0.5px solid rgba(255,255,255,0.05);
      transition: background 0.2s;
    }
    .lb-item:last-child { border-bottom: none; }
    .lb-rank {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      background: rgba(255,255,255,0.05);
      color: #aaa;
      flex-shrink: 0;
      margin-right: 14px;
    }
    .lb-rank.gold { background: linear-gradient(135deg, #ffd700, #b8860b); color: #fff; box-shadow: 0 0 15px rgba(255,215,0,0.4); }
    .lb-rank.silver { background: linear-gradient(135deg, #c0c0c0, #808080); color: #fff; box-shadow: 0 0 15px rgba(192,192,192,0.3); }
    .lb-rank.bronze { background: linear-gradient(135deg, #cd7f32, #8b5a2b); color: #fff; box-shadow: 0 0 15px rgba(205,127,50,0.3); }
    .lb-rank.self { background: #d500f9; color: #fff; box-shadow: 0 0 15px rgba(213,0,249,0.5); }

    .lb-info { flex: 1; }
    .lb-name { font-weight: 600; font-size: 16px; }
    .lb-name.self-highlight { color: #ea80fc; }
    .lb-name .you-tag { font-size: 11px; background: rgba(213,0,249,0.3); padding: 1px 8px; border-radius: 10px; margin-left: 8px; color: #ea80fc; }
    .lb-pts { font-weight: 600; color: #ea80fc; font-size: 15px; }

    .lb-self-row {
      margin-top: 12px;
      padding: 12px 16px;
      background: rgba(213,0,249,0.08);
      border-radius: 16px;
      border: 1px solid rgba(213,0,249,0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .lb-self-rank { font-weight: 700; color: #fff; }
    .lb-self-pts { font-weight: 700; color: #ffd60a; }

    /* Payment & Store specific */
    .store-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 0.5px solid rgba(255,255,255,0.05);
    }
    .store-item:last-child { border-bottom: none; }
    .store-item button {
      background: linear-gradient(135deg, #d500f9, #651fff);
      border: none;
      padding: 6px 16px;
      border-radius: 30px;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    .store-item button:active { transform: scale(0.95); }
    .search-user-input {
      width: 100%;
      padding: 12px 16px;
      border-radius: 30px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #fff;
      font-size: 16px;
      margin-bottom: 16px;
    }
    .search-user-input::placeholder { color: rgba(255,255,255,0.3); }
    .user-result {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 0.5px solid rgba(255,255,255,0.05);
      cursor: pointer;
    }
    .user-result:active { background: rgba(255,255,255,0.05); }
  </style>
</head>
<body>

  <div class="navbar" id="navTitle">Home</div>

  <!-- TAB: HOME -->
  <div id="tab-home" class="tab-content active">
    <div class="profile-hdr" style="margin: 16px 16px 8px;">
      <img id="ui-dp" class="profile-pic" src="https://via.placeholder.com/150/2d0a50/ea80fc?text=User" alt="DP">
      <div class="profile-info">
        <h1 id="ui-name">Loading...</h1>
        <p id="ui-id">ID: ${userId}</p>
        <div class="badge" id="ui-verified">Checking...</div>
      </div>
    </div>

    <div class="grid-2" style="padding:0 16px;">
      <div class="widget widget-full">
        <div class="widget-title">Wallet Balance</div>
        <div class="widget-value" style="font-size:36px; color:#ea80fc;" id="ui-pts">0</div>
        <div class="widget-sub" id="ui-streak">🔥 0 Day Streak</div>
      </div>
      <div class="widget w-premium">
        <div class="widget-icon">💎</div>
        <div class="widget-title">Premium</div>
        <div class="widget-value" id="ui-prem-status">Free</div>
        <div class="widget-sub" id="ui-prem-days">Upgrade</div>
      </div>
      <div class="widget">
        <div class="widget-icon">🔍</div>
        <div class="widget-title">Search Credits</div>
        <div class="widget-value"><span id="ui-credits" style="color:#0a84ff;">0</span><span style="font-size:16px; color:rgba(255,255,255,0.5)">/5</span></div>
        <div class="widget-sub">Auto-Refill</div>
      </div>
    </div>

    <h3 style="font-size:18px; margin: 12px 16px 8px; font-weight:600;">Lifetime Stats</h3>
    <div class="grid-2" style="padding:0 16px;">
      <div class="widget" style="padding:12px 16px;">
        <div class="widget-title">Total Earned</div>
        <div class="widget-value" style="font-size:20px; color:#30d158;" id="ui-life-earn">0</div>
      </div>
      <div class="widget" style="padding:12px 16px;">
        <div class="widget-title">Total Spent</div>
        <div class="widget-value" style="font-size:20px; color:#ff453a;" id="ui-life-spent">0</div>
      </div>
    </div>
  </div>

  <!-- TAB: BANK -->
  <div id="tab-bank" class="tab-content">
    <div class="glass w-bank" style="margin:16px;">
      <div class="widget-icon">📈</div>
      <div class="widget-title">MythoFund Vault</div>
      <div class="widget-value" id="ui-bank-invest" style="color:#30d158;">0 pts</div>
      <div class="widget-sub">Active Investment</div>
    </div>
    <div class="grid-2" style="padding:0 16px;">
      <div class="widget">
        <div class="widget-title">Pending Yield</div>
        <div class="widget-value" style="color:#ffd60a;" id="ui-bank-yield">+0</div>
        <div class="widget-sub" id="bank-claim-btn" style="color:#ea80fc; cursor:pointer;">Claim</div>
      </div>
      <div class="widget">
        <div class="widget-title">Active Loan</div>
        <div class="widget-value" style="color:#ff453a;" id="ui-bank-loan">0</div>
        <div class="widget-sub" id="ui-loan-status">No Debt</div>
      </div>
    </div>
    <div style="padding:0 16px;">
      <div style="display:flex; gap:8px; margin-top:8px;">
        <input type="number" id="invest-amount" placeholder="Amount" style="flex:1; padding:10px; border-radius:30px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#fff;">
        <button id="invest-btn" style="padding:10px 20px; border-radius:30px; border:none; background:linear-gradient(135deg,#d500f9,#651fff); color:#fff; font-weight:600;">Invest</button>
        <button id="withdraw-btn" style="padding:10px 20px; border-radius:30px; border:none; background:rgba(255,69,58,0.3); color:#ff453a; font-weight:600;">Withdraw</button>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <button id="loan-apply-btn" style="flex:1; padding:10px; border-radius:30px; border:none; background:linear-gradient(135deg,#d500f9,#651fff); color:#fff; font-weight:600;">Apply Loan (100 pts)</button>
        <button id="loan-repay-btn" style="flex:1; padding:10px; border-radius:30px; border:none; background:rgba(255,69,58,0.3); color:#ff453a; font-weight:600;">Repay Loan</button>
      </div>
    </div>
  </div>

  <!-- TAB: STORE -->
  <div id="tab-store" class="tab-content">
    <div class="glass" style="margin:16px;">
      <h3 style="margin-bottom:12px;">🛍️ MythoStore</h3>
      <div id="store-items">
        <div class="store-item">
          <span>🔑 5 Search Credits</span>
          <button onclick="purchase('credits')">50 pts</button>
        </div>
        <div class="store-item">
          <span>⏱️ Skip Cooldown</span>
          <button onclick="purchase('skip_cooldown')">50 pts</button>
        </div>
        <div class="store-item">
          <span>🎁 Mystery Box</span>
          <button onclick="purchase('mystery')">100 pts</button>
        </div>
        <div class="store-item">
          <span>🎟️ 10% OFF Coupon</span>
          <button onclick="purchase('coupon_10')">200 pts</button>
        </div>
        <div class="store-item">
          <span>🎟️ 20% OFF Coupon</span>
          <button onclick="purchase('coupon_20')">500 pts</button>
        </div>
        <div class="store-item">
          <span>🎟️ 30% OFF Coupon</span>
          <button onclick="purchase('coupon_30')">800 pts</button>
        </div>
        <div class="store-item">
          <span>🎟️ 50% OFF Coupon</span>
          <button onclick="purchase('coupon_50')">1500 pts</button>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB: PAYMENT -->
  <div id="tab-payment" class="tab-content">
    <div class="glass" style="margin:16px;">
      <h3 style="margin-bottom:12px;">💸 Send Mythopoints</h3>
      <p style="font-size:13px; color:rgba(255,255,255,0.6);">Min 200 pts | 15% tax | 1 payment/day</p>
      <input type="text" id="search-user" class="search-user-input" placeholder="Search user by name or ID..." />
      <div id="search-results"></div>
      <div id="selected-user" style="display:none; margin:12px 0;">
        <p>Send to: <span id="selected-name"></span> (ID: <span id="selected-id"></span>)</p>
      </div>
      <input type="number" id="payment-amount" placeholder="Amount" style="width:100%; padding:12px; border-radius:30px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#fff; margin-bottom:12px;" />
      <button id="send-payment-btn" style="width:100%; padding:14px; border-radius:30px; border:none; background:linear-gradient(135deg,#d500f9,#651fff); color:#fff; font-weight:600;">Send Payment</button>
      <div id="payment-status" style="margin-top:12px; text-align:center;"></div>
    </div>
  </div>

  <!-- TAB: HISTORY -->
  <div id="tab-history" class="tab-content">
    <div style="padding:0 16px 8px 24px; font-size:13px; color:rgba(255,255,255,0.5); text-transform:uppercase;">Recent Transactions</div>
    <div class="list-card" id="ui-history-list" style="margin:0 16px;">
      <div class="spinner"></div>
    </div>
  </div>

  <!-- TAB: LEADERBOARD -->
  <div id="tab-leaderboard" class="tab-content">
    <div style="padding:0 16px 8px 24px; font-size:13px; color:rgba(255,255,255,0.5);">🏆 MythoPoints Leaderboard</div>
    <div style="padding:0 16px; display:flex; gap:8px; flex-wrap:wrap;">
      <button class="lb-filter active" data-filter="all" style="flex:1; padding:6px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(213,0,249,0.2); color:#fff; font-weight:600;">All-Time</button>
      <button class="lb-filter" data-filter="weekly" style="flex:1; padding:6px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:rgba(255,255,255,0.7);">Weekly</button>
      <button class="lb-filter" data-filter="monthly" style="flex:1; padding:6px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:rgba(255,255,255,0.7);">Monthly</button>
    </div>
    <div id="lb-list" style="margin:12px 16px;">
      <div class="spinner"></div>
    </div>
    <div style="display:flex; justify-content:center; gap:16px; padding:8px 16px;">
      <button id="lb-prev" style="padding:6px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#fff;">⬅️</button>
      <span id="lb-page-info" style="color:rgba(255,255,255,0.5);">Page 1</span>
      <button id="lb-next" style="padding:6px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#fff;">➡️</button>
    </div>
  </div>

  <!-- TAB: PROFILE -->
  <div id="tab-profile" class="tab-content">
    <div class="glass" style="margin:16px;">
      <div class="profile-hdr" style="margin-bottom:16px;">
        <img id="profile-dp" class="profile-pic" src="https://via.placeholder.com/150/2d0a50/ea80fc?text=User" alt="DP">
        <div class="profile-info">
          <h2 id="profile-name">Loading...</h2>
          <p id="profile-id">ID: ${userId}</p>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:0.5px solid rgba(255,255,255,0.05);">
        <span>Mythopoints</span>
        <span id="profile-pts" style="color:#ea80fc;">0</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:0.5px solid rgba(255,255,255,0.05);">
        <span>Streak</span>
        <span id="profile-streak">0</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:12px 0;">
        <span>Verification</span>
        <span id="profile-verified" style="color:#ff453a;">Unverified</span>
      </div>
    </div>
  </div>

  <!-- TAB BAR -->
  <div class="tab-bar">
    <div class="tab-btn active" data-tab="home">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
      <span>Home</span>
    </div>
    <div class="tab-btn" data-tab="bank">
      <svg viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72l5 2.73 5-2.73v3.72z"/></svg>
      <span>Bank</span>
    </div>
    <div class="tab-btn" data-tab="store">
      <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7 14h10l3-8H5.72l-.48-2H3v2h1.22l1.9 7.2L5 14.76c-.66 1.35.34 2.24 2 2.24h10v-2H7c-.54 0-.84-.45-.62-.9L7 14z"/></svg>
      <span>Store</span>
    </div>
    <div class="tab-btn" data-tab="payment">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm0 8h-2v2h2z"/></svg>
      <span>Pay</span>
    </div>
    <div class="tab-btn" data-tab="history">
      <svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
      <span>History</span>
    </div>
    <div class="tab-btn" data-tab="leaderboard">
      <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
      <span>Leaderboard</span>
    </div>
    <div class="tab-btn" data-tab="profile">
      <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      <span>Profile</span>
    </div>
  </div>

  <!-- FLOATING AI BUTTON -->
  <button class="ai-fab" id="aiFab">AI</button>

  <!-- AI CHAT OVERLAY -->
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
      }
    }

    // ─── TAB SWITCHING ───
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = {
      home: document.getElementById('tab-home'),
      bank: document.getElementById('tab-bank'),
      store: document.getElementById('tab-store'),
      payment: document.getElementById('tab-payment'),
      history: document.getElementById('tab-history'),
      leaderboard: document.getElementById('tab-leaderboard'),
      profile: document.getElementById('tab-profile')
    };
    const navTitle = document.getElementById('navTitle');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        Object.keys(tabContents).forEach(key => {
          tabContents[key].classList.toggle('active', key === tab);
        });
        navTitle.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
        tg.HapticFeedback.selectionChanged();
        if (tab === 'bank') loadBankData();
        if (tab === 'leaderboard') loadLeaderboard();
        if (tab === 'history') loadHistory();
        if (tab === 'profile') loadProfile();
        if (tab === 'payment') loadPaymentStatus();
      });
    });

    // ─── LOAD DASHBOARD DATA ───
    async function loadDashboard() {
      try {
        const res = await fetch('/api/ios-dashboard-data/' + userId);
        const data = await res.json();
        if (!data.success) return;
        // Home
        document.getElementById('ui-pts').innerText = data.profile.mythopoints.toLocaleString();
        document.getElementById('ui-streak').innerText = '🔥 ' + data.profile.streak + ' Day Streak';
        const badge = document.getElementById('ui-verified');
        if (data.profile.is_verified) {
          badge.innerText = '✓ Secured Node';
          badge.style.background = 'rgba(48,209,88,0.2)';
          badge.style.color = '#30d158';
        } else {
          badge.innerText = '! Unverified';
          badge.style.background = 'rgba(255,69,58,0.2)';
          badge.style.color = '#ff453a';
        }
        if (data.premium.active) {
          document.getElementById('ui-prem-status').innerText = data.premium.plan;
          document.getElementById('ui-prem-days').innerText = data.premium.daysLeft + ' Days Left';
        } else {
          document.getElementById('ui-prem-status').innerText = 'Free';
          document.getElementById('ui-prem-days').innerText = 'Upgrade';
        }
        document.getElementById('ui-credits').innerText = data.search.credits;
        document.getElementById('ui-life-earn').innerText = data.stats.lifetimeEarned.toLocaleString();
        document.getElementById('ui-life-spent').innerText = data.stats.lifetimeSpent.toLocaleString();
        // Bank tab will be loaded when selected
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
        document.getElementById('ui-bank-invest').innerText = data.invested.toLocaleString() + ' pts';
        document.getElementById('ui-bank-yield').innerText = '+' + data.pendingInterest.toLocaleString();
        if (data.loanActive) {
          document.getElementById('ui-bank-loan').innerText = data.loanDue.toLocaleString();
          document.getElementById('ui-loan-status').innerText = 'Accumulating 10%/day';
        } else {
          document.getElementById('ui-bank-loan').innerText = '0';
          document.getElementById('ui-bank-loan').style.color = '#30d158';
          document.getElementById('ui-loan-status').innerText = 'Eligible for loan';
        }
        // Set claim button
        const claimBtn = document.getElementById('bank-claim-btn');
        if (data.pendingInterest > 0) {
          claimBtn.style.display = 'block';
          claimBtn.innerText = 'Claim +' + data.pendingInterest;
          claimBtn.onclick = () => claimInterest();
        } else {
          claimBtn.style.display = 'none';
        }
      } catch (e) {}
    }

    async function claimInterest() {
      try {
        const res = await fetch('/api/bank/claim/' + userId, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          alert('Claimed ' + data.claimed + ' MythoPoints!');
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
      try {
        const res = await fetch('/api/bank/invest/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          alert(data.message);
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
      try {
        const res = await fetch('/api/bank/withdraw/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          alert(data.message);
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    document.getElementById('loan-apply-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/bank/loan/apply/' + userId, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          alert(data.message);
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    document.getElementById('loan-repay-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/bank/loan/repay/' + userId, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          alert(data.message);
          loadBankData();
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    // ─── STORE ───
    async function purchase(item) {
      try {
        const res = await fetch('/api/store/purchase/' + userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item })
        });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          alert(data.message);
          loadDashboard();
        } else {
          alert(data.error);
        }
      } catch (e) {}
    }
    window.purchase = purchase;

    // ─── PAYMENT ───
    let selectedReceiver = null;

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
            html += \`
              <div class="user-result" onclick="selectUser(\${u.id}, '\${u.name}')">
                <span>\${u.name} \${u.username ? '@' + u.username : ''}</span>
                <span style="color:rgba(255,255,255,0.5);">\${u.points} pts</span>
              </div>
            \`;
          });
          document.getElementById('search-results').innerHTML = html;
        } else {
          document.getElementById('search-results').innerHTML = '<div class="empty">No users found.</div>';
        }
      } catch (e) {}
    });

    function selectUser(id, name) {
      selectedReceiver = id;
      document.getElementById('selected-user').style.display = 'block';
      document.getElementById('selected-name').innerText = name;
      document.getElementById('selected-id').innerText = id;
      document.getElementById('search-results').innerHTML = '';
    }
    window.selectUser = selectUser;

    document.getElementById('send-payment-btn').addEventListener('click', async () => {
      const amount = parseInt(document.getElementById('payment-amount').value);
      if (!selectedReceiver) return alert('Select a receiver first.');
      if (!amount || amount < 200) return alert('Minimum 200 Mythopoints.');
      
      try {
        const res = await fetch('/api/payment/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: userId,
            receiverId: selectedReceiver,
            amount: amount
          })
        });
        const data = await res.json();
        if (data.success) {
          tg.HapticFeedback.notificationOccurred('success');
          alert(data.message);
          loadDashboard();
          loadPaymentStatus();
          document.getElementById('payment-amount').value = '';
          selectedReceiver = null;
          document.getElementById('selected-user').style.display = 'none';
        } else {
          alert(data.error);
        }
      } catch (e) {}
    });

    async function loadPaymentStatus() {
      try {
        const res = await fetch('/api/ios-dashboard-data/' + userId);
        const data = await res.json();
        if (data.success && data.payment) {
          const used = data.payment.usedToday || 0;
          const limit = data.payment.dailyLimit || 1;
          document.getElementById('payment-status').innerHTML = \`Daily payments: \${used}/\${limit}\`;
        }
      } catch (e) {}
    }

    // ─── HISTORY ───
    async function loadHistory() {
      const container = document.getElementById('ui-history-list');
      container.innerHTML = '<div class="spinner"></div>';
      try {
        const res = await fetch('/api/history/' + userId + '?filter=ALL&page=1');
        const data = await res.json();
        if (!data.success || data.history.length === 0) {
          container.innerHTML = '<div class="empty">No transactions found.</div>';
          return;
        }
        container.innerHTML = data.history.map(item => {
          const isEarn = item.type === 'EARNED';
          const sign = isEarn ? '+' : '-';
          const cls = isEarn ? 'val-pos' : 'val-neg';
          const date = new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
          return \`
            <div class="list-item">
              <div class="item-left">
                <p>\${item.reason || item.type}</p>
                <span>\${date}</span>
              </div>
              <div class="item-right \${cls}">\${sign}\${item.amount}</div>
            </div>
          \`;
        }).join('');
      } catch (e) {
        container.innerHTML = '<div class="empty" style="color:#ff453a;">Failed to load history.</div>';
      }
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
          let medal = '';
          if (rank === 1) { rankClass += ' gold'; medal = '🥇'; }
          else if (rank === 2) { rankClass += ' silver'; medal = '🥈'; }
          else if (rank === 3) { rankClass += ' bronze'; medal = '🥉'; }
          const isSelf = u.user_id == userId;
          if (isSelf) rankClass += ' self';
          const nameClass = isSelf ? 'lb-name self-highlight' : 'lb-name';
          const youTag = isSelf ? '<span class="you-tag">You</span>' : '';
          html += \`
            <div class="lb-item" style="\${isSelf ? 'background:rgba(213,0,249,0.08); border-left:3px solid #d500f9;' : ''}">
              <div class="\${rankClass}">\${medal || rank}</div>
              <div class="lb-info">
                <span class="\${nameClass}">\${u.name || 'Unknown'} \${youTag}</span>
              </div>
              <div class="lb-pts">\${u.points} pts</div>
            </div>
          \`;
        });
        if (data.currentUser) {
          const cu = data.currentUser;
          html += \`
            <div class="lb-self-row">
              <span>👤 Your Rank: <strong class="lb-self-rank">#\${cu.rank || 'Unranked'}</strong></span>
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

    // ─── PROFILE ───
    async function loadProfile() {
      try {
        const res = await fetch('/api/ios-profile-data/' + userId);
        const data = await res.json();
        if (data.success) {
          document.getElementById('profile-pts').innerText = data.mythopoints.toLocaleString();
        }
        const dash = await fetch('/api/ios-dashboard-data/' + userId);
        const dashData = await dash.json();
        if (dashData.success) {
          document.getElementById('profile-streak').innerText = dashData.profile.streak;
          const v = document.getElementById('profile-verified');
          if (dashData.profile.is_verified) {
            v.innerText = '✅ Verified';
            v.style.color = '#30d158';
          } else {
            v.innerText = '❌ Unverified';
            v.style.color = '#ff453a';
          }
        }
      } catch (e) {}
    }

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

    // ─── INIT ───
    loadDashboard();
    if (document.getElementById('tab-bank').classList.contains('active')) loadBankData();
    if (document.getElementById('tab-history').classList.contains('active')) loadHistory();
    if (document.getElementById('tab-leaderboard').classList.contains('active')) loadLeaderboard();
    if (document.getElementById('tab-payment').classList.contains('active')) loadPaymentStatus();
  </script>
</body>
</html>
    `);
});

// ==========================================
// LEADERBOARD API (unchanged)
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
                title: getRankTitle(u[pointField] || 0) 
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
