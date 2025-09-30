// index.js
import express from "express";
import { MongoClient } from "mongodb";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB setup (use your Koyeb secret or .env variable)
const MONGO_URI = process.env.DATABASE_URI;  // set this in Koyeb secrets
if (!MONGO_URI) {
  console.error("❌ Missing MONGODB_URI in environment variables");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);
let doubleCollection;
let urlShortenerCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("mythobot"); // change if you use another DB name
  doubleCollection = db.collection("double_points");
  urlShortenerCollection = db.collection("url_shortener");
  console.log("✅ MongoDB connected");
}
connectDB();

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
  const botUsername = "MythoSerialBot"; // change to your bot username
  const deepLink = `https://t.me/${botUsername}?start=double_${userId}_${token}`;

  res.redirect(deepLink);
});

// 🔹 Bypass protection for URL shortener with roast messages
app.get("/bypass/:userId", async (req, res) => {
  const { userId } = req.params;
  
  console.log(`--- incoming /bypass request for user=${userId} ---`);
  console.log("referer:", req.get("referer"));
  console.log("user-agent:", req.get("user-agent"));
  console.log("originalUrl:", req.originalUrl);
  
  // Get the target URL from query parameters
  const { url } = req.query;
  
  // Check if this is a direct bypass attempt (no referer or not from softurl)
  const referer = req.get("referer") || "";
  const isBypassAttempt = !referer.includes("softurl.in");
  
  // Fun roast messages for bypass attempts
  const roastMessages = [
    "🚫 Oops! Trying to be a hacker? Even my grandma follows links better!",
    "🤡 Nice try, bypass bandit! But this isn't a shortcut, it's a dead end!",
    "🎯 Bypass detected! Your hacking skills need more practice, padawan!",
    "🔐 Awww, trying to skip the line? The URL feels offended!",
    "🧐 I see what you did there! Too bad I see everything!",
    "🚷 No ticket, no entry! This isn't a free ride, buddy!",
    "🎪 Welcome to the circus! You're the clown trying to bypass!",
    "📵 Error 404: Bypass skills not found!",
    "🦸 Wannabe superhero! Even Superman follows links properly!",
    "🍌 This isn't a banana peel you can slip through!",
    "🎮 Game Over! Bypass attempt failed! Insert coin to try again!",
    "🧙 You shall not pass! - Gandalf (probably talking about URL bypass)",
    "🐌 Your bypass attempt is slower than a snail on vacation!",
    "🎰 Jackpot! You found the 'I tried to bypass' prize! It's nothing!",
    "🔍 Sherlock Holmes couldn't bypass this, what makes you think you can?",
    "🍪 No cookies for bypassers! The URL is on a diet!",
    "🚀 Trying to launch directly? Missing rocket fuel (aka proper link)!",
    "🎵 Why you gotta be so bypass? Just follow the link like everyone else!",
    "📚 Bypass 101: You failed the exam! Better luck next semester!",
    "🎪 Stop clowning around and use the proper link!",
    "🕵️‍♂️ Secret agent mode activated... and failed! Mission impossible!",
    "💀 Rest in peace, your bypass attempt! 2024-2024",
    "🎨 You're painting outside the lines! Stay within the link!",
    "🍕 Even pizza delivery follows better routes than your bypass attempt!",
    "👻 Spooky! Your bypass attempt vanished into thin air!",
    "🎪 Three rings of failure: Bypass attempt, no skills, try again!",
    "🚦 Red light! Stop trying to bypass and follow the traffic!",
    "🎯 Bullseye! You hit the 'wrong way' target perfectly!",
    "🍦 This isn't an ice cream cone you can lick from the bottom!",
    "🎮 Player 1: Bypass Attempt → Game Over! Insert proper link to continue!"
  ];

  // If no URL provided and it's a bypass attempt, show roast page
  if (!url && isBypassAttempt) {
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          .user-info {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            font-family: monospace;
          }
          .button {
            background: #ff6b6b;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.3s;
          }
          .button:hover {
            transform: scale(1.1);
            background: #ff5252;
          }
          .fireworks {
            font-size: 30px;
            animation: bounce 2s infinite;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .attempt-counter {
            background: rgba(255,255,255,0.2);
            padding: 10px;
            border-radius: 10px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="fireworks">🎆🎇✨</div>
        <h1>🚫 BYPASS DETECTED! 🚫</h1>
        
        <div class="roast-container">
          <div class="emoji">🤡🎪👻</div>
          <div class="roast-message">"${randomRoast}"</div>
          <div class="emoji">🔐🚷🕵️‍♂️</div>
        </div>

        <div class="user-info">
          <h3>📊 Bypass Attempt Details:</h3>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>IP Address:</strong> ${req.ip}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Status:</strong> <span style="color: #ff6b6b;">EPIC FAIL</span> 🎯</p>
        </div>

        <div class="attempt-counter">
          <h3>📈 Your Bypass Stats:</h3>
          <p>Attempts Today: ${Math.floor(Math.random() * 10) + 1}</p>
          <p>Success Rate: 0% 🎉</p>
          <p>Skill Level: Needs Improvement 📉</p>
        </div>

        <div style="margin: 20px 0;">
          <a href="https://t.me/MythoSerialBot" class="button">🤖 Go To Proper Bot</a>
          <a href="/" class="button">🏠 Server Home</a>
        </div>

        <div style="margin-top: 30px; font-size: 14px; opacity: 0.8;">
          <p>💡 Pro Tip: Stop trying to bypass and use the bot like a normal person!</p>
          <p>🎵 Now playing: "Another One Bites The Dust - Bypass Edition"</p>
        </div>
      </body>
      </html>
    `);
  }

  // If no URL provided but it's a legitimate access, show normal info
  if (!url) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MythoBot URL Bypass Protection</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .success { background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; }
          code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>🛡️ MythoBot URL Bypass Protection</h1>
        
        <div class="success">
          <h3>✅ Legitimate Access Detected</h3>
          <p>You're accessing this endpoint properly through SoftURL!</p>
        </div>
        
        <div class="info">
          <h3>📊 Request Information:</h3>
          <p><strong>User ID:</strong> <code>${userId}</code></p>
          <p><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
          <p><strong>IP Address:</strong> ${req.ip}</p>
          <p><strong>Status:</strong> <span style="color: green;">VALID ACCESS</span> ✅</p>
        </div>
        
        <p>🔗 <a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
      </body>
      </html>
    `);
  }
  
  // Validate URL for legitimate accesses
  try {
    const urlObj = new URL(url);
    
    // Log the access attempt with bypass flag
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      original_url: url,
      accessed_at: new Date(),
      ip: req.ip,
      user_agent: req.get("user-agent"),
      referer: req.get("referer"),
      is_bypass_attempt: isBypassAttempt,
      blocked: isBypassAttempt
    });
    
    if (isBypassAttempt) {
      // If bypass attempt with URL, show another roast but don't redirect
      const randomRoast = roastMessages[Math.floor(Math.random() * roastMessages.length)];
      
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Nice Try! 🚫</title>
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
            .container {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
              border: 2px solid rgba(255,255,255,0.2);
            }
            .emoji { font-size: 60px; margin: 20px; }
            .message { font-size: 22px; margin: 20px 0; }
            .url { 
              background: rgba(0,0,0,0.3); 
              padding: 10px; 
              border-radius: 10px; 
              margin: 15px 0;
              word-break: break-all;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emoji">🎯🚫🤦‍♂️</div>
            <h1>SMART BUT NOT SMART ENOUGH!</h1>
            <div class="message">"${randomRoast}"</div>
            <div class="emoji">🔗❌📛</div>
            
            <div class="url">
              <strong>Target URL:</strong><br>
              ${url}
            </div>
            
            <p>You thought you could bypass and go directly to:<br>
            <code>${url}</code></p>
            
            <p style="font-size: 18px; margin-top: 30px;">
              🎪 <strong>Sorry, the circus is closed for bypassers!</strong><br>
              Use the proper shortened link next time! 🤡
            </p>
            
            <a href="https://t.me/MythoSerialBot" style="
              display: inline-block;
              background: white;
              color: #ff6b6b;
              padding: 12px 24px;
              border-radius: 25px;
              text-decoration: none;
              margin-top: 20px;
              font-weight: bold;
            ">🎪 Go To Proper Bot 🎪</a>
          </div>
        </body>
        </html>
      `);
    }
    
    console.log(`✅ User ${userId} accessing URL: ${url}`);
    
    // Only redirect for legitimate accesses
    res.redirect(url);
    
  } catch (error) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid URL</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #f8d7da; padding: 15px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Invalid URL</h2>
          <p>The provided URL is invalid: <code>${url}</code></p>
          <p>Error: ${error.message}</p>
        </div>
        <p><a href="/bypass/${userId}">← Back to bypass page</a></p>
      </body>
      </html>
    `);
  }
});

// 🔹 URL Shortener API endpoint
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
    
    // Generate bypass URL
    const bypassUrl = `https://${req.hostname}/bypass/${userId}?url=${encodeURIComponent(url)}`;
    
    res.json({
      success: true,
      original_url: url,
      bypass_url: bypassUrl,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
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
      .find({ user_id: parseInt(userId) })
      .sort({ accessed_at: -1 })
      .limit(50)
      .toArray();
    
    res.json({
      success: true,
      user_id: userId,
      total_accesses: stats.length,
      accesses: stats
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MythoBot Server</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .endpoints { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .feature { background: #e7f3ff; padding: 10px; margin: 10px 0; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>✅ MythoBot Server is Running</h1>
      
      

      <div class="feature">
        <h3>🎯 New Bypass Protection Features:</h3>
        <p>• 30+ Random Roast Messages</p>
        <p>• Animated CSS with gradients</p>
        <p>• User attempt tracking</p>
        <p>• Mobile-responsive design</p>
        <p>• Professional vs Roast mode</p>
      </div>
      
      <p>🔗 <a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎯 Bypass protection with roast messages activated!`);
  console.log(`🤡 Ready to roast some bypassers!`);
});
