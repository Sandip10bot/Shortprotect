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
});
// 🔹 Payment Page Endpoint
app.get("/payment", (req, res) => {
  const { amount, upi, channel, admin } = req.query;
  
  // Default values if not provided
  const baseAmount = amount || 20;
  const upiId = upi || "Sandip10@fam";
  const channelName = channel || "MythoserialBot";
  const adminUsername = admin || "sandip10x";

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Telegram Subscription</title>
        <!-- Tailwind CSS CDN -->
        <script src="https://cdn.tailwindcss.com"></script>
        <!-- Font Awesome CDN -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
        <link rel="icon" type="image/png" href="https://i.postimg.cc/Y0MsZM32/favicon.jpg">
        <style>
            .loader { border: 4px solid #f3f3f3; border-radius: 50%; border-top: 4px solid #4f46e5; width: 40px; height: 40px; animation: spin 1.5s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            /* Custom Font */
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; -webkit-user-select: none; -ms-user-select: none; user-select: none; }
        </style>
    </head>
    <body class="bg-slate-100 flex items-center justify-center min-h-screen p-4">

        <main class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            
            <!-- Header Section -->
            <div class="p-8 text-center border-b bg-slate-50">
                <div class="flex justify-center mb-4">
                    <i class="fa-solid fa-shield-halved fa-3x text-indigo-600"></i>
                </div>
                <h1 class="text-2xl font-bold text-slate-800">Join Our Premium Channel</h1>
                <p class="text-slate-500 mt-2">Get Instant & Secure Access</p>
            </div>

            <!-- Payment Details Section -->
            <div class="p-6 sm:p-8 text-center">
                <p class="text-sm font-medium text-slate-600">You only have to pay</p>
                <p class="text-5xl font-extrabold text-indigo-600 my-2" id="payment-amount">₹${baseAmount}</p>
                <p class="text-xs text-slate-500 mb-6">(This amount is unique for your transaction)</p>
                
                <div id="qr-code-container" class="flex justify-center items-center h-52 w-52 mx-auto bg-slate-50 rounded-lg p-2">
                    <div id="loader" class="loader"></div>
                </div>
                <p class="text-sm text-slate-600 mt-4 font-semibold">Scan QR to pay via any UPI App</p>

                <!-- Supported Apps Icons -->
                <div class="flex justify-center items-center gap-6 mt-4 text-slate-400">
                    <i class="fa-brands fa-google-pay fa-2x"></i>
                    <i class="fa-solid fa-mobile-screen-button fa-2x"></i>
                    <i class="fa-solid fa-credit-card fa-2x"></i>
                </div>

                <div class="flex items-center my-6">
                    <hr class="w-full border-slate-200"><span class="px-2 text-xs font-medium text-slate-400">OR</span><hr class="w-full border-slate-200">
                </div>

                <p class="text-sm text-slate-600 font-semibold mb-2">Copy UPI ID</p>
                <div class="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <span class="font-mono text-slate-700 text-lg break-all" id="upi-id-text">${upiId}</span>
                    <button id="copy-button" class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-indigo-700 transition-all flex-shrink-0 w-28">
                        <span class="copy-text-span"><i class="fa-regular fa-copy mr-2"></i>Copy</span>
                    </button>
                </div>
            </div>
            
            <!-- Instructions Section -->
            <div class="bg-slate-50 p-6 sm:p-8">
                <h3 class="text-lg font-bold text-slate-800 text-center">What's Next?</h3>
                <p class="text-slate-600 text-center mt-2 text-sm">After payment, send Payment Screenshot to our Admin on Telegram to get your Subscription Link.</p>
                <a href="https://t.me/${adminUsername}" class="mt-6 w-full flex items-center justify-center gap-3 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 shadow-lg shadow-sky-500/30">
                    <i class="fa-brands fa-telegram fa-lg"></i>
                    <span>Send Payment Screenshot</span>
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

                const variation = Math.floor(Math.random() * 3) - 1;
                const finalAmount = ${baseAmount} + variation;
                amountElement.textContent = \`₹\${finalAmount}\`;
                
                const upiLink = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR\`;
                const qrApiUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent(upiLink)}&qzone=1\`;
                const qrImage = new Image();
                qrImage.src = qrApiUrl;
                qrImage.alt = 'Scan to Pay';
                qrImage.className = 'rounded-lg';
                qrImage.onload = () => { 
                    loader.style.display = 'none';
                    qrContainer.appendChild(qrImage);
                };

                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(upiIdElement.textContent).then(() => {
                        copySpan.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Copied!';
                        copyButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                        copyButton.classList.add('bg-green-600');
                        setTimeout(() => {
                            copySpan.innerHTML = originalCopyHTML;
                            copyButton.classList.remove('bg-green-600');
                            copyButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
                        }, 2000);
                    });
                });
            });
        </script>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // 1. Disable Right-Click Context Menu
                document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                });

                // 2. Disable Keyboard Shortcuts (Ctrl+C, Ctrl+U, F12)
                document.addEventListener('keydown', function(e) {
                    // Disable Ctrl+C (Copy)
                    if (e.ctrlKey && e.key === 'c') {
                        e.preventDefault();
                    }
                    // Disable Ctrl+U (View Source)
                    if (e.ctrlKey && e.key === 'u') {
                        e.preventDefault();
                    }
                    // Disable F12 (Developer Tools)
                    if (e.key === 'F12') {
                        e.preventDefault();
                    }
                });

                // 3. Disable Dragging of elements
                document.addEventListener('dragstart', function(e) {
                    e.preventDefault();
                });
            });
        </script>
    </body>
    </html>
  `);
});

// 🔹 Payment API endpoint (for programmatic access)
app.get("/payment/api", (req, res) => {
  const { amount, upi, channel, admin } = req.query;
  
  res.json({
    success: true,
    payment_page: `https://${req.hostname}/payment?amount=${amount || 20}&upi=${upi || "demo@ybl"}&channel=${channel || "Premium Channel"}&admin=${admin || "subscribe_my_tg_bot"}`,
    config: {
      amount: amount || 149,
      upi_id: upi || "Sandip10x@fam",
      channel_name: channel || "MythoserialBot",
      admin_username: admin || "sandip10x"
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎯 Bypass protection with roast messages activated!`);
  console.log(`✅ Legitimate SoftURL accesses will redirect to target URLs`);
  console.log(`🤡 Bypass attempts will get roasted!`);
});
