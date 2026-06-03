import express from "express";
import { MongoClient } from "mongodb";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

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

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("mythobot");
    
    doubleCollection = db.collection("double_points");
    urlShortenerCollection = db.collection("url_shortener");
    maskCollection = db.collection("masked_links");
    searchAdsCollection = db.collection("search_ads"); 
    
    console.log("✅ MongoDB connected for Masking, Double, and Search Ads");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
  }
}
connectDB();

// ========================
// BASE62 ENCODING UTILS
// ========================
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
// 1. THE ENTRY SHIELD (Force Chrome -> 5-Sec Wait -> SoftURL)
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
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
              .container { background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%; }
              h2 { margin-bottom: 10px; font-size: 24px; color: #3b82f6; }
              p { color: #94a3b8; font-size: 15px; margin-bottom: 20px; line-height: 1.5; }
              
              .loader {
                  border: 4px solid rgba(255,255,255,0.1);
                  border-top: 4px solid #3b82f6;
                  border-radius: 50%;
                  width: 50px;
                  height: 50px;
                  animation: spin 1s linear infinite;
                  margin: 0 auto 20px auto;
              }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              
              .manual-box { display: none; background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin-top: 20px; }
          </style>
      </head>
      <body>
      
      <div class="container" id="main-box">
          <div class="loader" id="spinner"></div>
          <h2 id="title-text">Securing Connection</h2>
          <p id="status-text">Checking browser environment...</p>
          
          <div class="manual-box" id="manual-box">
              <b style="color:white; font-size:18px;">How to open:</b><br><br>
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
          statusText.innerHTML = 'Automatically proceeding in <span id="countdown" style="font-weight:bold;color:white;">5</span> seconds...';
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
// 2. THE EXIT SHIELD (Silent Telegram Launcher)
// ========================
function renderSecureFinalPage(res, targetUrl) {
    const b64Url = Buffer.from(targetUrl).toString('base64');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Opening MythoBot...</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .container { text-align: center; background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%; }
              h2 { font-size: 24px; margin-bottom: 10px; color: #10b981; }
              p { color: #94a3b8; font-size: 14px; margin-bottom: 30px; }
              .btn { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: transform 0.2s, background 0.2s; width: 100%; }
              .btn:hover { transform: translateY(-2px); background: linear-gradient(135deg, #059669, #047857); }
          </style>
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

// ========================
// ENTRY POINTS (Dynamic Tokens)
// ========================
app.get("/link/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;
  console.log(`[DEBUG] Attempting lookup -> UserID: ${userId}, Token: ${token}`);
  
  try {
    const adData = await searchAdsCollection.findOne({
      token: token,
      $or: [
        { user_id: parseInt(userId) },
        { user_id: userId.toString() }
      ]
    });
    
    if (!adData) {
      console.log(`[DEBUG] FAILED: No record match for UserID ${userId}, Token ${token}`);
      // Showing the error on screen instead of silent redirect for debugging
      return res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px; background:#0f172a; color:white; height:100vh;">
          <h1 style="color:#ef4444;">Invalid or Expired Link</h1>
          <p>System couldn't find your record in database.</p>
          <a href="https://t.me/MythoSerialBot" style="color:#3b82f6;">Return to Bot</a>
        </div>
      `);
    }
    
    const target = adData.short_url || adData.url; 
    if (!target) {
      return res.send("<h1 style='color:red;'>Error: SoftURL missing in database</h1>");
    }
    
    renderAntiBypassPage(res, target);
    
  } catch (error) {
    console.error("[DEBUG] DB Error:", error);
    res.redirect('https://t.me/MythoSerialBot');
  }
});

// Old Hex Fallback
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

app.get("/api/mask", (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });
  try {
    new URL(url);
    const encodedUrl = base62_encode(url);
    const maskedUrl = `https://${req.hostname}/mask/${encodedUrl}`;
    res.json({ success: true, original_url: url, masked_url: maskedUrl, encoded: encodedUrl });
  } catch (error) {
    res.status(400).json({ error: "Invalid URL format" });
  }
});

app.get("/mask/:encodedUrl", async (req, res) => {
  const { encodedUrl } = req.params;
  try {
    let targetUrl;
    try {
      const padded = encodedUrl.padEnd(encodedUrl.length + (4 - encodedUrl.length % 4) % 4, '=');
      targetUrl = Buffer.from(padded, 'base64').toString('utf-8');
      if (!targetUrl.includes('://')) throw new Error('Not a URL');
    } catch (e) {
      targetUrl = base62_decode(encodedUrl);
    }
    
    new URL(targetUrl);
    
    try {
      if (maskCollection) {
        await maskCollection.insertOne({ encoded: encodedUrl, target: targetUrl, clicked_at: new Date(), ip: req.ip });
      }
    } catch(e) {}
    
    renderAntiBypassPage(res, targetUrl);
  } catch (error) {
    res.redirect('https://t.me/MythoSerialBot');
  }
});

// ========================
// EXIT ROUTES (Double / Bypass Check)
// ========================
app.get("/generate/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = crypto.randomBytes(8).toString("hex");

  await doubleCollection.insertOne({
    token, user_id: userId, used: false, created_at: new Date()
  });

  const protectedLink = `https://${req.hostname}/double/${userId}/${token}`;
  res.send(`
    ✅ Token generated!<br>
    Copy this link and shorten it with Softurl:<br><br>
    <code>${protectedLink}</code>
  `);
});

app.get("/double/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;

  const referer = req.get("referer") || "";
  if (!referer.includes("softurl.in")) {
    return res.send(`<div style="text-align:center; padding:50px; font-family:sans-serif; background-color:#0f172a; color:white; height:100vh;"><h1 style="color:#ef4444;">🚫 Bypass Bot Detected!</h1><p>Please click the proper link in Telegram.</p></div>`);
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
  
  const referer = req.get("referer") || "";
  if (!referer.includes("softurl.in")) {
      return res.send(`<div style="text-align:center; padding:50px; font-family:sans-serif; background-color:#0f172a; color:white; height:100vh;"><h1 style="color:#ef4444;">🚫 Bypass Bot Detected!</h1><p>Nice try! But you must use the original SoftURL link to get your file.</p></div>`);
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
