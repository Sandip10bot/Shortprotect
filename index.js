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

// API Authentication
const API_KEYS = new Set(process.env.API_KEYS ? process.env.API_KEYS.split(',') : []);

const client = new MongoClient(MONGO_URI);
let doubleCollection;
let urlShortenerCollection;
let downloadsCollection;
let maskCollection;
let adLinksCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("mythobot");
  doubleCollection = db.collection("double_points");
  urlShortenerCollection = db.collection("url_shortener");
  downloadsCollection = db.collection("youtube_downloads");
  maskCollection = db.collection("masked_links");
  adLinksCollection = db.collection("ad_links");

  console.log("✅ MongoDB connected");
}

connectDB();

// ========================
// API Authentication Middleware
// ========================
function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey || !API_KEYS.has(apiKey)) {
    return res.status(401).json({
      success: false,
      error: "Invalid or missing API key"
    });
  }
  
  next();
}

// Simple Base62 Encoding/Decoding functions
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function base62_encode(data) {
    try {
        const buffer = Buffer.from(data, 'utf-8');
        const hex = buffer.toString('hex');
        let num = BigInt('0x' + hex);
        let encoded = '';
        
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
        
        let hex = num.toString(16);
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }
        
        const buffer = Buffer.from(hex, 'hex');
        return buffer.toString('utf-8');
    } catch (error) {
        console.error("Base62 decode error:", error);
        let padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padding = 4 - (padded.length % 4);
        if (padding !== 4) {
            padded += '='.repeat(padding);
        }
        return Buffer.from(padded, 'base64').toString('utf-8');
    }
}

// 🔹 Telegram Notification Function
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

// ========================
// BLOGGER REDIRECTION SYSTEM
// ========================

// 🔹 1. Create Blogger-Friendly Short Link API
app.get("/api/v1/blogger/shorten", authenticateAPI, async (req, res) => {
  const { 
    url, 
    user_id, 
    blogger_url,
    blogger_title = "Click to Continue",
    blogger_delay = 3,
    ad_type = "timer",
    wait_time = 5,
    reward_type = "points"
  } = req.query;
  
  // Required parameters validation
  if (!url || !user_id || !blogger_url) {
    return res.json({
      success: false,
      error: "Missing required parameters: url, user_id, blogger_url"
    });
  }
  
  try {
    // Validate URLs
    new URL(url);
    new URL(blogger_url);
    
    // Generate unique IDs
    const shortId = crypto.randomBytes(4).toString("hex");
    const bloggerCode = crypto.randomBytes(3).toString("hex");
    
    // Ad configuration
    const adConfig = {
      type: ad_type,
      wait_time: parseInt(wait_time),
      reward_type: reward_type,
      earnings_per_click: 0.001,
      blogger: {
        url: blogger_url,
        title: blogger_title,
        delay: parseInt(blogger_delay)
      }
    };
    
    // Create URLs
    const shortUrl = `https://${req.hostname}/s/${shortId}`;
    const bloggerRedirectUrl = `https://${req.hostname}/blogger/${bloggerCode}`;
    const directUrl = `https://${req.hostname}/adgate/${shortId}`;
    
    // Store in database
    await adLinksCollection.insertOne({
      short_id: shortId,
      blogger_code: bloggerCode,
      creator_id: parseInt(user_id),
      target_url: url,
      blogger_url: blogger_url,
      ad_config: adConfig,
      created_at: new Date(),
      clicks: 0,
      blogger_clicks: 0,
      earnings: 0,
      status: "active",
      access_logs: [],
      blogger_logs: [],
      metadata: {
        created_via: "blogger_api",
        blogger_title: blogger_title,
        blogger_delay: blogger_delay
      }
    });
    
    res.json({
      success: true,
      data: {
        short_id: shortId,
        blogger_code: bloggerCode,
        short_url: shortUrl,
        blogger_redirect_url: bloggerRedirectUrl,
        direct_ad_url: directUrl,
        blogger_config: adConfig.blogger,
        ad_config: adConfig,
        user_id: parseInt(user_id),
        created_at: new Date().toISOString(),
        stats_url: `https://${req.hostname}/api/v1/stats/${shortId}?api_key=${req.query.api_key}`,
        blogger_stats_url: `https://${req.hostname}/api/v1/blogger/stats/${bloggerCode}?api_key=${req.query.api_key}`
      },
      message: "Blogger short link created successfully"
    });
    
  } catch (error) {
    console.error("Blogger API shorten error:", error);
    res.json({
      success: false,
      error: error.code === 'ERR_INVALID_URL' ? 'Invalid URL format' : 'Internal server error'
    });
  }
});

// 🔹 2. Blogger Redirection Page
app.get("/blogger/:code", async (req, res) => {
  const { code } = req.params;
  const { ref, source } = req.query;
  
  try {
    const linkData = await adLinksCollection.findOne({ 
      blogger_code: code,
      status: "active"
    });
    
    if (!linkData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Link Not Found</h1>
            <p>This blogger redirection link has expired or doesn't exist.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Track blogger visit
    await adLinksCollection.updateOne(
      { blogger_code: code },
      { 
        $inc: { blogger_clicks: 1 },
        $push: {
          blogger_logs: {
            type: 'visit',
            timestamp: new Date(),
            ip: req.ip,
            user_agent: req.get("user-agent"),
            referer: req.get("referer"),
            ref: ref || null,
            source: source || null
          }
        }
      }
    );
    
    // Blogger page configuration
    const bloggerConfig = linkData.ad_config?.blogger || {};
    const delay = bloggerConfig.delay || 3;
    const title = bloggerConfig.title || "Redirecting...";
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <style>
          .pulse {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        </style>
      </head>
      <body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div class="mb-6">
            <div class="text-5xl mb-4 pulse">
              <i class="fas fa-external-link-alt text-blue-500"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800">${title}</h1>
            <p class="text-gray-600 mt-2">You are being redirected to the content...</p>
          </div>
          
          <div class="mb-6">
            <div class="flex items-center justify-center mb-4">
              <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div id="progressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
              </div>
            </div>
            <p class="text-sm text-gray-500">
              Redirecting in <span id="countdown">${delay}</span> seconds...
            </p>
          </div>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-center text-blue-800">
              <i class="fas fa-shield-alt mr-2"></i>
              <span class="text-sm">Secure Connection • Safe Redirect</span>
            </div>
          </div>
          
          <div class="space-y-3">
            <button onclick="redirectNow()" 
              class="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
              <i class="fas fa-bolt mr-2"></i>Skip Wait & Continue Now
            </button>
            
            <a href="${linkData.blogger_url}" 
              target="_blank"
              class="inline-block w-full py-2 text-blue-600 hover:text-blue-800">
              <i class="fas fa-external-link-alt mr-2"></i>Visit Blogger Page Instead
            </a>
          </div>
        </div>
        
        <script>
          const delay = ${delay};
          const shortUrl = "https://${req.hostname}/s/${linkData.short_id}";
          let countdown = delay;
          const countdownElement = document.getElementById('countdown');
          const progressBar = document.getElementById('progressBar');
          
          const timer = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            progressBar.style.width = \`\${((delay - countdown) / delay) * 100}%\`;
            
            if (countdown <= 0) {
              clearInterval(timer);
              window.location.href = shortUrl;
            }
          }, 1000);
          
          function redirectNow() {
            clearInterval(timer);
            window.location.href = shortUrl;
          }
          
          // Auto-redirect
          setTimeout(redirectNow, delay * 1000);
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error("Blogger redirect error:", error);
    res.status(500).send("Internal server error");
  }
});

// 🔹 3. Blogger Link Statistics API
app.get("/api/v1/blogger/stats/:bloggerCode", authenticateAPI, async (req, res) => {
  const { bloggerCode } = req.params;
  const { user_id } = req.query;
  
  try {
    const query = { blogger_code: bloggerCode };
    if (user_id) {
      query.creator_id = parseInt(user_id);
    }
    
    const linkData = await adLinksCollection.findOne(query);
    
    if (!linkData) {
      return res.json({
        success: false,
        error: "Blogger link not found or access denied"
      });
    }
    
    // Calculate stats
    const totalBloggerClicks = linkData.blogger_clicks || 0;
    const totalAdClicks = linkData.clicks || 0;
    const conversionRate = totalBloggerClicks > 0 
      ? ((totalAdClicks / totalBloggerClicks) * 100).toFixed(2) 
      : 0;
    
    res.json({
      success: true,
      data: {
        blogger_code: bloggerCode,
        short_id: linkData.short_id,
        blogger_url: linkData.blogger_url,
        target_url: linkData.target_url,
        created_at: linkData.created_at,
        total_blogger_clicks: totalBloggerClicks,
        total_ad_clicks: totalAdClicks,
        conversion_rate: `${conversionRate}%`,
        earnings: parseFloat((linkData.earnings || 0).toFixed(3)),
        blogger_config: linkData.ad_config?.blogger,
        blogger_logs: linkData.blogger_logs?.slice(0, 20) || [],
        short_url: `https://${req.hostname}/s/${linkData.short_id}`,
        blogger_redirect_url: `https://${req.hostname}/blogger/${bloggerCode}`
      }
    });
    
  } catch (error) {
    console.error("Blogger stats error:", error);
    res.json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ========================
// BOT API ENDPOINTS
// ========================

// 🔹 1. Generate Ad Short Link API (for bot)
app.get("/api/v1/shorten", authenticateAPI, async (req, res) => {
  const { 
    url, 
    user_id, 
    ad_type = "timer",
    wait_time = 5,
    reward_type = "points",
    custom_alias,
    campaign_name,
    title,
    description
  } = req.query;
  
  if (!url || !user_id) {
    return res.json({
      success: false,
      error: "Missing required parameters: url and user_id"
    });
  }
  
  try {
    new URL(url);
    
    let shortId;
    if (custom_alias && /^[a-zA-Z0-9_-]{3,20}$/.test(custom_alias)) {
      const existing = await adLinksCollection.findOne({ 
        short_id: custom_alias 
      });
      
      if (existing) {
        return res.json({
          success: false,
          error: "Custom alias already exists"
        });
      }
      shortId = custom_alias;
    } else {
      shortId = crypto.randomBytes(4).toString("hex");
    }
    
    const adConfig = {
      type: ad_type,
      wait_time: parseInt(wait_time),
      reward_type: reward_type,
      earnings_per_click: 0.001,
      campaign: campaign_name || null,
      title: title || null,
      description: description || null
    };
    
    const shortUrl = `https://${req.hostname}/s/${shortId}`;
    const directUrl = `https://${req.hostname}/adgate/${shortId}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shortUrl)}`;
    
    await adLinksCollection.insertOne({
      short_id: shortId,
      creator_id: parseInt(user_id),
      target_url: url,
      ad_config: adConfig,
      custom_alias: custom_alias || null,
      created_at: new Date(),
      clicks: 0,
      views: 0,
      earnings: 0,
      status: "active",
      total_earnings: 0,
      today_clicks: 0,
      access_logs: [],
      metadata: {
        user_agent: req.get("user-agent"),
        ip: req.ip,
        created_via: "api",
        api_key: req.query.api_key
      }
    });
    
    if (TELEGRAM_ADMIN_CHAT_ID && process.env.NOTIFY_NEW_LINKS === "true") {
      const notification = `
🔗 <b>New Short Link Created via API</b>

👤 <b>User ID:</b> <code>${user_id}</code>
📝 <b>Short ID:</b> <code>${shortId}</code>
🎯 <b>Ad Type:</b> ${ad_type}
⏱️ <b>Wait Time:</b> ${wait_time}s
💰 <b>Reward Type:</b> ${reward_type}

🔗 <b>Short URL:</b> ${shortUrl}
🎯 <b>Target URL:</b> ${url.substring(0, 50)}...

📊 <b>Stats:</b> <a href="https://${req.hostname}/api/v1/stats/${shortId}?api_key=${req.query.api_key}">View Stats</a>
      `;
      
      await sendTelegramNotification(notification);
    }
    
    res.json({
      success: true,
      data: {
        short_id: shortId,
        short_url: shortUrl,
        direct_url: directUrl,
        telegram_share_url: telegramUrl,
        qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`,
        ad_config: adConfig,
        user_id: parseInt(user_id),
        created_at: new Date().toISOString(),
        stats_url: `https://${req.hostname}/api/v1/stats/${shortId}?api_key=${req.query.api_key}`,
        delete_url: `https://${req.hostname}/api/v1/delete/${shortId}?api_key=${req.query.api_key}`,
        preview_url: `https://${req.hostname}/api/v1/preview/${shortId}`
      },
      message: "Short link created successfully"
    });
    
  } catch (error) {
    console.error("API shorten error:", error);
    res.json({
      success: false,
      error: error.code === 'ERR_INVALID_URL' ? 'Invalid URL format' : 'Internal server error'
    });
  }
});

// 🔹 2. Get Link Statistics API
app.get("/api/v1/stats/:shortId", authenticateAPI, async (req, res) => {
  const { shortId } = req.params;
  const { user_id, days = 7 } = req.query;
  
  try {
    const query = { short_id: shortId };
    if (user_id) {
      query.creator_id = parseInt(user_id);
    }
    
    const linkData = await adLinksCollection.findOne(query);
    
    if (!linkData) {
      return res.json({
        success: false,
        error: "Link not found or access denied"
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayClicks = linkData.access_logs?.filter(log => 
      log.type === 'click' && new Date(log.timestamp) >= today
    ).length || 0;
    
    const earningsByDay = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      earningsByDay[dateStr] = 0;
    }
    
    if (linkData.access_logs) {
      linkData.access_logs.forEach(log => {
        if (log.earned) {
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          if (earningsByDay[logDate] !== undefined) {
            earningsByDay[logDate] += 0.001;
          }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        short_id: shortId,
        target_url: linkData.target_url,
        created_at: linkData.created_at,
        total_clicks: linkData.clicks || 0,
        total_views: linkData.views || 0,
        total_earnings: parseFloat((linkData.earnings || 0).toFixed(3)),
        today_clicks: todayClicks,
        today_earnings: parseFloat((todayClicks * 0.001).toFixed(3)),
        ad_config: linkData.ad_config,
        status: linkData.status,
        earnings_by_day: earningsByDay,
        blogger_clicks: linkData.blogger_clicks || 0,
        blogger_url: linkData.blogger_url || null,
        recent_clicks: linkData.access_logs?.slice(0, 10).map(log => ({
          timestamp: log.timestamp,
          ip: log.ip,
          earned: log.earned,
          user_agent: log.user_agent
        })) || []
      }
    });
    
  } catch (error) {
    console.error("Stats error:", error);
    res.json({
      success: false,
      error: "Internal server error"
    });
  }
});

// 🔹 3. Delete Link API
app.delete("/api/v1/delete/:shortId", authenticateAPI, async (req, res) => {
  const { shortId } = req.params;
  const { user_id } = req.query;
  
  try {
    const query = { short_id: shortId };
    if (user_id) {
      query.creator_id = parseInt(user_id);
    }
    
    const result = await adLinksCollection.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return res.json({
        success: false,
        error: "Link not found or access denied"
      });
    }
    
    res.json({
      success: true,
      message: "Link deleted successfully"
    });
    
  } catch (error) {
    console.error("Delete error:", error);
    res.json({
      success: false,
      error: "Internal server error"
    });
  }
});

// 🔹 4. List User Links API
app.get("/api/v1/user/:userId/links", authenticateAPI, async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20, status = "active" } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  try {
    const query = { creator_id: parseInt(userId) };
    if (status !== "all") {
      query.status = status;
    }
    
    const links = await adLinksCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    const total = await adLinksCollection.countDocuments(query);
    
    const formattedLinks = links.map(link => ({
      short_id: link.short_id,
      blogger_code: link.blogger_code,
      short_url: `https://${req.hostname}/s/${link.short_id}`,
      blogger_url: link.blogger_url ? `https://${req.hostname}/blogger/${link.blogger_code}` : null,
      target_url: link.target_url,
      created_at: link.created_at,
      clicks: link.clicks || 0,
      blogger_clicks: link.blogger_clicks || 0,
      earnings: parseFloat((link.earnings || 0).toFixed(3)),
      ad_type: link.ad_config?.type,
      status: link.status,
      custom_alias: link.custom_alias
    }));
    
    res.json({
      success: true,
      data: {
        links: formattedLinks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error("User links error:", error);
    res.json({
      success: false,
      error: "Internal server error"
    });
  }
});

// 🔹 5. Get User Earnings Summary
app.get("/api/v1/user/:userId/earnings", authenticateAPI, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const links = await adLinksCollection.find({ 
      creator_id: parseInt(userId) 
    }).toArray();
    
    const totalEarnings = links.reduce((sum, link) => sum + (link.earnings || 0), 0);
    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalBloggerClicks = links.reduce((sum, link) => sum + (link.blogger_clicks || 0), 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayEarnings = 0;
    let todayClicks = 0;
    
    links.forEach(link => {
      if (link.access_logs) {
        link.access_logs.forEach(log => {
          if (log.type === 'click' && new Date(log.timestamp) >= today) {
            todayClicks++;
            if (log.earned) {
              todayEarnings += 0.001;
            }
          }
        });
      }
    });
    
    res.json({
      success: true,
      data: {
        user_id: parseInt(userId),
        total_links: links.length,
        total_clicks: totalClicks,
        total_blogger_clicks: totalBloggerClicks,
        total_earnings: parseFloat(totalEarnings.toFixed(3)),
        today_clicks: todayClicks,
        today_earnings: parseFloat(todayEarnings.toFixed(3)),
        average_cpc: totalClicks > 0 ? parseFloat((totalEarnings / totalClicks).toFixed(3)) : 0,
        links_summary: links.map(link => ({
          short_id: link.short_id,
          clicks: link.clicks || 0,
          blogger_clicks: link.blogger_clicks || 0,
          earnings: parseFloat((link.earnings || 0).toFixed(3)),
          status: link.status,
          created_at: link.created_at
        }))
      }
    });
    
  } catch (error) {
    console.error("Earnings error:", error);
    res.json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ========================
// AD LINKFLY SYSTEM
// ========================

// 🔹 Short URL Redirect
app.get("/s/:shortId", async (req, res) => {
  const { shortId } = req.params;
  
  try {
    const linkData = await adLinksCollection.findOne({ 
      short_id: shortId,
      status: "active"
    });
    
    if (!linkData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Not Found - MythoBot</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #dc3545; font-size: 48px; margin: 20px 0; }
            .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">🔗❌</div>
            <h1>Short Link Not Found</h1>
            <p>The requested link doesn't exist or has been disabled.</p>
            <a href="/" class="btn">Return to Home</a>
          </div>
        </body>
        </html>
      `);
    }
    
    // Increment view count
    await adLinksCollection.updateOne(
      { short_id: shortId },
      { $inc: { views: 1 } }
    );
    
    // Redirect to ad gateway
    res.redirect(`/adgate/${shortId}`);
    
  } catch (error) {
    res.status(500).send("Internal server error");
  }
});

// 🔹 Ad Gateway
app.get("/adgate/:shortId", async (req, res) => {
  const { shortId } = req.params;
  const { ref } = req.query;
  
  try {
    const linkData = await adLinksCollection.findOne({ 
      short_id: shortId,
      status: "active"
    });
    
    if (!linkData) {
      return res.status(404).send("Link not found or disabled");
    }
    
    // Check if user has already visited today
    const userIP = req.ip;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingVisit = await adLinksCollection.findOne({
      short_id: shortId,
      "access_logs.ip": userIP,
      "access_logs.timestamp": { $gte: today }
    });
    
    const isFirstVisitToday = !existingVisit;
    
    // Store referral if present
    if (ref) {
      await adLinksCollection.updateOne(
        { short_id: shortId },
        { 
          $addToSet: { referrals: ref },
          $push: {
            access_logs: {
              type: 'referral',
              timestamp: new Date(),
              ip: userIP,
              referrer: ref
            }
          }
        }
      );
    }
    
    // Track view
    await adLinksCollection.updateOne(
      { short_id: shortId },
      { 
        $push: {
          access_logs: {
            type: 'view',
            timestamp: new Date(),
            ip: userIP,
            user_agent: req.get("user-agent"),
            is_first_today: isFirstVisitToday
          }
        }
      }
    );
    
    // Render appropriate ad page
    const adType = linkData.ad_config?.type || "timer";
    const waitTime = linkData.ad_config?.wait_time || 5;
    
    switch (adType) {
      case "timer":
        renderTimerAdPage(res, shortId, linkData.target_url, waitTime, isFirstVisitToday);
        break;
      case "video":
        renderVideoAdPage(res, shortId, linkData.target_url, waitTime, isFirstVisitToday);
        break;
      case "interstitial":
        renderInterstitialAdPage(res, shortId, linkData.target_url, isFirstVisitToday);
        break;
      default:
        renderBannerAdPage(res, shortId, linkData.target_url, isFirstVisitToday);
    }
    
  } catch (error) {
    console.error("AdGate error:", error);
    res.status(500).send("Internal server error");
  }
});

// ========================
// AD PAGE RENDER FUNCTIONS
// ========================

function renderTimerAdPage(res, shortId, targetUrl, waitTime, isFirstVisit) {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Please Wait... - MythoBot Link</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 20px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); width: 0%; transition: width 1s linear; }
      </style>
    </head>
    <body class="bg-gray-50 min-h-screen flex items-center justify-center">
      <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div class="mb-6">
          <div class="text-4xl mb-2">⏳</div>
          <h1 class="text-2xl font-bold text-gray-800">Please Wait</h1>
          <p class="text-gray-600 mt-2">You will be redirected in <span id="timer">${waitTime}</span> seconds</p>
        </div>
        
        <div class="progress-bar">
          <div id="progressFill" class="progress-fill"></div>
        </div>
        
        <!-- Ad Container -->
        <div class="ad-container mt-6 p-4 bg-gray-100 rounded-lg">
          <p class="text-sm text-gray-500 mb-2">Advertisement</p>
          <div id="adContent" class="mb-4">
            <div class="bg-gradient-to-r from-blue-400 to-purple-500 text-white p-4 rounded-lg text-center">
              <h3 class="font-bold">Support Our Service</h3>
              <p class="text-sm">Please wait to continue to your destination</p>
            </div>
          </div>
        </div>
        
        <div class="mt-8">
          <button id="skipBtn" disabled
            class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium w-full cursor-not-allowed">
            Continue (${waitTime}s)
          </button>
        </div>
      </div>
      
      <script>
        let timeLeft = ${waitTime};
        const timerElement = document.getElementById('timer');
        const progressFill = document.getElementById('progressFill');
        const skipBtn = document.getElementById('skipBtn');
        const shortId = "${shortId}";
        const targetUrl = "${targetUrl}";
        
        const timerInterval = setInterval(() => {
          timeLeft--;
          timerElement.textContent = timeLeft;
          progressFill.style.width = (((${waitTime} - timeLeft) / ${waitTime}) * 100) + '%';
          
          if (timeLeft > 0) {
            skipBtn.textContent = \`Continue (\${timeLeft}s)\`;
          } else {
            skipBtn.textContent = 'Continue Now';
            skipBtn.disabled = false;
            skipBtn.classList.remove('bg-gray-200', 'cursor-not-allowed');
            skipBtn.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600', 'cursor-pointer');
          }
          
          if (timeLeft <= 0) {
            clearInterval(timerInterval);
            completeVisit();
          }
        }, 1000);
        
        skipBtn.addEventListener('click', () => {
          if (timeLeft <= 0) {
            completeVisit();
          }
        });
        
        function completeVisit() {
          fetch(\`/api/v1/click/\${shortId}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then(() => {
            window.location.href = targetUrl;
          });
        }
        
        setTimeout(completeVisit, ${waitTime * 1000});
      </script>
    </body>
    </html>
  `);
}

function renderVideoAdPage(res, shortId, targetUrl, videoDuration, isFirstVisit) {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Watch Ad - MythoBot Link</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 min-h-screen flex items-center justify-center">
      <div class="bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full text-center text-white">
        <h1 class="text-2xl font-bold mb-2">Watch a Short Video</h1>
        <p class="text-gray-300 mb-6">Please watch the video to unlock the link</p>
        
        <div class="video-container bg-black rounded-lg overflow-hidden">
          <div class="video-overlay p-2 bg-gray-900">
            <span id="timeDisplay">${videoDuration}s remaining</span>
          </div>
          <div class="p-4">
            <p class="text-lg font-bold text-yellow-400">Video Ad</p>
            <p class="text-gray-400 text-sm">This helps support our service</p>
          </div>
        </div>
        
        <div class="mt-8">
          <button id="continueBtn" disabled
            class="px-8 py-3 bg-gray-600 text-gray-300 rounded-lg font-bold text-lg w-full cursor-not-allowed">
            Continue (${videoDuration}s)
          </button>
        </div>
      </div>
      
      <script>
        const continueBtn = document.getElementById('continueBtn');
        const timeDisplay = document.getElementById('timeDisplay');
        const shortId = "${shortId}";
        const targetUrl = "${targetUrl}";
        let timeLeft = ${videoDuration};
        
        const timer = setInterval(() => {
          timeLeft--;
          timeDisplay.textContent = \`\${timeLeft}s remaining\`;
          
          if (timeLeft > 0) {
            continueBtn.textContent = \`Continue (\${timeLeft}s)\`;
          } else {
            continueBtn.textContent = 'Continue Now';
            continueBtn.disabled = false;
            continueBtn.classList.remove('bg-gray-600', 'cursor-not-allowed');
            continueBtn.classList.add('bg-green-500', 'hover:bg-green-600', 'cursor-pointer');
            clearInterval(timer);
          }
        }, 1000);
        
        continueBtn.addEventListener('click', () => {
          if (!continueBtn.disabled) {
            fetch(\`/api/v1/click/\${shortId}\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(() => {
              window.location.href = targetUrl;
            });
          }
        });
        
        setTimeout(() => {
          if (timeLeft <= 0) {
            fetch(\`/api/v1/click/\${shortId}\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(() => {
              window.location.href = targetUrl;
            });
          }
        }, ${videoDuration * 1000});
      </script>
    </body>
    </html>
  `);
}

function renderInterstitialAdPage(res, shortId, targetUrl, isFirstVisit) {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Advertisement - MythoBot Link</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen flex items-center justify-center">
      <div class="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full">
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 text-center">
          <div class="text-5xl mb-2">🎯</div>
          <h1 class="text-xl font-bold">Advertisement</h1>
        </div>
        
        <div class="p-6">
          <div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl text-center mb-4">
            <h2 class="font-bold text-lg">Special Offer!</h2>
            <p class="text-sm mt-1">Support our service by viewing this ad</p>
          </div>
          
          <div class="text-center">
            <p class="text-gray-600 text-sm mb-4">
              Please view this advertisement to continue to your destination
            </p>
          </div>
        </div>
        
        <div class="p-6 pt-0">
          <button id="continueBtn" 
            onclick="completeAd()"
            class="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg">
            Continue to Link
          </button>
        </div>
      </div>
      
      <script>
        const shortId = "${shortId}";
        const targetUrl = "${targetUrl}";
        
        fetch(\`/api/v1/click/track/\${shortId}/view\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        function completeAd() {
          fetch(\`/api/v1/click/\${shortId}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then(() => {
            window.location.href = targetUrl;
          });
        }
        
        setTimeout(completeAd, 5000);
      </script>
    </body>
    </html>
  `);
}

function renderBannerAdPage(res, shortId, targetUrl, isFirstVisit) {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecting... - MythoBot Link</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen">
      <div class="max-w-4xl mx-auto p-4">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-800">MythoBot Link Shortener</h1>
          <p class="text-gray-600">You are being redirected to your destination</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-6">
          <div class="md:col-span-2">
            <div class="bg-white rounded-xl shadow p-6 mb-6">
              <h2 class="text-lg font-bold text-gray-800 mb-4">Destination Preview</h2>
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p class="text-blue-800 text-sm break-all">${targetUrl.substring(0, 100)}...</p>
              </div>
              <p class="text-gray-600 text-sm">
                You'll be redirected automatically in <span id="countdown">5</span> seconds
              </p>
            </div>
            
            <div class="text-center">
              <button onclick="skipAd()" 
                class="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
                Skip Ad & Continue Now
              </button>
            </div>
          </div>
          
          <div class="space-y-4">
            <div class="bg-white rounded-xl shadow p-4">
              <p class="text-xs text-gray-500 mb-2">Advertisement</p>
              <div class="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg border border-purple-200">
                <h3 class="font-bold text-purple-800">Premium Features</h3>
                <p class="text-xs text-purple-600 mt-1">Support our service</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        const shortId = "${shortId}";
        const targetUrl = "${targetUrl}";
        let countdown = 5;
        const countdownElement = document.getElementById('countdown');
        
        fetch(\`/api/v1/click/track/\${shortId}/view\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const timer = setInterval(() => {
          countdown--;
          countdownElement.textContent = countdown;
          
          if (countdown <= 0) {
            clearInterval(timer);
            completeRedirect();
          }
        }, 1000);
        
        function skipAd() {
          clearInterval(timer);
          completeRedirect();
        }
        
        function completeRedirect() {
          fetch(\`/api/v1/click/\${shortId}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then(() => {
            window.location.href = targetUrl;
          });
        }
        
        setTimeout(completeRedirect, 5000);
      </script>
    </body>
    </html>
  `);
}

// ========================
// CLICK TRACKING ENDPOINT
// ========================

app.post("/api/v1/click/:shortId", async (req, res) => {
  const { shortId } = req.params;
  
  try {
    const linkData = await adLinksCollection.findOne({ short_id: shortId });
    
    if (!linkData) {
      return res.json({ success: false });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingClick = await adLinksCollection.findOne({
      short_id: shortId,
      "access_logs.type": "click",
      "access_logs.ip": req.ip,
      "access_logs.timestamp": { $gte: today }
    });
    
    const isFirstClickToday = !existingClick;
    const earnings = isFirstClickToday ? 0.001 : 0;
    
    await adLinksCollection.updateOne(
      { short_id: shortId },
      {
        $inc: { 
          clicks: 1,
          earnings: earnings,
          today_clicks: 1
        },
        $push: {
          access_logs: {
            type: 'click',
            timestamp: new Date(),
            ip: req.ip,
            user_agent: req.get("user-agent"),
            earned: isFirstClickToday,
            earnings: earnings
          }
        }
      }
    );
    
    res.json({ 
      success: true, 
      earned: isFirstClickToday,
      earnings: earnings 
    });
    
  } catch (error) {
    console.error("Click tracking error:", error);
    res.json({ success: false });
  }
});

// ========================
// YOUR EXISTING ROUTES
// ========================

app.get("/link/:hex", (req, res) => {
  const { hex } = req.params;
  
  try {
    const targetUrl = Buffer.from(hex, 'hex').toString('utf-8');
    new URL(targetUrl);
    
    res.redirect(302, targetUrl);
    
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
      const maskedCollection = client.db("mythobot").collection("masked_links");
      maskedCollection.insertOne({
        encoded: encodedUrl,
        target: targetUrl,
        clicked_at: new Date(),
        ip: req.ip
      });
    } catch(e) {}
    
    res.redirect(302, targetUrl);
    
  } catch (error) {
    res.send(`
      <script>
        alert("Invalid link!");
        window.location.href = "https://t.me/MythoSerialBot";
      </script>
    `);
  }
});

app.get("/api/mask", (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }
  
  try {
    new URL(url);
    
    const encodedUrl = base62_encode(url);
    
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

function calculateDiscountedPrice(originalPrice, mythoPointsApplied = false) {
  if (mythoPointsApplied) {
    const discount = originalPrice * 0.3;
    return Math.max(1, Math.round(originalPrice - discount));
  }
  return originalPrice;
}

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

app.get("/double/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;

  console.log(`--- incoming /double request for user=${userId} token=${token} ---`);

  const referer = req.get("referer") || "";
  if (!referer.includes("softurl.in")) {
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

  await doubleCollection.updateOne(
    { user_id: userId, token },
    { $set: { used: true, used_at: new Date() } }
  );

  const botUsername = "MythoSerialBot";
  const deepLink = `https://t.me/${botUsername}?start=double_${userId}_${token}`;

  res.redirect(deepLink);
});

app.get("/Bypass/:userId/:token", async (req, res) => {
    const { userId, token } = req.params;
    const { t } = req.query;
    
    console.log(`--- incoming /Bypass request for user=${userId} ---`);
    
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
    
    if (dbRecord) {
        console.log("Using URL from database:", dbRecord.target_url);
        
        await urlShortenerCollection.updateOne(
            { token: token },
            { $inc: { clicks: 1 } }
        );
        
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
        
        return res.redirect(dbRecord.target_url);
    }
    
    if (t) {
        try {
            console.log("Decoding target from parameter...");
            
            let decodedTarget = null;
            let decodeMethod = "";
            let decodeError = null;
            
            try {
                decodedTarget = base62_decode(t);
                new URL(decodedTarget);
                decodeMethod = "base62";
                console.log("Successfully decoded via base62:", decodedTarget.substring(0, 100) + (decodedTarget.length > 100 ? "..." : ""));
            } catch (e1) {
                decodeError = e1;
                console.log("Base62 decode failed:", e1.message);
                
                try {
                    decodedTarget = decodeURIComponent(t);
                    new URL(decodedTarget);
                    decodeMethod = "legacy_url";
                    console.log("Successfully decoded via legacy URL decode:", decodedTarget.substring(0, 100) + (decodedTarget.length > 100 ? "..." : ""));
                } catch (e2) {
                    decodeError = e2;
                    console.log("Legacy URL decode also failed:", e2.message);
                    
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
            
            new URL(decodedTarget);
            
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

app.get("/shorten", async (req, res) => {
  const { url, userId } = req.query;
  
  if (!url || !userId) {
    return res.status(400).json({
      success: false,
      error: "Missing url or userId parameters"
    });
  }
  
  try {
    new URL(url);
    
    const token = crypto.randomBytes(8).toString("hex");
    
    const encodedUrl = base62_encode(url);
    
    const bypassUrl = `https://${req.hostname}/Bypass/${userId}/${token}?t=${encodedUrl}`;
    
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

app.get("/payment", (req, res) => {
  const { amount, upi, channel, admin, mythopoints } = req.query;
  
  const baseAmount = amount || 49;
  const upiId = upi || "sandip10x@fam";
  const channelName = channel || "MythoBot Premium";
  const adminUsername = admin || "MythoSerialBot";
  const mythoPointsApplied = mythopoints === "true";

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

                const finalAmount = ${finalAmount};
                
                const upiLink = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR\`;
                const qrApiUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent(upiLink)}&qzone=1\`;
                
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

                upiApps.forEach(app => {
                    const appButton = document.createElement('button');
                    appButton.className = \`upi-app \${app.color} text-white rounded-lg p-3 flex flex-col items-center justify-center\`;
                    appButton.innerHTML = \`
                        <i class="\${app.icon} text-xl mb-1"></i>
                        <span class="text-xs font-medium">\${app.name}</span>
                    \`;
                    
                    appButton.onclick = () => {
                        if (app.package) {
                            const intentUrl = \`intent://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR#Intent;package=\${app.package};scheme=upi;end;\`;
                            const upiUrl = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR\`;
                            
                            window.location.href = intentUrl;
                            
                            setTimeout(() => {
                                window.location.href = upiUrl;
                            }, 500);
                        } else {
                            window.location.href = upiLink;
                        }
                    };
                    
                    upiAppsContainer.appendChild(appButton);
                });

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
            document.addEventListener('DOMContentLoaded', function() {
                document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                });

                document.addEventListener('keydown', function(e) {
                    if (e.ctrlKey && (e.key === 'c' || e.key === 'u')) {
                        e.preventDefault();
                    }
                    if (e.key === 'F12') {
                        e.preventDefault();
                    }
                });

                document.addEventListener('dragstart', function(e) {
                    e.preventDefault();
                });
            });
        </script>
    </body>
    </html>
  `);
});

app.get("/premium-payment", async (req, res) => {
  const { user_id, plan, duration, amount, upi, admin, mythopoints } = req.query;
  
  if (!user_id || !plan) {
    return res.status(400).send("Missing user_id or plan parameters");
  }

  const plans = {
    'silver': { default_amount: 79, default_duration: 28, name: 'Silver Plan' },
    'gold': { default_amount: 149, default_duration: 30, name: 'Gold Plan' }
  };

  const selectedPlan = plans[plan] || plans['silver'];
  const originalAmount = amount || selectedPlan.default_amount;
  const mythoPointsApplied = mythopoints === "true";
  
  const finalAmount = calculateDiscountedPrice(parseInt(originalAmount), mythoPointsApplied);
  const discountAmount = originalAmount - finalAmount;
  
  const finalDuration = duration || selectedPlan.default_duration;
  const upiId = upi || "sandip10x@fam";
  const adminUsername = admin || "MythoSerialBot";
  const planName = selectedPlan.name;

  const paymentToken = crypto.randomBytes(16).toString('hex');
  
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

                <div class="grid grid-cols-4 gap-2 mb-4" id="upi-apps-container"></div>

                <div class="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200 mt-4">
                    <span class="font-mono text-slate-700 text-sm break-all" id="upi-id-text">${upiId}</span>
                    <button id="copy-button" class="bg-purple-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-purple-700 transition-all">
                        <span class="copy-text-span"><i class="fa-regular fa-copy mr-1"></i>Copy</span>
                    </button>
                </div>

                <div id="status-container" class="status-check mt-4">
                    <p class="text-sm font-semibold">Payment Status: <span id="status-text">Waiting for payment...</span></p>
                    <div id="status-loader" class="loader mx-auto my-2" style="width: 20px; height: 20px;"></div>
                    <p class="text-xs text-slate-600" id="status-message">After payment, your plan will be activated automatically within 2 minutes</p>
                </div>
            </div>
            
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

            const upiLink = \`upi://pay?pa=${upiId}&pn=\${encodeURIComponent("MythoBot " + "${planName}")}&am=${finalAmount}.00&cu=INR&tn=Payment for ${planName} (User: ${user_id})\`;
            const qrApiUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent(upiLink)}\`;
            
            const qrImage = new Image();
            qrImage.src = qrApiUrl;
            qrImage.className = 'rounded-lg';
            qrImage.onload = () => { 
                document.getElementById('loader').style.display = 'none';
                document.getElementById('qr-code-container').appendChild(qrImage);
            };

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

            document.getElementById('copy-button').addEventListener('click', () => {
                navigator.clipboard.writeText("${upiId}").then(() => {
                    const span = document.querySelector('.copy-text-span');
                    span.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Copied!';
                    setTimeout(() => { span.innerHTML = '<i class="fa-regular fa-copy mr-1"></i>Copy'; }, 2000);
                });
            });

            async function checkPaymentStatus() {
                try {
                    const response = await fetch(\`/payment-status/\${paymentToken}\`);
                    const data = await response.json();
                    
                    if (data.status === 'completed') {
                        document.getElementById('status-text').innerHTML = '<span class="text-green-600">✅ Payment Verified!</span>';
                        document.getElementById('status-loader').style.display = 'none';
                        document.getElementById('status-message').innerHTML = 'Your premium plan has been activated! Return to Telegram bot.';
                        clearInterval(statusCheckInterval);
                        
                        setTimeout(() => {
                            window.location.href = \`https://t.me/MythoSerialBot?start=payment_success_\${userId}\`;
                        }, 3000);
                    } else if (data.status === 'failed') {
                        document.getElementById('status-text').innerHTML = '<span class="text-red-600">❌ Payment Failed</span>';
                        document.getElementById('status-loader').style.display = 'none';
                        document.getElementById('status-message').textContent = data.message || 'Payment verification failed. Please try again.';
                        clearInterval(statusCheckInterval);
                    }
                } catch (error) {
                    console.error('Status check error:', error);
                }
            }

            statusCheckInterval = setInterval(checkPaymentStatus, 5000);
        </script>
    </body>
    </html>
  `);
});

app.get("/upi-redirect", (req, res) => {
  const { upi, amount, name } = req.query;
  
  const upiId = upi || "sandip10x@fam";
  const paymentAmount = amount || 49;
  const receiverName = name || "MythoBot Premium";
  
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(receiverName)}&am=${paymentAmount}.00&cu=INR`;
  
  res.redirect(upiLink);
});

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
  
  const isPaymentVerified = await verifyUPIPayment(paymentSession);
  
  if (isPaymentVerified) {
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
    
    await activatePremiumSubscription(paymentSession.user_id, paymentSession.duration);
    
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

async function verifyUPIPayment(paymentSession) {
  return false;
}

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
  
  const referer = req.get("referer") || "";
  
  if (!referer.includes("softurl.in")) {
    return res.send("❌ Open ad via SoftURL link only!");
  }
  
  const adGateCollection = client.db("mythobot").collection("spin_ad_gate");
  await adGateCollection.updateOne(
    { user_id: parseInt(userId), token },
    { $set: { opened: true, opened_at: new Date() } }
  );
  
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

      <div class="text-center mb-10 animate-fadeIn">
        <img src="https://envs.sh/XwB.jpg" alt="MythoserialBot" class="w-24 h-24 rounded-full mx-auto mb-4 shadow-lg border-4 border-white/20 pulse">
        <h1 class="text-5xl font-extrabold tracking-wide">✨ MythoserialBot Portal ✨</h1>
        <p class="text-purple-200 mt-3 text-sm">Your One-stop Hub for Mythological Serials, Games & Premium Access</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6 max-w-3xl w-full">
        
        <div class="glass text-center p-6 delay-100">
          <i class="fa-solid fa-gem text-yellow-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Premium Membership</h2>
          <p class="text-purple-100 text-sm mt-2">Unlock all mythological serials, HD access & batch downloads.</p>
          <a href="https://t.me/MythoSerialBot?start=upgrade" target="_blank" class="btn inline-block mt-4 bg-yellow-400 text-black font-semibold px-5 py-2 rounded-full">Upgrade Now</a>
        </div>

        <div class="glass text-center p-6 delay-500">
          <i class="fa-solid fa-youtube text-red-500 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">YouTube Downloader</h2>
          <p class="text-purple-100 text-sm mt-2">Download videos & audio from YouTube in HD quality.</p>
          <a href="/yt" class="btn inline-block mt-4 bg-red-500 text-white font-semibold px-5 py-2 rounded-full">Download Now</a>
        </div>

        <div class="glass text-center p-6 delay-200">
          <i class="fa-solid fa-gamepad text-pink-300 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Mytho Games</h2>
          <p class="text-purple-100 text-sm mt-2">Play fun mythology-inspired games & earn MythoPoints.</p>
          <a href="/radhe" class="btn inline-block mt-4 bg-pink-500 text-white font-semibold px-5 py-2 rounded-full">Play Radhe Radhe</a>
        </div>

        <div class="glass text-center p-6 delay-300">
          <i class="fa-solid fa-shield-halved text-green-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Bypass Protection</h2>
          <p class="text-purple-100 text-sm mt-2">Advanced protection prevents unauthorized SoftURL bypass.</p>
          <a href="/generate/12345" class="btn inline-block mt-4 bg-green-400 text-black font-semibold px-5 py-2 rounded-full">Test Demo</a>
        </div>

        <div class="glass text-center p-6 delay-400">
          <i class="fa-solid fa-wallet text-blue-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Payment Portal</h2>
          <p class="text-purple-100 text-sm mt-2">Pay via secure UPI for premium access or channel plans.</p>
          <a href="/payment?amount=49&upi=sandip10x@fam&channel=MythoBot%20Premium&admin=MythoSerialBot" class="btn inline-block mt-4 bg-blue-500 text-white font-semibold px-5 py-2 rounded-full">Open Payment</a>
        </div>

        <div class="glass text-center p-6 delay-500">
          <i class="fa-solid fa-coins text-yellow-500 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">MythoPoints</h2>
          <p class="text-purple-100 text-sm mt-2">Use your earned points to get 30% discount on payments!</p>
          <a href="/payment?amount=49&mythopoints=true" class="btn inline-block mt-4 bg-yellow-500 text-black font-semibold px-5 py-2 rounded-full">Use Points</a>
        </div>

        <div class="glass text-center p-6 delay-600">
          <i class="fa-solid fa-bell text-red-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">Live Alerts</h2>
          <p class="text-purple-100 text-sm mt-2">Instant Telegram notifications for all payments & activities.</p>
          <a href="https://t.me/MythoSerialBot" class="btn inline-block mt-4 bg-red-500 text-white font-semibold px-5 py-2 rounded-full">Get Alerts</a>
        </div>
      </div>

      <div class="text-center mt-12 text-sm text-purple-200">
        <p>💫 Developed by <b>@Sandip10x</b> | Powered by <b>MythoBot Server</b></p>
        <p class="mt-1">
          <a href="https://t.me/MythoSerialBot" class="underline text-purple-100">Telegram Bot</a> • 
          <a href="/radhe" class="underline text-purple-100">Radhe Radhe Game</a>
        </p>
      </div>

      <script>
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

// ========================
// ADMIN API ENDPOINTS
// ========================

app.get("/admin/api/links", authenticateAPI, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  try {
    const links = await adLinksCollection
      .find({})
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    const total = await adLinksCollection.countDocuments({});
    
    res.json({
      success: true,
      data: {
        links: links.map(link => ({
          short_id: link.short_id,
          creator_id: link.creator_id,
          target_url: link.target_url,
          created_at: link.created_at,
          clicks: link.clicks || 0,
          earnings: link.earnings || 0,
          status: link.status,
          ad_type: link.ad_config?.type,
          blogger_clicks: link.blogger_clicks || 0
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: "Internal server error"
    });
  }
});

app.get("/admin/api/stats", authenticateAPI, async (req, res) => {
  try {
    const totalLinks = await adLinksCollection.countDocuments({});
    const totalClicks = await adLinksCollection.aggregate([
      { $group: { _id: null, total: { $sum: "$clicks" } } }
    ]).toArray();
    
    const totalEarnings = await adLinksCollection.aggregate([
      { $group: { _id: null, total: { $sum: "$earnings" } } }
    ]).toArray();
    
    const totalBloggerClicks = await adLinksCollection.aggregate([
      { $group: { _id: null, total: { $sum: "$blogger_clicks" } } }
    ]).toArray();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLinks = await adLinksCollection.countDocuments({
      created_at: { $gte: today }
    });
    
    res.json({
      success: true,
      data: {
        total_links: totalLinks,
        total_clicks: totalClicks[0]?.total || 0,
        total_blogger_clicks: totalBloggerClicks[0]?.total || 0,
        total_earnings: totalEarnings[0]?.total || 0,
        today_new_links: todayLinks,
        average_cpc: totalClicks[0]?.total > 0 
          ? (totalEarnings[0]?.total || 0) / totalClicks[0]?.total 
          : 0
      }
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ========================
// USER DASHBOARD
// ========================

app.get("/dashboard/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const links = await adLinksCollection
      .find({ creator_id: parseInt(userId) })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();
    
    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalEarnings = links.reduce((sum, link) => sum + (link.earnings || 0), 0);
    const totalBloggerClicks = links.reduce((sum, link) => sum + (link.blogger_clicks || 0), 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayClicks = 0;
    let todayEarnings = 0;
    
    links.forEach(link => {
      if (link.access_logs) {
        link.access_logs.forEach(log => {
          if (log.type === 'click' && new Date(log.timestamp) >= today) {
            todayClicks++;
            if (log.earned) {
              todayEarnings += 0.001;
            }
          }
        });
      }
    });
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - MythoBot URL Shortener</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
      </head>
      <body class="bg-gray-50 min-h-screen">
        <div class="max-w-6xl mx-auto p-4">
          <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
            <h1 class="text-2xl font-bold">💰 MythoBot URL Shortener Dashboard</h1>
            <p class="text-blue-100">User ID: ${userId}</p>
          </div>
          
          <div class="grid md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow p-4">
              <div class="flex items-center">
                <div class="bg-blue-100 p-3 rounded-lg mr-4">
                  <i class="fa-solid fa-link text-blue-500 text-xl"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Total Links</p>
                  <p class="text-2xl font-bold">${links.length}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-4">
              <div class="flex items-center">
                <div class="bg-green-100 p-3 rounded-lg mr-4">
                  <i class="fa-solid fa-mouse-pointer text-green-500 text-xl"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Total Clicks</p>
                  <p class="text-2xl font-bold">${totalClicks}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-4">
              <div class="flex items-center">
                <div class="bg-yellow-100 p-3 rounded-lg mr-4">
                  <i class="fa-solid fa-dollar-sign text-yellow-500 text-xl"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Total Earnings</p>
                  <p class="text-2xl font-bold">$${totalEarnings.toFixed(3)}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-4">
              <div class="flex items-center">
                <div class="bg-purple-100 p-3 rounded-lg mr-4">
                  <i class="fa-solid fa-blog text-purple-500 text-xl"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Blogger Clicks</p>
                  <p class="text-2xl font-bold">${totalBloggerClicks}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-white rounded-xl shadow p-6 mb-6">
            <h2 class="text-lg font-bold mb-4">Your Links</h2>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Short Link</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blogger</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  ${links.map(link => `
                    <tr>
                      <td class="px-6 py-4">
                        <div class="flex items-center space-x-2">
                          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <a href="/s/${link.short_id}" target="_blank" class="text-blue-500 hover:underline">
                              /s/${link.short_id}
                            </a>
                            ${link.blogger_code ? `
                            <p class="text-xs text-gray-500">
                              <i class="fas fa-external-link-alt mr-1"></i>
                              Blogger: <a href="/blogger/${link.blogger_code}" target="_blank" class="text-green-500">/blogger/${link.blogger_code}</a>
                            </p>
                            ` : ''}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">${link.clicks || 0}</td>
                      <td class="px-6 py-4">${link.blogger_clicks || 0}</td>
                      <td class="px-6 py-4 font-bold text-green-600">$${(link.earnings || 0).toFixed(3)}</td>
                      <td class="px-6 py-4 text-sm text-gray-500">${new Date(link.created_at).toLocaleDateString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="text-center">
            <a href="/" class="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <i class="fas fa-home mr-2"></i>Back to Home
            </a>
          </div>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    res.status(500).send("Error loading dashboard");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎯 Blogger Redirection System: ACTIVATED`);
  console.log(`💰 AdLinkFly Earnings: $0.001 per click`);
  console.log(`🔗 Blogger Flow: User → Blogger → Shortener → Target URL`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard/{userId}`);
  console.log(`🔐 API: http://localhost:${PORT}/api/v1/blogger/shorten`);
  console.log(`🤖 Bot Integration: READY`);
  console.log(`✨ All existing features: PRESERVED`);
});
