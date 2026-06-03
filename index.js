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

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("mythobot");
    doubleCollection = db.collection("double_points");
    urlShortenerCollection = db.collection("url_shortener");
    maskCollection = db.collection("masked_links");
    console.log("✅ MongoDB connected for Masking & Double Bypass");
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
// 1. THE ENTRY SHIELD (5-Sec Wait)
// ========================
function renderAntiBypassPage(res, targetUrl) {
    const b64Url = Buffer.from(targetUrl).toString('base64');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Verification</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .container { text-align: center; background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%; }
              h2 { margin-bottom: 10px; font-size: 24px; }
              p { color: #94a3b8; font-size: 14px; margin-bottom: 30px; }
              .btn { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: not-allowed; opacity: 0.7; transition: transform 0.2s, background 0.2s; width: 100%; }
              .btn.active { cursor: pointer; opacity: 1; }
              .btn.active:hover { transform: translateY(-2px); background: linear-gradient(135deg, #2563eb, #1e40af); }
          </style>
      </head>
      <body>
      <div class="container">
          <h2>Verify You Are Human</h2>
          <p id="status-text">Please wait <span id="countdown">5</span> seconds to safely proceed.</p>
          <button id="verify-btn" class="btn" disabled>Wait...</button>
      </div>
      <script>
      const encodedUrl = "${b64Url}"; 
      let timeLeft = 5;
      const btn = document.getElementById('verify-btn');
      const statusText = document.getElementById('status-text');
      const countdownSpan = document.getElementById('countdown');

      const timer = setInterval(() => {
          timeLeft--;
          if (countdownSpan) countdownSpan.textContent = timeLeft;
          if (timeLeft <= 0) {
              clearInterval(timer);
              statusText.innerHTML = "Verification complete! Click below.";
              btn.textContent = "Verify & Proceed";
              btn.disabled = false;
              btn.classList.add('active');
          }
      }, 1000);

      btn.addEventListener('click', () => {
          if (!btn.disabled) {
              window.location.href = atob(encodedUrl);
          }
      });
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
// MASKED LINK ROUTES (Entry points from Telegram)
// ========================

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
// DOUBLE BYPASS ROUTES (Exit points back to Telegram)
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

  // Anti-Bypass Referer Check
  const referer = req.get("referer") || "";
  if (!referer.includes("softurl.in")) {
    return res.send(`<div style="text-align:center; padding:50px; font-family:sans-serif; background-color:#0f172a; color:white; height:100vh;"><h1 style="color:#ef4444;">🚫 Bypass Bot Detected!</h1><p>Please click the proper link in Telegram.</p></div>`);
  }

  await doubleCollection.updateOne(
    { user_id: userId, token },
    { $set: { used: true, used_at: new Date() } }
  );

  // Secure exit (no leaked URL)
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
  
  // Anti-Bypass Referer Check
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
app.get("/", (req, res) => {
    res.redirect('https://t.me/MythoSerialBot');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Fully Secured Anti-Bypass Server running on port ${PORT}`);
});
