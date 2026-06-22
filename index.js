import express from "express";
import { MongoClient } from "mongodb";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parsing for API requests (Required for Scratch Card Claiming)
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
    
    console.log("✅ MongoDB connected for Main, Masking, Double, Search Ads, and Scratch Cards");
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
// SCRATCH CARD ROUTES
// ==========================================

// 1. Verify Scratch Ad Route
app.get("/verify-scratch-ad/:userId/:token", async (req, res) => {
    const { userId, token } = req.params;

    if (!isRefererValid(req)) {
        return renderBypassError(res);
    }

    const finalBotLink = `https://t.me/MythoSerialBot?start=scratch_${token}`;
    renderSecureFinalPage(res, finalBotLink);
});

// 2. Serve Web App Render HTML
function renderScratchAppHTML(userId, token, currentPoints, reward) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Scratch & Win</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
            :root {
                --primary: #d500f9;
                --bg-dark: #07000d;
                --panel-bg: rgba(30, 0, 50, 0.6);
            }
            body {
                margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif;
                background: radial-gradient(circle at 50% 50%, #16002b 0%, var(--bg-dark) 100%);
                color: #fff; display: flex; flex-direction: column; align-items: center; min-height: 100vh;
                overflow: hidden; user-select: none;
            }
            .profile-card {
                background: var(--panel-bg); width: 90%; max-width: 400px;
                border-radius: 16px; padding: 15px; margin-top: 20px;
                border: 1px solid rgba(255, 0, 255, 0.2);
                box-shadow: 0 4px 15px rgba(213, 0, 249, 0.2);
                display: flex; align-items: center; gap: 15px;
            }
            .profile-img {
                width: 60px; height: 60px; border-radius: 50%;
                border: 2px solid var(--primary); object-fit: cover;
                background: #333;
            }
            .profile-info h3 { margin: 0 0 5px 0; font-size: 18px; color: #ff66ff; }
            .profile-info p { margin: 0; font-size: 13px; color: #d8b4e2; }
            .stats { margin-top: 5px; font-weight: bold; color: #00e676; }
            
            .scratch-container {
                position: relative; width: 300px; height: 300px; margin-top: 40px;
                border-radius: 20px; box-shadow: 0 0 30px rgba(213, 0, 249, 0.4);
                background: #1a1a1a; overflow: hidden;
            }
            .reward-layer {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; flex-direction: column; justify-content: center; align-items: center;
                background: radial-gradient(circle, #3a005c, #16002b);
            }
            .reward-layer h1 { font-size: 40px; margin: 0; color: #ffd700; text-shadow: 0 0 20px rgba(255,215,0,0.8); }
            .reward-layer p { margin: 5px 0 0 0; font-size: 18px; color: #fff; }
            
            canvas {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; cursor: pointer;
            }
            
            .btn-close {
                margin-top: 30px; background: linear-gradient(135deg, var(--primary), #651fff);
                border: none; padding: 12px 30px; color: white; font-weight: bold;
                border-radius: 8px; font-size: 16px; display: none; cursor: pointer;
            }
        </style>
    </head>
    <body>

        <div class="profile-card">
            <img src="" alt="DP" class="profile-img" id="user-dp">
            <div class="profile-info">
                <h3 id="user-name">Loading...</h3>
                <p id="user-username-id">ID: ...</p>
                <div class="stats">
                    💠 Points: <span id="user-points">${currentPoints}</span><br>
                    🎟️ Available Cards: <span id="card-count">1</span>
                </div>
            </div>
        </div>

        <div class="scratch-container" id="scratch-container">
            <div class="reward-layer">
                <h1>+${reward}</h1>
                <p>MythoPoints</p>
            </div>
            <canvas id="scratchCanvas" width="300" height="300"></canvas>
        </div>

        <button class="btn-close" id="closeBtn" onclick="Telegram.WebApp.close()">Close & Return</button>

        <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            
            // Populate User Data
            const user = tg.initDataUnsafe?.user;
            if (user) {
                document.getElementById('user-name').innerText = user.first_name + (user.last_name ? ' ' + user.last_name : '');
                document.getElementById('user-username-id').innerText = (user.username ? '@' + user.username + ' | ' : '') + 'ID: ' + user.id;
                if (user.photo_url) {
                    document.getElementById('user-dp').src = user.photo_url;
                }
            }

            // Canvas Scratch Logic
            const canvas = document.getElementById('scratchCanvas');
            const ctx = canvas.getContext('2d');
            let isDrawing = false;
            let isRevealed = false;
            
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '24px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('SCRATCH HERE', canvas.width/2, canvas.height/2);

            function getPosition(e) {
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            }

            function scratch(e) {
                if (!isDrawing || isRevealed) return;
                e.preventDefault();
                const pos = getPosition(e);
                
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2); 
                ctx.fill();
                
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
                
                for (let i = 3; i < pixels.length; i += 4) {
                    if (pixels[i] === 0) transparentCount++;
                }
                
                const percent = (transparentCount / (pixels.length / 4)) * 100;
                if (percent > 45 && !isRevealed) {
                    isRevealed = true;
                    canvas.style.transition = 'opacity 0.5s';
                    canvas.style.opacity = '0';
                    setTimeout(() => canvas.style.display = 'none', 500);
                    
                    claimReward();
                }
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
                        tg.HapticFeedback.notificationOccurred('success');
                        const currentPoints = parseInt(document.getElementById('user-points').innerText);
                        document.getElementById('user-points').innerText = currentPoints + data.reward;
                        document.getElementById('card-count').innerText = '0';
                        document.getElementById('closeBtn').style.display = 'block';
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

// 3. Mini App Display
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

// 4. API for claiming the reward
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

    res.json({ success: true, reward: reward });
});

// ========================
// ENTRY POINTS
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

// ========================
// THE ULTIMATE FINISH LINE
// ========================
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

// ========================
// EXIT ROUTES
// ========================
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

// Fallback home route
app.get("*", (req, res) => {
    res.redirect('https://t.me/MythoSerialBot');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Fully Secured Anti-Bypass Server running on port ${PORT}`);
});
