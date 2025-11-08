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
app.get("/Bypass/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;
  const { target } = req.query;
  
  console.log(`--- incoming /Bypass request for user=${userId} ---`);
  console.log("referer:", req.get("referer"));
  console.log("user-agent:", req.get("user-agent"));
  console.log("target URL:", target);
  
  // Check if this is a direct bypass attempt (no referer or not from softurl)
  const referer = req.get("referer") || "";
  const isBypassAttempt = !referer.includes("softurl.in");
  
  // If no target URL provided, show info page
  if (!target) {
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
          <p><strong>Token:</strong> <code>${token}</code></p>
          <p><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
          <p><strong>IP Address:</strong> ${req.ip}</p>
          <p><strong>Status:</strong> <span style="color: green;">VALID ACCESS</span> ✅</p>
        </div>
        
        <p>🔗 <a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
      </body>
      </html>
    `);
  }
  
  // Decode the target URL
  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(target);
  } catch (error) {
    return res.status(400).send("Invalid URL encoding");
  }

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

  // If it's a bypass attempt, show roast page
  if (isBypassAttempt) {
    const randomRoast = roastMessages[Math.floor(Math.random() * roastMessages.length)];
    
    // Log the blocked bypass attempt
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: token,
      original_url: decodedTarget,
      accessed_at: new Date(),
      ip: req.ip,
      user_agent: req.get("user-agent"),
      referer: req.get("referer"),
      is_bypass_attempt: true,
      blocked: true,
      status: "BLOCKED - Bypass attempt"
    });
    
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
          <p><strong>Status:</strong> <span style="color: #ff6b6b;">BLOCKED - Bypass Attempt</span> 🎯</p>
        </div>

        <div style="margin: 20px 0;">
          <a href="https://t.me/MythoSerialBot" class="button">🤖 Go To Proper Bot</a>
          <a href="/" class="button">🏠 Server Home</a>
        </div>
      </body>
      </html>
    `);
  }

  // LEGITIMATE ACCESS FROM SOFTURL - REDIRECT TO TARGET URL
  try {
    // Validate the URL
    new URL(decodedTarget);
    
    // Log the successful legitimate access
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: token,
      original_url: decodedTarget,
      accessed_at: new Date(),
      ip: req.ip,
      user_agent: req.get("user-agent"),
      referer: req.get("referer"),
      is_bypass_attempt: false,
      blocked: false,
      status: "SUCCESS - Redirected to target"
    });
    
    console.log(`✅ Legitimate access from SoftURL - Redirecting user ${userId} to: ${decodedTarget}`);
    
    // REDIRECT to the target URL for legitimate SoftURL accesses
    res.redirect(decodedTarget);
    
  } catch (error) {
    // Invalid URL handling
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: token,
      original_url: decodedTarget,
      accessed_at: new Date(),
      ip: req.ip,
      user_agent: req.get("user-agent"),
      referer: req.get("referer"),
      is_bypass_attempt: false,
      blocked: true,
      status: "ERROR - Invalid URL"
    });
    
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
          <p>The provided URL is invalid: <code>${decodedTarget}</code></p>
          <p>Error: ${error.message}</p>
        </div>
        <p><a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
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
    
    // Generate token for the URL
    const token = crypto.randomBytes(8).toString("hex");
    
    // Generate bypass URL
    const bypassUrl = `https://${req.hostname}/Bypass/${userId}/${token}?target=${encodeURIComponent(url)}`;
    
    res.json({
      success: true,
      original_url: url,
      bypass_url: bypassUrl,
      token: token,
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
// 🔹 Payment Page Endpoint for MythoBot with UPI Apps Redirect
app.get("/payment", (req, res) => {
  const { amount, upi, channel, admin } = req.query;
  
  // Default values if not provided
  const baseAmount = amount || 49;
  const upiId = upi || "mythobot@ybl";
  const channelName = channel || "MythoBot Premium";
  const adminUsername = admin || "MythoSerialBot";

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
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
        <main class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden mytho-glow">
            
            <!-- Header Section -->
            <div class="p-8 text-center border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div class="flex justify-center mb-4">
                    <i class="fa-solid fa-robot fa-3x text-white"></i>
                </div>
                <h1 class="text-2xl font-bold">MythoBot Premium Access</h1>
                <p class="text-purple-200 mt-2">Unlock Exclusive Features & Double Points</p>
            </div>

            <!-- Payment Details Section -->
            <div class="p-6 sm:p-8 text-center">
                <p class="text-sm font-medium text-slate-600">One-time payment only</p>
                <p class="text-5xl font-extrabold text-purple-600 my-2" id="payment-amount">₹${baseAmount}</p>
                <p class="text-xs text-slate-500 mb-6">Unique amount for your transaction</p>
                
                <div id="qr-code-container" class="flex justify-center items-center h-52 w-52 mx-auto bg-slate-50 rounded-lg p-2 border-2 border-dashed border-purple-200">
                    <div id="loader" class="loader"></div>
                </div>
                <p class="text-sm text-slate-600 mt-4 font-semibold">Scan QR to pay via any UPI App</p>

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
                const amountElement = document.getElementById('payment-amount');
                const loader = document.getElementById('loader');
                const qrContainer = document.getElementById('qr-code-container');
                const upiIdElement = document.getElementById('upi-id-text');
                const copyButton = document.getElementById('copy-button');
                const copySpan = copyButton.querySelector('.copy-text-span');
                const originalCopyHTML = copySpan.innerHTML;
                const upiAppsContainer = document.getElementById('upi-apps-container');

                // Add small random variation to amount
                const variation = Math.floor(Math.random() * 5) - 2;
                const finalAmount = ${baseAmount} + variation;
                const displayAmount = finalAmount > 0 ? finalAmount : ${baseAmount};
                amountElement.textContent = \`₹\${displayAmount}\`;
                
                // Generate UPI link
                const upiLink = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${displayAmount}.00&cu=INR\`;
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
                            const intentUrl = \`intent://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${displayAmount}.00&cu=INR#Intent;package=\${app.package};scheme=upi;end;\`;
                            const upiUrl = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${displayAmount}.00&cu=INR\`;
                            
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

// 🔹 UPI Deep Link API
app.get("/upi-redirect", (req, res) => {
  const { upi, amount, name } = req.query;
  
  const upiId = upi || "mythobot@ybl";
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
    payment_page: `https://${req.hostname}/payment?amount=${amount || 49}&upi=${upi || "mythobot@ybl"}&channel=${channel || "MythoBot Premium"}&admin=${admin || "MythoSerialBot"}`,
    upi_redirect: `https://${req.hostname}/upi-redirect?upi=${upi || "mythobot@ybl"}&amount=${amount || 49}&name=${channel || "MythoBot Premium"}`,
    config: {
      amount: amount || 49,
      upi_id: upi || "mythobot@ybl",
      channel_name: channel || "MythoBot Premium", 
      admin_username: admin || "MythoSerialBot"
    },
    message: "MythoBot Premium Access Payment"
  });
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
        <h3>🎯 Bypass Protection Features:</h3>
        <p>• 30+ Random Roast Messages for bypassers</p>
        <p>• Automatic redirect for legitimate SoftURL accesses</p>
        <p>• Detailed access logging</p>
        <p>• Mobile-responsive design</p>
      </div>
      
      <p>🔗 <a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
    </body>
    </html>
  `);
})
// 🔹 Premium Subscription Payment Endpoint
app.get("/premium-payment", async (req, res) => {
  const { user_id, plan, duration, amount, upi, admin } = req.query;
  
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
  const finalAmount = amount || selectedPlan.default_amount;
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
    amount: parseInt(finalAmount),
    duration: parseInt(finalDuration),
    status: 'pending',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
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
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
        <main class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden mytho-glow">
            
            <!-- Header Section -->
            <div class="p-6 text-center border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <h1 class="text-2xl font-bold">${planName}</h1>
                <p class="text-purple-200 mt-2">Automatic Activation • ${finalDuration} Days</p>
            </div>

            <!-- Payment Details -->
            <div class="p-6 text-center">
                <p class="text-5xl font-extrabold text-purple-600 my-2">₹${finalAmount}</p>
                <p class="text-sm text-slate-600">User ID: <code>${user_id}</code></p>
                
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
            statusCheckInterval = setInterval(checkPaymentStatus, 5000); // Check every 5 seconds
        </script>
    </body>
    </html>
  `);
});

// 🔹 Payment Status Check Endpoint
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
  
  // Check if payment is completed (you'll need to implement actual UPI verification)
  // This is a placeholder - you'll need to integrate with a UPI verification service
  const isPaymentVerified = await verifyUPIPayment(paymentSession);
  
  if (isPaymentVerified) {
    await paymentCollection.updateOne(
      { payment_token: token },
      { $set: { status: 'completed', verified_at: new Date() } }
    );
    
    // Activate premium for user
    await activatePremiumSubscription(paymentSession.user_id, paymentSession.duration);
    
    return res.json({ status: 'completed', user_id: paymentSession.user_id, plan: paymentSession.plan });
  }
  
  res.json({ status: 'pending' });
});

// 🔹 UPI Payment Verification (Placeholder - Implement based on your payment gateway)
async function verifyUPIPayment(paymentSession) {
  // Implement actual UPI payment verification here
  // This could involve:
  // 1. Checking with your payment gateway API
  // 2. Webhook verification
  // 3. Manual verification through admin panel
  // 4. Bank statement parsing
  
  // For now, return false - you'll need to implement this based on your payment processor
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎯 Bypass protection with roast messages activated!`);
  console.log(`✅ Legitimate SoftURL accesses will redirect to target URLs`);
  console.log(`🤡 Bypass attempts will get roasted!`);
});
