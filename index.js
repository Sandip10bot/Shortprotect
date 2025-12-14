// index.js
import express from "express";
import { connectDB } from "./utils/database.js";
import { setupTelegram } from "./utils/helpers.js";

// Import routes
import bypassRoutes from "./routes/bypass.js";
import paymentRoutes from "./routes/payment.js";
import telegramRoutes from "./routes/telegram.js";
import youtubeDLRouter from "./routes/youtube-dl.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Setup database
await connectDB();

// Setup Telegram
const { sendTelegramNotification } = setupTelegram();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/", bypassRoutes);
app.use("/", paymentRoutes);
app.use("/", telegramRoutes);
app.use("/yt", youtubeDLRouter);

// Basic routes
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

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ 
    status: "running", 
    message: "MythoBot Server is operational",
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎯 Bypass protection with roast messages activated!`);
  console.log(`✅ Legitimate SoftURL accesses will redirect to target URLs`);
  console.log(`🤡 Bypass attempts will get roasted!`);
  console.log(`💰 30% MythoPoints discount system: ACTIVE`);
});
