// index.js
import express from "express";
import { MongoClient } from "mongodb";
import crypto from "crypto";
import youtubeDLRouter from "./youtube-dl.js";

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB setup
const MONGO_URI = process.env.DATABASE_URI;
if (!MONGO_URI) {
  console.error("❌ Missing MONGODB_URI in environment variables");
  process.exit(1);
}

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

const client = new MongoClient(MONGO_URI);
let doubleCollection;
let urlShortenerCollection;
let downloadsCollection;
let maskCollection;


async function connectDB() {
  await client.connect();
  const db = client.db("mythobot");
  doubleCollection = db.collection("double_points");
  urlShortenerCollection = db.collection("url_shortener");
  downloadsCollection = db.collection("youtube_downloads");
  maskCollection = db.collection("masked_links");

  console.log("✅ MongoDB connected");
  
}

connectDB();

// Simple Base62 Encoding/Decoding functions
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function base62_encode(data) {
    try {
        // Convert string to bytes
        const buffer = Buffer.from(data, 'utf-8');
        const hex = buffer.toString('hex');
        let num = BigInt('0x' + hex);
        let encoded = '';
        
        // Handle zero case
        if (num === 0n) {
            return '0';
        }
        
        while (num > 0n) {
            const remainder = Number(num % 62n);
            encoded = BASE62_CHARS[remainder] + encoded;
            num = num / 62n;
        }
        
        return encoded;
    } catch (error) {
        console.error("Base62 encode error:", error);
        // Fallback to URL-safe base64
        return Buffer.from(data, 'utf-8')
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}

function base62_decode(encoded) {
    try {
        let num = 0n;
        
        for (let i = 0; i < encoded.length; i++) {
            const char = encoded[i];
            const value = BASE62_CHARS.indexOf(char);
            if (value === -1) {
                throw new Error('Invalid base62 character: ' + char);
            }
            num = num * 62n + BigInt(value);
        }
        
        // Convert BigInt to hex string
        let hex = num.toString(16);
        // Ensure even length for Buffer
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }
        
        const buffer = Buffer.from(hex, 'hex');
        return buffer.toString('utf-8');
    } catch (error) {
        console.error("Base62 decode error:", error);
        // Fallback to URL-safe base64 decode
        let padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padding = 4 - (padded.length % 4);
        if (padding !== 4) {
            padded += '='.repeat(padding);
        }
        return Buffer.from(padded, 'base64').toString('utf-8');
    }
}



// 🔹 URL Masking Endpoint (Hides shortxlink URLs)
app.get("/mask/:encodedUrl", async (req, res) => {
  const { encodedUrl } = req.params;
  
  try {
    // Decode the base62 encoded URL
    const targetUrl = base62_decode(encodedUrl);
    
    // Validate it's a proper URL
    new URL(targetUrl);
    
    console.log(`🔗 Masked redirect: ${targetUrl.substring(0, 80)}...`);
    
    // Simple tracking (optional)
    const maskedCollection = client.db("mythobot").collection("masked_links");
    await maskedCollection.insertOne({
      encoded: encodedUrl,
      target: targetUrl,
      clicked_at: new Date(),
      ip: req.ip
    });
    
    // Show loading page for 1 second then redirect
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="1;url=${targetUrl}">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .loader {
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <h2>🔗 Opening Link...</h2>
        <div class="loader"></div>
        <p>Redirecting to destination...</p>
        <p style="font-size: 12px; margin-top: 20px; opacity: 0.8;">
          If not redirected, <a href="${targetUrl}" style="color: #ffcc00;">click here</a>
        </p>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error("❌ Mask URL error:", error.message);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Link</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
        </style>
      </head>
      <body>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
          <h2 style="color: #dc2626;">❌ Invalid Link</h2>
          <p>This link appears to be corrupted or expired.</p>
          <a href="https://t.me/MythoSerialBot" style="
            display: inline-block;
            background: #0088cc;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 20px;
          ">🤖 Go to MythoBot</a>
        </div>
      </body>
      </html>
    `);
  }
});

// 🔹 Simple API to generate masked URLs (for Python bot)
app.get("/api/mask", (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }
  
  try {
    new URL(url); // Validate URL
    
    // Encode the URL using base62
    const encodedUrl = base62_encode(url);
    
    // Create masked URL
    const maskedUrl = `https://${req.hostname}/mask/${encodedUrl}`;
    
    res.json({
      success: true,
      original_url: url,
      masked_url: maskedUrl,
      encoded: encodedUrl
    });
    
  } catch (error) {
    res.status(400).json({ error: "Invalid URL format" });
  }
});


// 🔹 Test Telegram Notification
app.get("/test-notification", async (req, res) => {
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

// 🔹 Calculate discounted price with MythoPoints
function calculateDiscountedPrice(originalPrice, mythoPointsApplied = false) {
  if (mythoPointsApplied) {
    const discount = originalPrice * 0.3; // 30% discount
    return Math.max(1, Math.round(originalPrice - discount)); // Minimum ₹1
  }
  return originalPrice;
}

// 🔹 Generate a token and return protected link
app.get("/generate/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = crypto.randomBytes(8).toString("hex");

  await doubleCollection.insertOne({
    token,
    user_id: userId,
    used: false,
    created_at: new Date()
  });

  const protectedLink = `https://${req.hostname}/double/${userId}/${token}`;
  res.send(`
    ✅ Token generated!<br>
    Copy this link and shorten it with Softurl:<br><br>
    <code>${protectedLink}</code>
  `);
});

// 🔹 Validate and redirect for double points
app.get("/double/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;

  console.log(`--- incoming /double request for user=${userId} token=${token} ---`);
  console.log("referer:", req.get("referer"));
  console.log("user-agent:", req.get("user-agent"));

  // Check referer (must come from softurl.in)
  const referer = req.get("referer") || "";
  if (!referer.includes("softurl.in")) {
    // Roast message for double points bypass
    const roastMessages = [
      "🚫 Oops! Trying to double points without SoftURL? Even my grandma follows links better!",
      "🤡 Nice try, points pirate! But this isn't a shortcut to free MythoPoints!",
      "🎯 Bypass detected! Your hacking skills need more practice, padawan!",
      "🔐 Awww, trying to skip the line? The points system feels offended!",
      "🧐 I see what you did there! Too bad I see everything!"
    ];
    const randomRoast = roastMessages[Math.floor(Math.random() * roastMessages.length)];
    
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bypass Detected! 🚫</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&display=swap');
          body { 
            font-family: 'Comic Neue', cursive; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);
            color: white;
            text-align: center;
          }
          .roast-container {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255,255,255,0.2);
            margin: 20px 0;
          }
          .roast-message {
            font-size: 24px;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .emoji {
            font-size: 50px;
            margin: 10px;
          }
        </style>
      </head>
      <body>
        <div class="roast-container">
          <div class="emoji">🚫🎯🤡</div>
          <div class="roast-message">"${randomRoast}"</div>
          <div class="emoji">🔐🚷🕵️‍♂️</div>
          <p>Use the proper SoftURL link to double your MythoPoints!</p>
          <a href="https://t.me/MythoSerialBot" style="
            display: inline-block;
            background: white;
            color: #ff6b6b;
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            margin-top: 20px;
            font-weight: bold;
          ">🤖 Go To MythoBot</a>
        </div>
      </body>
      </html>
    `);
  }

  // Mark token as used
  await doubleCollection.updateOne(
    { user_id: userId, token },
    { $set: { used: true, used_at: new Date() } }
  );

  // Redirect to bot deep link
  const botUsername = "MythoSerialBot";
  const deepLink = `https://t.me/${botUsername}?start=double_${userId}_${token}`;

  res.redirect(deepLink);
});

// 🔹 Updated Bypass protection for URL shortener
app.get("/Bypass/:userId/:token", async (req, res) => {
    const { userId, token } = req.params;
    const { t } = req.query;
    
    console.log(`--- incoming /Bypass request for user=${userId} ---`);
    console.log("token:", token);
    console.log("encoded target (t):", t);
    console.log("referer:", req.get("referer"));
    console.log("user-agent:", req.get("user-agent"));
    console.log("ip:", req.ip);
    
    // Check if token exists in database first
    let dbRecord = null;
    try {
        dbRecord = await urlShortenerCollection.findOne({ 
            token: token,
            creator_id: parseInt(userId) 
        });
        console.log("Database record found:", dbRecord ? "YES" : "NO");
    } catch (dbError) {
        console.error("Database error:", dbError);
    }
    
    // If database record exists, use that URL (direct access allowed)
    if (dbRecord) {
        console.log("Using URL from database:", dbRecord.target_url);
        
        // Increment click count
        await urlShortenerCollection.updateOne(
            { token: token },
            { $inc: { clicks: 1 } }
        );
        
        // Add to access logs
        await urlShortenerCollection.updateOne(
            { token: token },
            {
                $push: {
                    access_logs: {
                        accessed_at: new Date(),
                        ip: req.ip,
                        user_agent: req.get("user-agent"),
                        referer: req.get("referer"),
                        via_db: true
                    }
                }
            }
        );
        
        // Redirect to target URL
        return res.redirect(dbRecord.target_url);
    }
    
    // If no database record but we have encoded parameter
    if (t) {
        try {
            console.log("Decoding target from parameter...");
            
            let decodedTarget = null;
            let decodeMethod = "";
            let decodeError = null;
            
            // Method 1: Try base62 decode
            try {
                decodedTarget = base62_decode(t);
                new URL(decodedTarget);
                decodeMethod = "base62";
                console.log("Successfully decoded via base62:", decodedTarget.substring(0, 100) + (decodedTarget.length > 100 ? "..." : ""));
            } catch (e1) {
                decodeError = e1;
                console.log("Base62 decode failed:", e1.message);
                
                // Method 2: Try legacy URL decode
                try {
                    decodedTarget = decodeURIComponent(t);
                    new URL(decodedTarget);
                    decodeMethod = "legacy_url";
                    console.log("Successfully decoded via legacy URL decode:", decodedTarget.substring(0, 100) + (decodedTarget.length > 100 ? "..." : ""));
                } catch (e2) {
                    decodeError = e2;
                    console.log("Legacy URL decode also failed:", e2.message);
                    
                    // Method 3: Try direct if it looks like a URL
                    try {
                        if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('t.me/') || t.startsWith('tg://')) {
                            decodedTarget = t;
                            new URL(decodedTarget);
                            decodeMethod = "direct";
                            console.log("Using direct URL:", decodedTarget.substring(0, 100) + (decodedTarget.length > 100 ? "..." : ""));
                        } else {
                            throw new Error("Not a valid URL format");
                        }
                    } catch (e3) {
                        decodeError = e3;
                        console.log("Direct URL also failed:", e3.message);
                        throw new Error(`All decode methods failed. Last error: ${decodeError.message}`);
                    }
                }
            }
            
            // Validate URL
            new URL(decodedTarget);
            
            // Store in database for future use
            await urlShortenerCollection.insertOne({
                token: token,
                creator_id: parseInt(userId),
                target_url: decodedTarget,
                encoded_target: t,
                decode_method: decodeMethod,
                created_at: new Date(),
                clicks: 1,
                access_logs: [{
                    accessed_at: new Date(),
                    ip: req.ip,
                    user_agent: req.get("user-agent"),
                    referer: req.get("referer"),
                    via_param: true,
                    decode_method: decodeMethod
                }]
            });
            
            console.log(`✅ Redirecting user ${userId} to target URL (via ${decodeMethod})`);
            return res.redirect(decodedTarget);
            
        } catch (error) {
            console.error("Final decoding/validation error:", error.message);
            
            // Log the failed attempt
            await urlShortenerCollection.insertOne({
                token: token,
                creator_id: parseInt(userId),
                encoded_target: t,
                decode_method: "failed",
                created_at: new Date(),
                clicks: 0,
                error: error.message,
                access_logs: [{
                    accessed_at: new Date(),
                    ip: req.ip,
                    user_agent: req.get("user-agent"),
                    referer: req.get("referer"),
                    error: error.message
                }]
            });
            
            // Show error page
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invalid Link - MythoBot</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            max-width: 600px; 
                            margin: 50px auto; 
                            padding: 20px; 
                            text-align: center; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .error-container { 
                            background: rgba(255,255,255,0.1);
                            padding: 30px;
                            border-radius: 15px;
                            backdrop-filter: blur(10px);
                            border: 1px solid rgba(255,255,255,0.2);
                            margin: 20px 0;
                        }
                        .info-box { 
                            background: rgba(0,0,0,0.2); 
                            padding: 15px; 
                            border-radius: 8px; 
                            margin: 15px 0; 
                            font-family: monospace; 
                            text-align: left;
                            overflow-wrap: break-word;
                        }
                        .btn {
                            display: inline-block;
                            background: #8b5cf6;
                            color: white;
                            padding: 12px 24px;
                            border-radius: 25px;
                            text-decoration: none;
                            margin-top: 20px;
                            font-weight: bold;
                            transition: transform 0.3s;
                        }
                        .btn:hover {
                            transform: scale(1.05);
                            background: #7c3aed;
                        }
                        .emoji {
                            font-size: 50px;
                            margin: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="emoji">🔗❌</div>
                    <h1>Invalid or Corrupted Link</h1>
                    
                    <div class="error-container">
                        <h3>⚠️ Unable to Process Link</h3>
                        <p>The link appears to be corrupted or uses an unsupported encoding format.</p>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Please regenerate the link from the Telegram bot.</p>
                    </div>
                    
                    <div class="info-box">
                        <p><strong>Debug Information:</strong></p>
                        <p><strong>Token:</strong> ${token}</p>
                        <p><strong>User ID:</strong> ${userId}</p>
                        <p><strong>Encoded String:</strong> ${t.substring(0, 100)}${t.length > 100 ? '...' : ''}</p>
                        <p><strong>Length:</strong> ${t.length} characters</p>
                        <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
                    </div>
                    
                    <a href="https://t.me/MythoSerialBot" class="btn">
                        <span style="vertical-align: middle;">🤖 Go To MythoBot</span>
                    </a>
                    
                    <div style="margin-top: 30px; font-size: 12px; color: rgba(255,255,255,0.7);">
                        <p>If this error persists, contact @Sandip10x on Telegram</p>
                    </div>
                </body>
                </html>
            `);
        }
    }
    
    // No token in DB and no encoded parameter - show info page
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MythoBot URL Bypass Protection</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
          }
          .info { 
            background: rgba(255,255,255,0.1); 
            padding: 20px; 
            border-radius: 15px; 
            margin: 20px 0; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
          }
          code { 
            background: rgba(0,0,0,0.3); 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: monospace;
          }
          .btn {
            display: inline-block;
            background: #8b5cf6;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            margin-top: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>🛡️ MythoBot URL Bypass Protection</h1>
        
        <div class="info">
          <h3>📊 Request Information:</h3>
          <p><strong>User ID:</strong> <code>${userId}</code></p>
          <p><strong>Token:</strong> <code>${token}</code></p>
          <p><strong>Encoded Target:</strong> <code>${t || 'Not provided'}</code></p>
          <p><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
          <p><strong>IP Address:</strong> ${req.ip}</p>
          <p><strong>Status:</strong> 
            ${t ? '<span style="color: orange;">MISSING_DB_RECORD</span> ⚠️' : '<span style="color: red;">NO_TARGET_PARAMETER</span> ❌'}
          </p>
        </div>
        
        ${t ? `
        <div class="info" style="background: rgba(255,165,0,0.2);">
          <h3>❌ Error Details:</h3>
          <p>This link appears to be corrupted or incomplete.</p>
          <p>Please regenerate the link from the bot.</p>
        </div>
        ` : `
        <div class="info">
          <h3>ℹ️ Usage Information:</h3>
          <p>This endpoint requires a target URL parameter.</p>
          <p>Proper format: <code>/Bypass/&lt;userId&gt;/&lt;token&gt;?t=&lt;encoded_url&gt;</code></p>
        </div>
        `}
        
        <a href="https://t.me/MythoSerialBot" class="btn">🤖 Go to MythoBot</a>
      </body>
      </html>
    `);
});

// 🔹 URL Shortener API endpoint (for bot to generate links)
app.get("/shorten", async (req, res) => {
  const { url, userId } = req.query;
  
  if (!url || !userId) {
    return res.status(400).json({
      success: false,
      error: "Missing url or userId parameters"
    });
  }
  
  try {
    // Validate URL
    new URL(url);
    
    // Generate token for the URL
    const token = crypto.randomBytes(8).toString("hex");
    
    // Encode URL using base62
    const encodedUrl = base62_encode(url);
    
    // Generate bypass URL with base62 encoded parameter
    const bypassUrl = `https://${req.hostname}/Bypass/${userId}/${token}?t=${encodedUrl}`;
    
    // Store in database
    await urlShortenerCollection.insertOne({
      token: token,
      creator_id: parseInt(userId),
      target_url: url,
      encoded_target: encodedUrl,
      created_at: new Date(),
      clicks: 0,
      access_logs: []
    });
    
    res.json({
      success: true,
      original_url: url,
      bypass_url: bypassUrl,
      encoded_target: encodedUrl,
      token: token,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Shorten error:", error);
    res.status(400).json({
      success: false,
      error: "Invalid URL format"
    });
  }
});

// 🔹 Get URL access statistics
app.get("/stats/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const stats = await urlShortenerCollection
      .find({ creator_id: parseInt(userId) })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    
    res.json({
      success: true,
      user_id: userId,
      total_links: stats.length,
      total_clicks: stats.reduce((sum, item) => sum + (item.clicks || 0), 0),
      links: stats.map(item => ({
        token: item.token,
        target_url: item.target_url,
        encoded_target: item.encoded_target,
        created_at: item.created_at,
        clicks: item.clicks || 0,
        last_access: item.access_logs?.[0]?.accessed_at || null
      }))
    });
    
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
});

// 🔹 Enhanced Payment Page with MythoPoints Discount
app.get("/payment", (req, res) => {
  const { amount, upi, channel, admin, mythopoints } = req.query;
  
  // Default values if not provided
  const baseAmount = amount || 49;
  const upiId = upi || "sandip10x@fam";
  const channelName = channel || "MythoBot Premium";
  const adminUsername = admin || "MythoSerialBot";
  const mythoPointsApplied = mythopoints === "true";

  // Calculate discounted price
  const finalAmount = calculateDiscountedPrice(parseInt(baseAmount), mythoPointsApplied);
  const originalAmount = parseInt(baseAmount);
  const discountAmount = originalAmount - finalAmount;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MythoBot Premium Access</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <link rel="icon" type="image/png" href="https://i.postimg.cc/Y0MsZM32/favicon.jpg">
        <style>
            .loader { border: 4px solid #f3f3f3; border-radius: 50%; border-top: 4px solid #8b5cf6; width: 40px; height: 40px; animation: spin 1.5s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; -webkit-user-select: none; -ms-user-select: none; user-select: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .mytho-glow { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
            .upi-app { transition: all 0.3s ease; }
            .upi-app:hover { transform: scale(1.05); }
            .discount-badge { background: linear-gradient(135deg, #10b981, #059669); }
            .mythopoints-active { border: 3px solid #f59e0b; box-shadow: 0 0 20px rgba(245, 158, 11, 0.5); }
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
        <main class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden mytho-glow ${mythoPointsApplied ? 'mythopoints-active' : ''}">
            
            <!-- Header Section -->
            <div class="p-8 text-center border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div class="flex justify-center mb-4">
                    <i class="fa-solid fa-robot fa-3x text-white"></i>
                </div>
                <h1 class="text-2xl font-bold">MythoBot Premium Access</h1>
                <p class="text-purple-200 mt-2">Unlock Exclusive Features & Double Points</p>
                
                ${mythoPointsApplied ? `
                <div class="discount-badge inline-flex items-center px-4 py-2 rounded-full text-white font-bold mt-3">
                    <i class="fa-solid fa-star mr-2"></i>
                    30% MythoPoints Discount Applied!
                </div>
                ` : ''}
            </div>

            <!-- Payment Details Section -->
            <div class="p-6 sm:p-8 text-center">
                ${mythoPointsApplied ? `
                <div class="flex justify-center items-center gap-4 mb-4">
                    <span class="text-2xl text-slate-400 line-through">₹${originalAmount}</span>
                    <i class="fa-solid fa-arrow-right text-slate-400"></i>
                    <span class="text-5xl font-extrabold text-green-600">₹${finalAmount}</span>
                </div>
                <p class="text-sm text-green-600 font-bold mb-2">
                    🎉 You saved ₹${discountAmount} with MythoPoints!
                </p>
                ` : `
                <p class="text-5xl font-extrabold text-purple-600 my-2">₹${finalAmount}</p>
                `}
                
                <p class="text-xs text-slate-500 mb-6">Unique amount for your transaction</p>
                
                <div id="qr-code-container" class="flex justify-center items-center h-52 w-52 mx-auto bg-slate-50 rounded-lg p-2 border-2 border-dashed border-purple-200">
                    <div id="loader" class="loader"></div>
                </div>
                <p class="text-sm text-slate-600 mt-4 font-semibold">Scan QR to pay via any UPI App</p>

                <!-- MythoPoints Info -->
                ${!mythoPointsApplied ? `
                <div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div class="flex items-center justify-center gap-2">
                        <i class="fa-solid fa-coins text-amber-600"></i>
                        <span class="text-sm text-amber-800 font-semibold">
                            Have MythoPoints? Get 30% discount!
                        </span>
                    </div>
                    <a href="/payment?amount=${baseAmount}&upi=${upiId}&channel=${encodeURIComponent(channelName)}&admin=${adminUsername}&mythopoints=true" 
                       class="inline-block mt-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-all">
                       Apply 30% MythoPoints Discount
                    </a>
                </div>
                ` : ''}

                <!-- UPI Apps Direct Links -->
                <div class="mt-6">
                    <p class="text-sm font-semibold text-slate-600 mb-3">Or open directly in:</p>
                    <div class="grid grid-cols-4 gap-3 mb-4" id="upi-apps-container">
                        <!-- UPI apps will be dynamically added here -->
                    </div>
                </div>

                <div class="flex items-center my-6">
                    <hr class="w-full border-slate-200"><span class="px-2 text-xs font-medium text-slate-400">OR</span><hr class="w-full border-slate-200">
                </div>

                <p class="text-sm text-slate-600 font-semibold mb-2">Copy UPI ID</p>
                <div class="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <span class="font-mono text-slate-700 text-lg break-all" id="upi-id-text">${upiId}</span>
                    <button id="copy-button" class="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-purple-700 transition-all flex-shrink-0 w-28">
                        <span class="copy-text-span"><i class="fa-regular fa-copy mr-2"></i>Copy</span>
                    </button>
                </div>
            </div>
            
            <!-- Instructions Section -->
            <div class="bg-purple-50 p-6 sm:p-8">
                <h3 class="text-lg font-bold text-slate-800 text-center">What happens next?</h3>
                <p class="text-slate-600 text-center mt-2 text-sm">After successful payment, send screenshot to @${adminUsername} on Telegram to activate your premium features.</p>
                
                <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p class="text-xs text-yellow-700 text-center">
                        <i class="fa-solid fa-shield-alt mr-1"></i>
                        <strong>Secure Payment:</strong> Your transaction is protected
                    </p>
                </div>

                <a href="https://t.me/${adminUsername}" class="mt-6 w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 shadow-lg">
                    <i class="fa-brands fa-telegram fa-lg"></i>
                    <span>Contact @${adminUsername}</span>
                </a>
            </div>
        </main>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const loader = document.getElementById('loader');
                const qrContainer = document.getElementById('qr-code-container');
                const upiIdElement = document.getElementById('upi-id-text');
                const copyButton = document.getElementById('copy-button');
                const copySpan = copyButton.querySelector('.copy-text-span');
                const originalCopyHTML = copySpan.innerHTML;
                const upiAppsContainer = document.getElementById('upi-apps-container');

                // Use the final amount from server calculation
                const finalAmount = ${finalAmount};
                
                // Generate UPI link
                const upiLink = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR\`;
                const qrApiUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent(upiLink)}&qzone=1\`;
                
                // Load QR Code
                const qrImage = new Image();
                qrImage.src = qrApiUrl;
                qrImage.alt = 'Scan to Pay';
                qrImage.className = 'rounded-lg';
                qrImage.onload = () => { 
                    if (loader) loader.style.display = 'none';
                    qrContainer.appendChild(qrImage);
                };

                qrImage.onerror = () => {
                    if (loader) loader.style.display = 'none';
                    qrContainer.innerHTML = '<p class="text-red-500 text-sm">QR Code failed to load</p>';
                };

                // UPI Apps Configuration
                const upiApps = [
                    {
                        name: "GPay",
                        package: "com.google.android.apps.nbu.paisa.user",
                        icon: "fa-brands fa-google-pay",
                        color: "bg-gradient-to-r from-blue-500 to-purple-600"
                    },
                    {
                        name: "Paytm",
                        package: "net.one97.paytm",
                        icon: "fa-solid fa-mobile-screen-button",
                        color: "bg-gradient-to-r from-blue-600 to-blue-800"
                    },
                    {
                        name: "PhonePe",
                        package: "com.phonepe.app",
                        icon: "fa-solid fa-phone",
                        color: "bg-gradient-to-r from-purple-600 to-purple-800"
                    },
                    {
                        name: "BHIM",
                        package: "in.org.npci.upiapp",
                        icon: "fa-solid fa-indian-rupee-sign",
                        color: "bg-gradient-to-r from-green-600 to-green-800"
                    },
                    {
                        name: "Amazon Pay",
                        package: "in.amazon.mShop.android.shopping",
                        icon: "fa-brands fa-amazon",
                        color: "bg-gradient-to-r from-yellow-500 to-orange-500"
                    },
                    {
                        name: "WhatsApp",
                        package: "com.whatsapp",
                        icon: "fa-brands fa-whatsapp",
                        color: "bg-gradient-to-r from-green-500 to-green-600"
                    },
                    {
                        name: "Cred",
                        package: "com.dreamplug.androidapp",
                        icon: "fa-solid fa-gem",
                        color: "bg-gradient-to-r from-purple-700 to-purple-900"
                    },
                    {
                        name: "Any UPI",
                        package: "",
                        icon: "fa-solid fa-wallet",
                        color: "bg-gradient-to-r from-gray-600 to-gray-800"
                    }
                ];

                // Create UPI App buttons
                upiApps.forEach(app => {
                    const appButton = document.createElement('button');
                    appButton.className = \`upi-app \${app.color} text-white rounded-lg p-3 flex flex-col items-center justify-center\`;
                    appButton.innerHTML = \`
                        <i class="\${app.icon} text-xl mb-1"></i>
                        <span class="text-xs font-medium">\${app.name}</span>
                    \`;
                    
                    appButton.onclick = () => {
                        if (app.package) {
                            // Try to open in app first, then fallback to UPI link
                            const intentUrl = \`intent://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR#Intent;package=\${app.package};scheme=upi;end;\`;
                            const upiUrl = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR\`;
                            
                            // Try app intent first
                            window.location.href = intentUrl;
                            
                            // Fallback after delay
                            setTimeout(() => {
                                window.location.href = upiUrl;
                            }, 500);
                        } else {
                            // Direct UPI link for "Any UPI"
                            window.location.href = upiLink;
                        }
                    };
                    
                    upiAppsContainer.appendChild(appButton);
                });

                // Copy UPI ID functionality
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(upiIdElement.textContent).then(() => {
                        copySpan.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Copied!';
                        copyButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
                        copyButton.classList.add('bg-green-600');
                        setTimeout(() => {
                            copySpan.innerHTML = originalCopyHTML;
                            copyButton.classList.remove('bg-green-600');
                            copyButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
                        }, 2000);
                    }).catch(() => {
                        copySpan.innerHTML = '<i class="fa-solid fa-xmark mr-2"></i>Failed!';
                        setTimeout(() => {
                            copySpan.innerHTML = originalCopyHTML;
                        }, 2000);
                    });
                });
            });
        </script>
        
        <script>
            // Security features
            document.addEventListener('DOMContentLoaded', function() {
                // Disable Right-Click Context Menu
                document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                });

                // Disable Keyboard Shortcuts
                document.addEventListener('keydown', function(e) {
                    if (e.ctrlKey && (e.key === 'c' || e.key === 'u')) {
                        e.preventDefault();
                    }
                    if (e.key === 'F12') {
                        e.preventDefault();
                    }
                });

                // Disable Dragging
                document.addEventListener('dragstart', function(e) {
                    e.preventDefault();
                });
            });
        </script>
    </body>
    </html>
  `);
});

// 🔹 Enhanced Premium Payment with MythoPoints Discount Button
app.get("/premium-payment", async (req, res) => {
  const { user_id, plan, duration, amount, upi, admin, mythopoints } = req.query;
  
  // Validate required parameters
  if (!user_id || !plan) {
    return res.status(400).send("Missing user_id or plan parameters");
  }

  // Plan configurations
  const plans = {
    'silver': { default_amount: 79, default_duration: 28, name: 'Silver Plan' },
    'gold': { default_amount: 149, default_duration: 30, name: 'Gold Plan' }
  };

  const selectedPlan = plans[plan] || plans['silver'];
  const originalAmount = amount || selectedPlan.default_amount;
  const mythoPointsApplied = mythopoints === "true";
  
  // Apply 30% discount if MythoPoints are used
  const finalAmount = calculateDiscountedPrice(parseInt(originalAmount), mythoPointsApplied);
  const discountAmount = originalAmount - finalAmount;
  
  const finalDuration = duration || selectedPlan.default_duration;
  const upiId = upi || "sandip10x@fam";
  const adminUsername = admin || "MythoSerialBot";
  const planName = selectedPlan.name;

  // Generate payment token
  const paymentToken = crypto.randomBytes(16).toString('hex');
  
  // Store payment session in database
  const paymentCollection = client.db("mythobot").collection("payment_sessions");
  await paymentCollection.insertOne({
    payment_token: paymentToken,
    user_id: parseInt(user_id),
    plan: plan,
    original_amount: parseInt(originalAmount),
    final_amount: finalAmount,
    mythopoints_applied: mythoPointsApplied,
    discount_amount: discountAmount,
    duration: parseInt(finalDuration),
    status: 'pending',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000)
  });

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MythoBot ${planName} Payment</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <style>
            .loader { border: 4px solid #f3f3f3; border-radius: 50%; border-top: 4px solid #8b5cf6; width: 40px; height: 40px; animation: spin 1.5s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .mytho-glow { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
            .upi-app { transition: all 0.3s ease; }
            .upi-app:hover { transform: scale(1.05); }
            .status-check { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 10px; margin: 10px 0; }
            .discount-badge { background: linear-gradient(135deg, #10b981, #059669); }
            .mythopoints-active { border: 3px solid #f59e0b; box-shadow: 0 0 20px rgba(245, 158, 11, 0.5); }
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
        <main class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden mytho-glow ${mythoPointsApplied ? 'mythopoints-active' : ''}">
            
            <!-- Header Section -->
            <div class="p-6 text-center border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <h1 class="text-2xl font-bold">${planName}</h1>
                <p class="text-purple-200 mt-2">Automatic Activation • ${finalDuration} Days</p>
                
                ${mythoPointsApplied ? `
                <div class="discount-badge inline-flex items-center px-4 py-2 rounded-full text-white font-bold mt-3">
                    <i class="fa-solid fa-star mr-2"></i>
                    30% MythoPoints Discount Applied!
                </div>
                ` : ''}
            </div>

            <!-- Payment Details -->
            <div class="p-6 text-center">
                ${mythoPointsApplied ? `
                <div class="flex justify-center items-center gap-4 mb-4">
                    <span class="text-2xl text-slate-400 line-through">₹${originalAmount}</span>
                    <i class="fa-solid fa-arrow-right text-slate-400"></i>
                    <span class="text-5xl font-extrabold text-green-600">₹${finalAmount}</span>
                </div>
                <p class="text-sm text-green-600 font-bold mb-2">
                    🎉 You saved ₹${discountAmount} with MythoPoints!
                </p>
                ` : `
                <p class="text-5xl font-extrabold text-purple-600 my-2">₹${finalAmount}</p>
                `}
                
                <p class="text-sm text-slate-600">User ID: <code>${user_id}</code></p>
                
                <!-- MythoPoints Discount Button -->
                ${!mythoPointsApplied ? `
                <div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div class="flex items-center justify-center gap-2">
                        <i class="fa-solid fa-coins text-amber-600"></i>
                        <span class="text-sm text-amber-800 font-semibold">
                            Have MythoPoints? Get 30% discount!
                        </span>
                    </div>
                    <a href="/premium-payment?user_id=${user_id}&plan=${plan}&amount=${originalAmount}&duration=${finalDuration}&upi=${upiId}&admin=${adminUsername}&mythopoints=true" 
                       class="inline-block mt-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-all">
                       Apply 30% MythoPoints Discount
                    </a>
                </div>
                ` : ''}
                
                <div id="qr-code-container" class="flex justify-center items-center h-52 w-52 mx-auto bg-slate-50 rounded-lg p-2 border-2 border-dashed border-purple-200 my-4">
                    <div id="loader" class="loader"></div>
                </div>

                <!-- UPI Apps -->
                <div class="grid grid-cols-4 gap-2 mb-4" id="upi-apps-container"></div>

                <!-- UPI ID -->
                <div class="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200 mt-4">
                    <span class="font-mono text-slate-700 text-sm break-all" id="upi-id-text">${upiId}</span>
                    <button id="copy-button" class="bg-purple-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-purple-700 transition-all">
                        <span class="copy-text-span"><i class="fa-regular fa-copy mr-1"></i>Copy</span>
                    </button>
                </div>

                <!-- Payment Status -->
                <div id="status-container" class="status-check mt-4">
                    <p class="text-sm font-semibold">Payment Status: <span id="status-text">Waiting for payment...</span></p>
                    <div id="status-loader" class="loader mx-auto my-2" style="width: 20px; height: 20px;"></div>
                    <p class="text-xs text-slate-600" id="status-message">After payment, your plan will be activated automatically within 2 minutes</p>
                </div>
            </div>
            
            <!-- Instructions -->
            <div class="bg-purple-50 p-6">
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <p class="text-xs text-green-700 text-center">
                        <i class="fa-solid fa-bolt mr-1"></i>
                        <strong>Automatic Activation:</strong> No need to send screenshot
                    </p>
                </div>
                <a href="https://t.me/${adminUsername}" class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg text-sm">
                    <i class="fa-brands fa-telegram"></i>
                    <span>Contact @${adminUsername}</span>
                </a>
            </div>
        </main>

        <script>
            const paymentToken = "${paymentToken}";
            const userId = "${user_id}";
            let statusCheckInterval;

            // Generate QR Code
            const upiLink = \`upi://pay?pa=${upiId}&pn=\${encodeURIComponent("MythoBot " + "${planName}")}&am=${finalAmount}.00&cu=INR&tn=Payment for ${planName} (User: ${user_id})\`;
            const qrApiUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent(upiLink)}\`;
            
            const qrImage = new Image();
            qrImage.src = qrApiUrl;
            qrImage.className = 'rounded-lg';
            qrImage.onload = () => { 
                document.getElementById('loader').style.display = 'none';
                document.getElementById('qr-code-container').appendChild(qrImage);
            };

            // UPI Apps
            const upiApps = [
                { name: "GPay", package: "com.google.android.apps.nbu.paisa.user", icon: "fa-brands fa-google-pay", color: "bg-blue-500" },
                { name: "Paytm", package: "net.one97.paytm", icon: "fa-solid fa-mobile", color: "bg-blue-600" },
                { name: "PhonePe", package: "com.phonepe.app", icon: "fa-solid fa-phone", color: "bg-purple-600" },
                { name: "Any UPI", package: "", icon: "fa-solid fa-wallet", color: "bg-gray-600" }
            ];

            upiApps.forEach(app => {
                const appButton = document.createElement('button');
                appButton.className = \`upi-app \${app.color} text-white rounded p-2 flex flex-col items-center justify-center\`;
                appButton.innerHTML = \`<i class="\${app.icon} text-sm mb-1"></i><span class="text-xs">\${app.name}</span>\`;
                appButton.onclick = () => {
                    if (app.package) {
                        const intentUrl = \`intent://pay?pa=${upiId}&pn=\${encodeURIComponent("MythoBot " + "${planName}")}&am=${finalAmount}.00&cu=INR#Intent;package=\${app.package};scheme=upi;end;\`;
                        window.location.href = intentUrl;
                        setTimeout(() => { window.location.href = upiLink; }, 500);
                    } else {
                        window.location.href = upiLink;
                    }
                };
                document.getElementById('upi-apps-container').appendChild(appButton);
            });

            // Copy UPI ID
            document.getElementById('copy-button').addEventListener('click', () => {
                navigator.clipboard.writeText("${upiId}").then(() => {
                    const span = document.querySelector('.copy-text-span');
                    span.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Copied!';
                    setTimeout(() => { span.innerHTML = '<i class="fa-regular fa-copy mr-1"></i>Copy'; }, 2000);
                });
            });

            // Payment Status Check
            async function checkPaymentStatus() {
                try {
                    const response = await fetch(\`/payment-status/\${paymentToken}\`);
                    const data = await response.json();
                    
                    if (data.status === 'completed') {
                        document.getElementById('status-text').innerHTML = '<span class="text-green-600">✅ Payment Verified!</span>';
                        document.getElementById('status-loader').style.display = 'none';
                        document.getElementById('status-message').innerHTML = 'Your premium plan has been activated! Return to Telegram bot.';
                        clearInterval(statusCheckInterval);
                        
                        // Redirect to bot after delay
                        setTimeout(() => {
                            window.location.href = \`https://t.me/MythoSerialBot?start=payment_success_\${userId}\`;
                        }, 3000);
                    } else if (data.status === 'failed') {
                        document.getElementById('status-text').innerHTML = '<span class="text-red-600">❌ Payment Failed</span>';
                        document.getElementById('status-loader').style.display = 'none';
                        document.getElementById('status-message').textContent = data.message || 'Payment verification failed. Please try again.';
                        clearInterval(statusCheckInterval);
                    }
                    // If still pending, continue checking
                } catch (error) {
                    console.error('Status check error:', error);
                }
            }

            // Start status checking
            statusCheckInterval = setInterval(checkPaymentStatus, 5000);
        </script>
    </body>
    </html>
  `);
});

// 🔹 UPI Deep Link API
app.get("/upi-redirect", (req, res) => {
  const { upi, amount, name } = req.query;
  
  const upiId = upi || "sandip10x@fam";
  const paymentAmount = amount || 49;
  const receiverName = name || "MythoBot Premium";
  
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(receiverName)}&am=${paymentAmount}.00&cu=INR`;
  
  res.redirect(upiLink);
});

// 🔹 Payment API endpoint
app.get("/payment/api", (req, res) => {
  const { amount, upi, channel, admin } = req.query;
  
  res.json({
    success: true,
    payment_page: `https://${req.hostname}/payment?amount=${amount || 49}&upi=${upi || "sandip10x@fam"}&channel=${channel || "MythoBot Premium"}&admin=${admin || "MythoSerialBot"}`,
    upi_redirect: `https://${req.hostname}/upi-redirect?upi=${upi || "sandip10x@fam"}&amount=${amount || 49}&name=${channel || "MythoBot Premium"}`,
    config: {
      amount: amount || 49,
      upi_id: upi || "sandip10x@fam",
      channel_name: channel || "MythoBot Premium", 
      admin_username: admin || "MythoSerialBot"
    },
    message: "MythoBot Premium Access Payment"
  });
});

// 🔹 Enhanced Payment Status Check with Telegram Notifications
app.get("/payment-status/:token", async (req, res) => {
  const { token } = req.params;
  
  const paymentCollection = client.db("mythobot").collection("payment_sessions");
  const paymentSession = await paymentCollection.findOne({ payment_token: token });
  
  if (!paymentSession) {
    return res.json({ status: 'failed', message: 'Payment session not found' });
  }
  
  if (paymentSession.status === 'completed') {
    return res.json({ status: 'completed', user_id: paymentSession.user_id, plan: paymentSession.plan });
  }
  
  if (paymentSession.status === 'failed') {
    return res.json({ status: 'failed', message: 'Payment verification failed' });
  }
  
  // Check if payment is completed
  const isPaymentVerified = await verifyUPIPayment(paymentSession);
  
  if (isPaymentVerified) {
    // Update payment status
    await paymentCollection.updateOne(
      { payment_token: token },
      { 
        $set: { 
          status: 'completed', 
          verified_at: new Date(),
          notified: true
        } 
      }
    );
    
    // Activate premium for user
    await activatePremiumSubscription(paymentSession.user_id, paymentSession.duration);
    
    // Send Telegram notification for successful payment
    const notificationMessage = `
💳 <b>NEW PAYMENT RECEIVED! 💰</b>

👤 <b>User ID:</b> <code>${paymentSession.user_id}</code>
📦 <b>Plan:</b> ${paymentSession.plan}
💵 <b>Amount:</b> ₹${paymentSession.final_amount}
${paymentSession.mythopoints_applied ? `🎯 <b>MythoPoints Discount:</b> ₹${paymentSession.discount_amount} (30% off)\n💸 <b>Original Amount:</b> ₹${paymentSession.original_amount}` : ''}
⏰ <b>Duration:</b> ${paymentSession.duration} days
🕒 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
🔗 <b>Payment Token:</b> <code>${token}</code>

✅ <b>Status:</b> Payment Verified & Premium Activated
    `;
    
    await sendTelegramNotification(notificationMessage);
    
    return res.json({ status: 'completed', user_id: paymentSession.user_id, plan: paymentSession.plan });
  }
  
  res.json({ status: 'pending' });
});

// 🔹 UPI Payment Verification
async function verifyUPIPayment(paymentSession) {
  return false;
}

// 🔹 Activate Premium Subscription
async function activatePremiumSubscription(userId, duration) {
  const usersCollection = client.db("mythobot").collection("users");
  const subscriptionDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + duration);
  
  await usersCollection.updateOne(
    { user_id: userId },
    { 
      $set: { 
        is_premium: true,
        premium_since: subscriptionDate,
        premium_until: expiryDate,
        plan_duration: duration
      } 
    },
    { upsert: true }
  );
  
  console.log(`✅ Premium activated for user ${userId} for ${duration} days`);
}
app.get("/ad/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;
  
  // Check referer
  const referer = req.get("referer") || "";
  
  if (!referer.includes("softurl.in")) {
    return res.send("❌ Open ad via SoftURL link only!");
  }
  
  // Verify and mark ad as opened
  const adGateCollection = client.db("mythobot").collection("spin_ad_gate");
  await adGateCollection.updateOne(
    { user_id: parseInt(userId), token },
    { $set: { opened: true, opened_at: new Date() } }
  );
  
  // Redirect to Telegram bot
  res.redirect(`https://t.me/MythoSerialBot?start=ad_unlocked_${userId}`);
});

// 🏠 MythoBot Animated Home Page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>MythoBot • Official Portal</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
      <link rel="icon" href="https://i.postimg.cc/Y0MsZM32/favicon.jpg" />
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: radial-gradient(circle at top, #6b46c1 0%, #3b0764 100%);
          color: white;
          overflow-x: hidden;
        }
        .glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: all 0.3s ease;
          transform: translateY(20px);
          opacity: 0;
          animation: fadeUp 1s forwards;
        }
        .glass:hover {
          transform: scale(1.05) rotate(1deg);
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.15);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn {
          transition: all 0.2s ease;
        }
        .btn:hover {
          transform: scale(1.08);
          box-shadow: 0 0 15px rgba(255,255,255,0.3);
        }
        .pulse {
          animation: pulse 3s infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.03); }
        }
      </style>
    </head>
    <body class="min-h-screen flex flex-col items-center justify-center px-4 py-10">

      <!-- Header -->
      <div class="text-center mb-10 animate-fadeIn">
        <img src="https://envs.sh/XwB.jpg" alt="MythoserialBot" class="w-24 h-24 rounded-full mx-auto mb-4 shadow-lg border-4 border-white/20 pulse">
        <h1 class="text-5xl font-extrabold tracking-wide">✨ MythoserialBot Portal ✨</h1>
        <p class="text-purple-200 mt-3 text-sm">Your One-stop Hub for Mythological Serials, Games & Premium Access</p>
      </div>

      <!-- Feature Cards -->
      <div class="grid md:grid-cols-2 gap-6 max-w-3xl w-full">
        
        <!-- Premium Access -->
        <div class="glass text-center p-6 delay-100">
          <i class="fa-solid fa-gem text-yellow-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Premium Membership</h2>
          <p class="text-purple-100 text-sm mt-2">Unlock all mythological serials, HD access & batch downloads.</p>
          <a href="https://t.me/MythoSerialBot?start=upgrade" target="_blank" class="btn inline-block mt-4 bg-yellow-400 text-black font-semibold px-5 py-2 rounded-full">Upgrade Now</a>
        </div>

        <!-- YouTube Downloader -->
        <div class="glass text-center p-6 delay-500">
          <i class="fa-solid fa-youtube text-red-500 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">YouTube Downloader</h2>
          <p class="text-purple-100 text-sm mt-2">Download videos & audio from YouTube in HD quality.</p>
          <a href="/yt" class="btn inline-block mt-4 bg-red-500 text-white font-semibold px-5 py-2 rounded-full">Download Now</a>
        </div>

        <!-- Games -->
        <div class="glass text-center p-6 delay-200">
          <i class="fa-solid fa-gamepad text-pink-300 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Mytho Games</h2>
          <p class="text-purple-100 text-sm mt-2">Play fun mythology-inspired games & earn MythoPoints.</p>
          <a href="/radhe" class="btn inline-block mt-4 bg-pink-500 text-white font-semibold px-5 py-2 rounded-full">Play Radhe Radhe</a>
        </div>

        <!-- Bypass Protection -->
        <div class="glass text-center p-6 delay-300">
          <i class="fa-solid fa-shield-halved text-green-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Bypass Protection</h2>
          <p class="text-purple-100 text-sm mt-2">Advanced protection prevents unauthorized SoftURL bypass.</p>
          <a href="/generate/12345" class="btn inline-block mt-4 bg-green-400 text-black font-semibold px-5 py-2 rounded-full">Test Demo</a>
        </div>

        <!-- Payment Gateway -->
        <div class="glass text-center p-6 delay-400">
          <i class="fa-solid fa-wallet text-blue-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Payment Portal</h2>
          <p class="text-purple-100 text-sm mt-2">Pay via secure UPI for premium access or channel plans.</p>
          <a href="/payment?amount=49&upi=sandip10x@fam&channel=MythoBot%20Premium&admin=MythoSerialBot" class="btn inline-block mt-4 bg-blue-500 text-white font-semibold px-5 py-2 rounded-full">Open Payment</a>
        </div>

        <!-- MythoPoints Discount -->
        <div class="glass text-center p-6 delay-500">
          <i class="fa-solid fa-coins text-yellow-500 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">MythoPoints</h2>
          <p class="text-purple-100 text-sm mt-2">Use your earned points to get 30% discount on payments!</p>
          <a href="/payment?amount=49&mythopoints=true" class="btn inline-block mt-4 bg-yellow-500 text-black font-semibold px-5 py-2 rounded-full">Use Points</a>
        </div>

        <!-- Admin Notifications -->
        <div class="glass text-center p-6 delay-600">
          <i class="fa-solid fa-bell text-red-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Live Alerts</h2>
          <p class="text-purple-100 text-sm mt-2">Instant Telegram notifications for all payments & activities.</p>
          <a href="https://t.me/MythoSerialBot" class="btn inline-block mt-4 bg-red-500 text-white font-semibold px-5 py-2 rounded-full">Get Alerts</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-12 text-sm text-purple-200">
        <p>💫 Developed by <b>@Sandip10x</b> | Powered by <b>MythoBot Server</b></p>
        <p class="mt-1">
          <a href="https://t.me/MythoSerialBot" class="underline text-purple-100">Telegram Bot</a> • 
          <a href="/radhe" class="underline text-purple-100">Radhe Radhe Game</a>
        </p>
      </div>

      <script>
        // Smooth Fade-in Animations
        document.addEventListener('DOMContentLoaded', () => {
          const cards = document.querySelectorAll('.glass');
          cards.forEach((card, i) => {
            card.style.animationDelay = (i * 0.2) + 's';
          });
        });
      </script>

    </body>
    </html>
  `);
});

// 🔹 Radhe Radhe Game Page
app.get("/radhe", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Radhe Radhe Jap 🙏</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg,#ffb6c1,#ffc8dd,#ffb6b9);
          text-align:center;
          height:100vh;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }
        #count {
          font-size:2.5rem;
          font-weight:700;
          color:#9d174d;
          text-shadow:0 0 10px rgba(255,255,255,0.7);
          margin-top:1rem;
        }
        #tapBtn {
          background:linear-gradient(45deg,#ec4899,#db2777);
          color:white;
          border:none;
          border-radius:9999px;
          padding:1.2rem 2.5rem;
          font-size:1.5rem;
          font-weight:bold;
          cursor:pointer;
          transition:transform 0.1s;
          box-shadow:0 0 15px rgba(236,72,153,0.6);
        }
        #tapBtn:active {
          transform:scale(0.9);
        }
        .chant {
          animation:pulse 1.2s infinite;
        }
        @keyframes pulse {
          0%,100% {opacity:1; transform:scale(1);}
          50% {opacity:0.7; transform:scale(1.05);}
        }
        audio { display:none; }
      </style>
    </head>
    <body>
      <h1 class="text-3xl font-bold text-pink-700 chant">💖 Radhe Radhe 💖</h1>
      <button id="tapBtn">Radhe Radhe</button>
      <div id="count">0 Japs</div>
      <audio id="chantAudio" src="https://cdn.pixabay.com/download/audio/2022/03/14/audio_9a4ed9a26e.mp3?filename=indian-mantra-loop-108-13823.mp3" loop></audio>

      <script>
        const btn = document.getElementById('tapBtn');
        const countEl = document.getElementById('count');
        const audio = document.getElementById('chantAudio');
        let count = 0;
        btn.addEventListener('click', () => {
          count++;
          countEl.textContent = count + " Japs";
          if (audio.paused) audio.play();
          // small heart burst
          const heart = document.createElement('div');
          heart.textContent = "💖";
          heart.style.position = 'absolute';
          heart.style.left = (Math.random()*90+5) + "%";
          heart.style.top = (Math.random()*80+10) + "%";
          heart.style.opacity = '0.9';
          heart.style.fontSize = (Math.random()*30+20) + 'px';
          heart.style.transition = '1.5s';
          document.body.appendChild(heart);
          setTimeout(()=>heart.style.transform='translateY(-80px)',50);
          setTimeout(()=>heart.remove(),1500);
        });
      </script>

      <p class="text-pink-800 mt-4 text-sm">Tap continuously and chant with ❤️ Premanand Maharaj Ki Jai!</p>
      <a href="/" class="text-sm text-purple-900 underline mt-3 block">🏠 Back to Home</a>
    </body>
    </html>
  `);
});

// This line should be BEFORE app.listen()
app.use("/yt", youtubeDLRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎯 Bypass protection with base62 encoding activated!`);
  console.log(`✅ URLs will now show encoded parameters: /Bypass/123/abc?t=encoded_string`);
  console.log(`🔔 Telegram notifications: ${TELEGRAM_BOT_TOKEN ? 'ENABLED' : 'DISABLED'}`);
  console.log(`💰 30% MythoPoints discount system: ACTIVE`);
  console.log(`🔗 Use /shorten API to generate encoded URLs for bot`);
});
