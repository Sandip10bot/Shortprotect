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
    const db = client.db("Mytho");
    
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
// 1. THE ENTRY SHIELD (5-Sec Wait - MYTHO PURPLE THEME)
// ========================
function renderAntiBypassPage(res, targetUrl) {
    const b64Url = Buffer.from(targetUrl).toString('base64');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Securing Connection...</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: radial-gradient(circle at 50% 50%, #2e1065, #090414); color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
              .container { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); padding: 40px; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.3); box-shadow: 0 0 40px rgba(168, 85, 247, 0.2); max-width: 400px; width: 90%; }
              h2 { margin-bottom: 10px; font-size: 24px; color: #d8b4fe; text-shadow: 0 0 10px rgba(216, 180, 254, 0.5); }
              p { color: #cbd5e1; font-size: 15px; margin-bottom: 20px; line-height: 1.5; }
              
              .loader {
                  border: 4px solid rgba(255,255,255,0.05);
                  border-top: 4px solid #a855f7;
                  border-radius: 50%; width: 50px; height: 50px;
                  animation: spin 1s linear infinite; margin: 0 auto 20px auto;
                  box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
              }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              
              .manual-box { display: none; background: rgba(168, 85, 247, 0.1); border: 1px solid #a855f7; padding: 15px; border-radius: 12px; margin-top: 20px; }
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
          statusText.innerHTML = 'Automatically proceeding in <span id="countdown" style="font-weight:bold;color:#f3e8ff;">5</span> seconds...';
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
// 2. THE EXIT SHIELD (Silent Telegram Launcher - MYTHO THEME)
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
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: radial-gradient(circle at 50% 50%, #2e1065, #090414); color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .container { text-align: center; background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); padding: 40px; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.3); box-shadow: 0 0 40px rgba(168, 85, 247, 0.2); max-width: 400px; width: 90%; }
              h2 { font-size: 24px; margin-bottom: 10px; color: #d8b4fe; text-shadow: 0 0 10px rgba(216, 180, 254, 0.5); }
              p { color: #cbd5e1; font-size: 14px; margin-bottom: 30px; line-height: 1.6; }
              .btn { background: linear-gradient(135deg, #a855f7, #7e22ce); color: white; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; width: 100%; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
              .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(168, 85, 247, 0.6); }
          </style>
      </head>
      <body>
      <div class="container">
          <div style="font-size: 50px; margin-bottom: 15px; filter: drop-shadow(0 0 10px #a855f7);">✨</div>
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

// ========================
// THE BYPASS TRAP (New Game: Mytho Runner with Trident Obstacle)
// ========================
function renderBypassPage(res) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Access Denied - Bypasser Run 🛑</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');
              
              body { 
                  margin: 0; padding: 0; background: #090414; 
                  font-family: 'Poppins', sans-serif; color: #fff; 
                  display: flex; align-items: center; justify-content: center; 
                  min-height: 100vh; overflow: hidden;
                  background-image: radial-gradient(circle at 50% 50%, #2e1065, #090414);
                  touch-action: manipulation;
              }
              
              .glass-card { 
                  background: rgba(255, 255, 255, 0.03); 
                  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                  border: 1px solid rgba(168, 85, 247, 0.3); 
                  border-radius: 24px; padding: 30px; 
                  text-align: center; max-width: 500px; width: 90%;
                  box-shadow: 0 0 50px rgba(168, 85, 247, 0.15); 
                  position: relative;
              }
              
              h1 { color: #d8b4fe; margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 0 15px rgba(216, 180, 254, 0.5); }
              .roast { font-size: 13px; color: #cbd5e1; margin-bottom: 20px; line-height: 1.5; }
              .roast b { color: #f3e8ff; }

              /* Game Screen */
              #game-container {
                  width: 100%; height: 180px; 
                  background: rgba(15, 5, 24, 0.6); border: 2px dashed rgba(168, 85, 247, 0.4);
                  border-radius: 12px; position: relative; overflow: hidden;
                  margin-bottom: 20px; cursor: pointer;
                  box-shadow: inset 0 0 20px rgba(168, 85, 247, 0.1);
              }
              
              .ground {
                  position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
                  background: rgba(168, 85, 247, 0.5);
                  box-shadow: 0 0 10px #a855f7;
              }

              #player {
                  font-size: 45px; position: absolute;
                  bottom: 2px; left: 30px; 
                  line-height: 1; z-index: 10;
                  filter: drop-shadow(0 0 8px rgba(255,255,255,0.4));
              }

              .jump {
                  animation: jumpAnim 0.5s ease-out;
              }

              @keyframes jumpAnim {
                  0% { bottom: 2px; }
                  40% { bottom: 100px; }
                  50% { bottom: 105px; }
                  60% { bottom: 100px; }
                  100% { bottom: 2px; }
              }

              #obstacle {
                  font-size: 45px; position: absolute;
                  bottom: 2px; right: -50px; 
                  line-height: 1; z-index: 5;
                  display: none; filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.8));
              }

              .move-obstacle {
                  animation: obstacleAnim 1.5s infinite linear;
              }

              @keyframes obstacleAnim {
                  0% { right: -50px; }
                  100% { right: 100%; }
              }

              .top-bar {
                  display: flex; justify-content: space-between;
                  font-weight: 600; font-size: 16px; color: #d8b4fe;
                  margin-bottom: 15px; padding: 0 10px;
              }

              #start-overlay {
                  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                  background: rgba(9, 4, 20, 0.8); backdrop-filter: blur(3px);
                  display: flex; flex-direction: column; align-items: center; justify-content: center;
                  z-index: 20; border-radius: 12px;
              }

              .btn {
                  background: linear-gradient(135deg, #a855f7, #7e22ce);
                  color: white; border: none; padding: 10px 20px;
                  border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px;
                  font-family: 'Poppins', sans-serif;
                  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
                  transition: transform 0.2s;
              }
              .btn:active { transform: scale(0.95); }
              
              #message-box { display: none; margin-top: 15px; animation: fadeIn 0.5s; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          </style>
      </head>
      <body>
          <div class="glass-card">
              <h1>Bypass Detected 🚫</h1>
              <p class="roast">
                  Bot ko dhoka dene chale the? Server ne pakad liya! 
                  <br>Ab chup chap <b>Tap/Space</b> dabao aur bhaago!
              </p>
              
              <div class="top-bar">
                  <span>Score: <span id="score">0</span></span>
                  <span>Target: 100</span>
              </div>
              
              <div id="game-container">
                  <div id="start-overlay">
                      <p style="margin:0 0 10px 0; color:#e9d5ff; font-weight:600;">Tap or Press Space to Jump</p>
                      <button class="btn" id="start-btn">Start Running</button>
                  </div>
                  
                  <div id="player">🏃‍♂️</div>
                  <div id="obstacle">🔱</div>
                  <div class="ground"></div>
              </div>

              <div id="message-box">
                  <h2 id="msg-title" style="margin:0 0 5px 0; color:#ef4444;">Game Over!</h2>
                  <p id="msg-desc" style="font-size: 14px; color: #cbd5e1; margin-bottom:15px; line-height: 1.5;">
                      Pakde gaye! Tumhara bypass ka sapna toot gaya. Wapas Telegram jao aur sahi link par click karo.
                  </p>
                  <button class="btn" style="background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);" onclick="window.location.href='https://t.me/MythoSerialBot'">Go Back To Bot</button>
              </div>
          </div>
  
          <script>
              const player = document.getElementById("player");
              const obstacle = document.getElementById("obstacle");
              const startBtn = document.getElementById("start-btn");
              const startOverlay = document.getElementById("start-overlay");
              const scoreSpan = document.getElementById("score");
              const messageBox = document.getElementById("message-box");
              const msgTitle = document.getElementById("msg-title");
              const msgDesc = document.getElementById("msg-desc");
              const gameContainer = document.getElementById("game-container");

              let isJumping = false;
              let isGameOver = false;
              let score = 0;
              let checkCollision;
              let scoreInterval;

              function jump() {
                  if (isJumping || isGameOver) return;
                  
                  isJumping = true;
                  player.classList.add("jump");
                  
                  if (navigator.vibrate) navigator.vibrate(20);

                  setTimeout(() => {
                      player.classList.remove("jump");
                      isJumping = false;
                  }, 500); 
              }

              document.addEventListener("keydown", (e) => {
                  if (e.code === "Space") jump();
              });
              gameContainer.addEventListener("touchstart", (e) => {
                  e.preventDefault(); 
                  jump();
              }, { passive: false });
              gameContainer.addEventListener("mousedown", jump);

              function startGame() {
                  isGameOver = false;
                  score = 0;
                  scoreSpan.innerText = score;
                  startOverlay.style.display = "none";
                  messageBox.style.display = "none";
                  
                  obstacle.style.display = "block";
                  obstacle.style.animation = "obstacleAnim 1.5s infinite linear";

                  scoreInterval = setInterval(() => {
                      score++;
                      scoreSpan.innerText = score;
                      
                      if(score === 30) obstacle.style.animationDuration = "1.3s";
                      if(score === 60) obstacle.style.animationDuration = "1.1s";
                      if(score === 90) obstacle.style.animationDuration = "0.9s";

                      if (score >= 100) {
                          endGame(true);
                      }
                  }, 100);

                  checkCollision = setInterval(() => {
                      let playerTop = parseInt(window.getComputedStyle(player).getPropertyValue("top"));
                      let obstacleLeft = parseInt(window.getComputedStyle(obstacle).getPropertyValue("left"));
                      
                      // Adjusted hitbox for the Trident
                      if (obstacleLeft > 10 && obstacleLeft < 60 && playerTop >= 100) {
                          endGame(false);
                      }
                  }, 10);
              }

              function endGame(won) {
                  isGameOver = true;
                  clearInterval(checkCollision);
                  clearInterval(scoreInterval);
                  
                  obstacle.style.animation = "none"; 
                  obstacle.style.display = "none";
                  
                  messageBox.style.display = "block";
                  
                  if (won) {
                      msgTitle.innerText = "🏆 You Won (Kinda)!";
                      msgTitle.style.color = "#d8b4fe";
                      msgDesc.innerHTML = "Bhaag toh bahut tez liye beta! <b>Par file tumhe abhi bhi nahi milegi.</b><br>Mehnat barbaad... chalo ab sahi link open karo Bot se!";
                  } else {
                      msgTitle.innerText = "💥 Boom! Pakde gaye!";
                      msgTitle.style.color = "#ef4444";
                      msgDesc.innerHTML = "Trishul se takra gaye! Bypass bot fail ho gaya.<br><b>Sahi tarike se SoftUrl verify karo!</b>";
                  }
                  
                  startOverlay.style.display = "flex";
                  startBtn.innerText = "Try Again?";
              }

              startBtn.addEventListener("click", startGame);
          </script>
      </body>
      </html>
    `);
}

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
        <div style="font-family:sans-serif; text-align:center; padding:50px; background:#090414; color:white; height:100vh;">
          <h1 style="color:#ef4444;">Invalid or Expired Link</h1>
          <p>System couldn't find your record in database.</p>
          <a href="https://t.me/MythoSerialBot" style="color:#a855f7;">Return to Bot</a>
        </div>
      `);
    }
    
    const target = adData.short_url || adData.url; 
    if (!target) return res.send("<h1 style='color:red;'>Error: SoftURL missing in database</h1>");
    
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
// EXIT ROUTES (Hidden Token Shield & Double)
// ========================
app.get("/verify/:prefix/:userId/:token", async (req, res) => {
  const { prefix, userId, token } = req.params;
  const referer = req.get("referer") || "";

  if (referer && !referer.includes("shortxlinks")) {
    return renderBypassPage(res);
  }

  try {
      const adData = await searchAdsCollection.findOne({
        $or: [ { verify_token: token }, { token: token } ],
        $or: [ { user_id: parseInt(userId) }, { user_id: userId.toString() } ]
      });

      if (!adData) {
        return res.send("<h1 style='color:red;'>Verification record not found.</h1>");
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
    <div style="background:#090414; color:white; padding:20px; font-family:sans-serif;">
      ✅ Token generated!<br><br>
      Copy this link and shorten it with Softurl:<br><br>
      <code style="color:#a855f7;">${protectedLink}</code>
    </div>
  `);
});

app.get("/double/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;
  const referer = req.get("referer") || "";
  
  if (referer && !referer.includes("shortxlinks")) {
    return renderBypassPage(res);
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
  if (referer && !referer.includes("shortxlinks")) {
      return renderBypassPage(res);
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
  console.log(`🚀 Mystical Anti-Bypass Server running on port ${PORT}`);
});
