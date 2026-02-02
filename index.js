// index.js - FULL UPDATED CODE (Complete with all original routes)
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

// Page Flow Configuration - UPDATED
const PAGE_FLOW_CONFIG = {
  enabled: process.env.PAGE_FLOW_ENABLED === "true",
  total_pages: 3, // 3 pages before ad
  wait_time_per_page: 10, // 10 seconds per page
  skip_pages: process.env.SKIP_PAGES === "true"
};

const client = new MongoClient(MONGO_URI);
let doubleCollection;
let urlShortenerCollection;
let downloadsCollection;
let maskCollection;
let adLinksCollection;
let articlesCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("mythobot");
    doubleCollection = db.collection("double_points");
    urlShortenerCollection = db.collection("url_shortener");
    downloadsCollection = db.collection("youtube_downloads");
    maskCollection = db.collection("masked_links");
    adLinksCollection = db.collection("ad_links");
    articlesCollection = db.collection("articles");

    console.log("✅ MongoDB connected");

    try {
      await adLinksCollection.createIndex({ short_id: 1 }, { unique: true });
      console.log("✅ Created short_id index");
    } catch (err) {
      console.log("⚠️ short_id index already exists or failed");
    }

    try {
      await adLinksCollection.createIndex({ flow_code: 1 }, { 
        unique: true, 
        sparse: true 
      });
      console.log("✅ Created flow_code index (sparse)");
    } catch (err) {
      console.log("⚠️ flow_code index already exists or failed:", err.message);
      try {
        await adLinksCollection.dropIndex("flow_code_1");
        await adLinksCollection.createIndex({ flow_code: 1 }, { 
          unique: true, 
          sparse: true 
        });
        console.log("✅ Recreated flow_code index with sparse option");
      } catch (dropErr) {
        console.log("⚠️ Could not fix flow_code index, continuing without it");
      }
    }

    try {
      await adLinksCollection.createIndex({ creator_id: 1 });
      await adLinksCollection.createIndex({ created_at: -1 });
      console.log("✅ Created other indexes");
    } catch (err) {
      console.log("⚠️ Other indexes already exist");
    }

    // Create articles collection index
    try {
      await articlesCollection.createIndex({ user_id: 1 });
      await articlesCollection.createIndex({ created_at: -1 });
      console.log("✅ Created articles indexes");
    } catch (err) {
      console.log("⚠️ Articles indexes already exist");
    }

  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("⚠️ Continuing without database indexes...");
  }
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

// ========================
// UTILITY FUNCTIONS
// ========================
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

function calculateDiscountedPrice(originalPrice, mythoPointsApplied = false) {
  if (mythoPointsApplied) {
    const discount = originalPrice * 0.3;
    return Math.max(1, Math.round(originalPrice - discount));
  }
  return originalPrice;
}

// Generate secure token
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// ========================
// DEFAULT ARTICLES DATA
// ========================
const DEFAULT_ARTICLES = [
  {
    id: 1,
    title: "🔮 Mythological Wonders of India",
    content: `
      <h2 class="text-xl font-bold text-purple-700 mb-3">The Eternal Stories of India</h2>
      <p class="mb-3">India's mythology is a treasure trove of wisdom, valor, and spirituality. From the epic battles of Mahabharata to the divine journey of Ramayana, these stories have shaped cultures for millennia.</p>
      
      <div class="bg-blue-50 p-4 rounded-lg mb-3">
        <h3 class="font-bold text-blue-800">✨ Key Highlights:</h3>
        <ul class="list-disc pl-5 text-blue-700">
          <li><strong>Ramayana:</strong> The journey of Lord Rama to rescue Sita</li>
          <li><strong>Mahabharata:</strong> The great war of Kurukshetra</li>
          <li><strong>Bhagavad Gita:</strong> Spiritual discourse between Krishna and Arjuna</li>
          <li><strong>Puranas:</strong> Ancient texts preserving cosmic knowledge</li>
        </ul>
      </div>
      
      <p class="text-sm text-gray-600">These timeless tales continue to inspire millions, teaching values of dharma (righteousness), karma (action), and moksha (liberation).</p>
    `,
    image: "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=400&h=200&fit=crop",
    tags: ["Mythology", "Ramayana", "Mahabharata", "Spirituality"]
  },
  {
    id: 2,
    title: "🎬 Rise of Mythological Content Online",
    content: `
      <h2 class="text-xl font-bold text-green-700 mb-3">Digital Dharma: Mythology in Modern Era</h2>
      <p class="mb-3">In recent years, mythological content has seen a massive surge in popularity across digital platforms. Streaming services are investing billions in epic adaptations.</p>
      
      <div class="bg-green-50 p-4 rounded-lg mb-3">
        <h3 class="font-bold text-green-800">📊 Digital Statistics:</h3>
        <ul class="list-disc pl-5 text-green-700">
          <li><strong>500% increase</strong> in mythological content viewership (2020-2024)</li>
          <li><strong>2.5 billion+</strong> views for top mythological series on YouTube</li>
          <li><strong>₹1,200+ crores</strong> invested in mythological productions</li>
          <li><strong>45% of Indian households</strong> watch mythological content weekly</li>
        </ul>
      </div>
      
      <p class="text-sm text-gray-600">Platforms like Hotstar, SonyLIV, and YouTube are competing to bring the most authentic and visually stunning mythological stories to audiences worldwide.</p>
    `,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop",
    tags: ["Digital", "Streaming", "YouTube", "Trends"]
  },
  {
    id: 3,
    title: "🤖 MythoBot: Revolutionizing Access",
    content: `
      <h2 class="text-xl font-bold text-orange-700 mb-3">Your Gateway to Divine Entertainment</h2>
      <p class="mb-3">MythoBot was created with a vision to make mythological content accessible to everyone, everywhere. No more searching through scattered links or dealing with broken downloads.</p>
      
      <div class="bg-orange-50 p-4 rounded-lg mb-3">
        <h3 class="font-bold text-orange-800">🚀 Features That Make Us Unique:</h3>
        <ul class="list-disc pl-5 text-orange-700">
          <li><strong>One-Click Access:</strong> Direct links to complete series</li>
          <li><strong>HD Quality:</strong> Crystal clear 1080p/4K streams</li>
          <li><strong>Batch Downloads:</strong> Download entire seasons at once</li>
          <li><strong>24/7 Support:</strong> Always available to help</li>
          <li><strong>Regular Updates:</strong> New content added daily</li>
        </ul>
      </div>
      
      <p class="text-sm text-gray-600">Join over 500,000 satisfied users who have transformed their mythological content experience with MythoBot. Premium members get early access to all new releases!</p>
    `,
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=200&fit=crop",
    tags: ["Technology", "Innovation", "Accessibility", "Premium"]
  }
];

// ========================
// DASHBOARD ROUTES
// ========================

// Main Dashboard with Tabs
app.get("/dashboard", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard - MythoBot URL Shortener</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
      <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .tab-button.active { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #764ba2;
        }
        .glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .nav-sticky {
          position: sticky;
          top: 0;
          z-index: 100;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .menu-item {
          text-align: center;
          padding: 1rem;
          border-radius: 10px;
          background: #f8f9fa;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .menu-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .menu-item i {
          font-size: 24px;
          margin-bottom: 0.5rem;
        }
        @media (max-width: 640px) {
          .menu-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      </style>
    </head>
    <body class="bg-gray-50 min-h-screen">
      <!-- Sticky Navigation -->
      <div class="nav-sticky">
        <div class="max-w-6xl mx-auto p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2">
              <i class="fas fa-robot text-purple-600 text-xl"></i>
              <h1 class="text-xl font-bold">MythoBot Dashboard</h1>
            </div>
            <a href="/" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <i class="fas fa-home mr-2"></i>Home
            </a>
          </div>
          
          <!-- Tab Navigation -->
          <div class="flex space-x-2 mt-4 overflow-x-auto">
            <button class="tab-button active px-4 py-2 rounded-lg border transition-all" data-tab="shorten">
              <i class="fas fa-link mr-2"></i>Shorten URL
            </button>
            <button class="tab-button px-4 py-2 rounded-lg border transition-all" data-tab="my-links">
              <i class="fas fa-list mr-2"></i>My Links
            </button>
            <button class="tab-button px-4 py-2 rounded-lg border transition-all" data-tab="articles">
              <i class="fas fa-newspaper mr-2"></i>Articles
            </button>
            <button class="tab-button px-4 py-2 rounded-lg border transition-all" data-tab="analytics">
              <i class="fas fa-chart-bar mr-2"></i>Analytics
            </button>
            <button class="tab-button px-4 py-2 rounded-lg border transition-all" data-tab="api">
              <i class="fas fa-code mr-2"></i>API Docs
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-6xl mx-auto p-4 mt-4">
        
        <!-- Shorten URL Tab -->
        <div id="shorten" class="tab-content active">
          <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">🔗 Shorten URL with Page Flow</h2>
            <p class="text-gray-600 mb-6">Create secure links with 3 pages + 10-second ad before destination</p>
            
            <form id="shortenForm" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
                <input type="url" id="targetUrl" 
                  class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://example.com" required>
              </div>
              
              <div class="grid md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input type="number" id="userId" 
                    class="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="123456" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                  <input type="text" id="pageTitle" 
                    class="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Exploring Content" value="Exploring Mythological Content">
                </div>
              </div>
              
              <div class="grid md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Custom Alias (Optional)</label>
                  <input type="text" id="customAlias" 
                    class="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="my-link">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ad Type</label>
                  <select id="adType" class="w-full p-3 border border-gray-300 rounded-lg">
                    <option value="timer">Timer (10s)</option>
                    <option value="video">Video Ad</option>
                    <option value="interstitial">Interstitial</option>
                    <option value="banner">Banner</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ad Wait Time (seconds)</label>
                  <input type="number" id="waitTime" 
                    class="w-full p-3 border border-gray-300 rounded-lg"
                    value="10" min="5" max="60">
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <input type="checkbox" id="enablePages" class="w-4 h-4" checked>
                <label for="enablePages" class="text-sm text-gray-700">Enable Page Flow (3 pages × 10s each)</label>
              </div>
              
              <div class="flex items-center space-x-2">
                <input type="checkbox" id="skipPages" class="w-4 h-4">
                <label for="skipPages" class="text-sm text-gray-700">Skip Pages (go directly to ad)</label>
              </div>
              
              <div class="mt-6">
                <button type="submit" 
                  class="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                  <i class="fas fa-magic mr-2"></i>Create Secure Link
                </button>
              </div>
            </form>
            
            <div id="result" class="mt-6 hidden">
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 class="text-lg font-bold text-green-800 mb-2">✅ Link Created Successfully!</h3>
                <div class="space-y-2">
                  <p><strong>Short URL:</strong> <span id="shortUrl" class="text-blue-600"></span></p>
                  <p><strong>Page Flow URL:</strong> <span id="flowUrl" class="text-green-600"></span></p>
                  <p><strong>Direct Ad URL:</strong> <span id="adUrl" class="text-purple-600"></span></p>
                  <p><strong>QR Code:</strong> <img id="qrCode" src="" alt="QR Code" class="w-32 h-32 mt-2"></p>
                  <button onclick="copyToClipboard('shortUrl')" class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                    <i class="fas fa-copy mr-1"></i>Copy Short URL
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- How it Works -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold mb-4">🛡️ How Our Secure Link System Works</h3>
            <div class="grid md:grid-cols-4 gap-4">
              <div class="text-center p-4 border rounded-lg">
                <div class="text-2xl mb-2">1️⃣</div>
                <h4 class="font-bold">Page 1</h4>
                <p class="text-sm text-gray-600">User reads article (10s wait)</p>
              </div>
              <div class="text-center p-4 border rounded-lg">
                <div class="text-2xl mb-2">2️⃣</div>
                <h4 class="font-bold">Page 2</h4>
                <p class="text-sm text-gray-600">Second article (10s wait)</p>
              </div>
              <div class="text-center p-4 border rounded-lg">
                <div class="text-2xl mb-2">3️⃣</div>
                <h4 class="font-bold">Page 3</h4>
                <p class="text-sm text-gray-600">Third article (10s wait)</p>
              </div>
              <div class="text-center p-4 border rounded-lg">
                <div class="text-2xl mb-2">🎯</div>
                <h4 class="font-bold">Get Link + Ad</h4>
                <p class="text-sm text-gray-600">10-second ad before destination</p>
              </div>
            </div>
            <p class="mt-4 text-sm text-gray-600 text-center">
              <i class="fas fa-lock mr-1"></i>Users cannot bypass pages - Secure token system prevents URL manipulation
            </p>
          </div>
        </div>
        
        <!-- My Links Tab -->
        <div id="my-links" class="tab-content">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4">📊 Your Shortened Links</h2>
            <div class="mb-4">
              <input type="number" id="searchUserId" 
                class="p-2 border rounded-lg mr-2" 
                placeholder="Enter User ID">
              <button onclick="loadUserLinks()" class="px-4 py-2 bg-purple-600 text-white rounded-lg">
                Load Links
              </button>
            </div>
            <div id="linksTable" class="overflow-x-auto">
              <p class="text-gray-500">Enter a User ID to load links</p>
            </div>
          </div>
        </div>
        
        <!-- Articles Tab -->
        <div id="articles" class="tab-content">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4">📝 Manage Articles</h2>
            <div class="grid md:grid-cols-2 gap-6">
              <!-- Create Article Form -->
              <div>
                <h3 class="text-lg font-bold mb-3">Create New Article</h3>
                <form id="articleForm" class="space-y-3">
                  <input type="number" id="articleUserId" 
                    class="w-full p-2 border rounded" 
                    placeholder="User ID" required>
                  <input type="text" id="articleTitle" 
                    class="w-full p-2 border rounded" 
                    placeholder="Article Title" required>
                  <textarea id="articleContent" 
                    class="w-full p-2 border rounded" rows="5"
                    placeholder="HTML content..."></textarea>
                  <input type="text" id="articleImage" 
                    class="w-full p-2 border rounded" 
                    placeholder="Image URL">
                  <input type="text" id="articleTags" 
                    class="w-full p-2 border rounded" 
                    placeholder="Tags (comma separated)">
                  <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">
                    Save Article
                  </button>
                </form>
              </div>
              
              <!-- User Articles -->
              <div>
                <h3 class="text-lg font-bold mb-3">Your Articles</h3>
                <div class="mb-3">
                  <input type="number" id="userArticlesId" 
                    class="p-2 border rounded" 
                    placeholder="Enter User ID">
                  <button onclick="loadUserArticles()" class="ml-2 px-3 py-2 bg-blue-600 text-white rounded">
                    Load
                  </button>
                </div>
                <div id="articlesList" class="space-y-3 max-h-96 overflow-y-auto">
                  <!-- Articles will load here -->
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Analytics Tab -->
        <div id="analytics" class="tab-content">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4">📈 Analytics Dashboard</h2>
            <div class="grid md:grid-cols-4 gap-4 mb-6" id="statsCards">
              <!-- Stats will load here -->
            </div>
            <div>
              <input type="number" id="analyticsUserId" 
                class="p-2 border rounded" 
                placeholder="Enter User ID">
              <button onclick="loadAnalytics()" class="ml-2 px-4 py-2 bg-purple-600 text-white rounded">
                View Analytics
              </button>
            </div>
          </div>
        </div>
        
        <!-- API Docs Tab -->
        <div id="api" class="tab-content">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4">🔧 API Documentation</h2>
            <div class="space-y-4">
              <div class="border-l-4 border-blue-500 pl-4">
                <h3 class="font-bold">Create Short Link</h3>
                <p class="text-sm text-gray-600 mb-2">POST /api/v1/shorten</p>
                <pre class="bg-gray-100 p-2 rounded text-sm">
Parameters:
  • url (required) - Destination URL
  • user_id (required) - Your user ID
  • page_title - Page title (default: "Exploring Mythological Content")
  • custom_alias - Custom short ID (3-20 chars)
  • ad_type - timer/video/interstitial/banner
  • wait_time - Ad wait time in seconds
  • skip_pages - true/false (skip page flow)</pre>
              </div>
              
              <div class="border-l-4 border-green-500 pl-4">
                <h3 class="font-bold">Get Link Stats</h3>
                <p class="text-sm text-gray-600 mb-2">GET /api/v1/stats/{shortId}?api_key=YOUR_KEY</p>
              </div>
              
              <div class="border-l-4 border-purple-500 pl-4">
                <h3 class="font-bold">Delete Link</h3>
                <p class="text-sm text-gray-600 mb-2">GET /api/v1/delete/{shortId}?api_key=YOUR_KEY</p>
              </div>
            </div>
          </div>
        </div>
        
      </div>
      
      <!-- Bottom Menu (Instagram-style) -->
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3">
        <div class="menu-grid max-w-md mx-auto">
          <div class="menu-item" onclick="showTab('shorten')">
            <i class="fas fa-link text-purple-600"></i>
            <span class="text-xs">Shorten</span>
          </div>
          <div class="menu-item" onclick="showTab('my-links')">
            <i class="fas fa-list text-blue-600"></i>
            <span class="text-xs">My Links</span>
          </div>
          <div class="menu-item" onclick="showTab('articles')">
            <i class="fas fa-newspaper text-green-600"></i>
            <span class="text-xs">Articles</span>
          </div>
          <div class="menu-item" onclick="showTab('analytics')">
            <i class="fas fa-chart-bar text-yellow-600"></i>
            <span class="text-xs">Analytics</span>
          </div>
          <div class="menu-item" onclick="showTab('api')">
            <i class="fas fa-code text-red-600"></i>
            <span class="text-xs">API Docs</span>
          </div>
          <div class="menu-item" onclick="window.location.href='/'">
            <i class="fas fa-home text-gray-600"></i>
            <span class="text-xs">Home</span>
          </div>
        </div>
      </div>

      <script>
        // Tab functionality
        function showTab(tabId) {
          // Hide all tabs
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Remove active from all buttons
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Show selected tab
          document.getElementById(tabId).classList.add('active');
          
          // Activate corresponding button
          document.querySelectorAll('.tab-button').forEach(btn => {
            if (btn.dataset.tab === tabId) {
              btn.classList.add('active');
            }
          });
        }
        
        // Add click listeners to tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
          button.addEventListener('click', () => {
            showTab(button.dataset.tab);
          });
        });
        
        // Form submission
        document.getElementById('shortenForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const formData = {
            url: document.getElementById('targetUrl').value,
            user_id: document.getElementById('userId').value,
            page_title: document.getElementById('pageTitle').value,
            custom_alias: document.getElementById('customAlias').value || undefined,
            ad_type: document.getElementById('adType').value,
            wait_time: document.getElementById('waitTime').value,
            skip_pages: document.getElementById('skipPages').checked ? 'true' : 'false'
          };
          
          // Remove undefined values
          Object.keys(formData).forEach(key => {
            if (formData[key] === undefined) delete formData[key];
          });
          
          try {
            const response = await fetch('/api/v1/shorten?' + new URLSearchParams(formData));
            const result = await response.json();
            
            if (result.success) {
              document.getElementById('shortUrl').textContent = result.data.short_url;
              document.getElementById('flowUrl').textContent = result.data.primary_url;
              document.getElementById('adUrl').textContent = result.data.direct_ad_url;
              document.getElementById('qrCode').src = result.data.qr_code;
              document.getElementById('result').classList.remove('hidden');
            } else {
              alert('Error: ' + result.error);
            }
          } catch (error) {
            alert('Error creating link: ' + error.message);
          }
        });
        
        // Copy to clipboard
        function copyToClipboard(elementId) {
          const text = document.getElementById(elementId).textContent;
          navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
          });
        }
        
        // Load user links
        async function loadUserLinks() {
          const userId = document.getElementById('searchUserId').value;
          if (!userId) return alert('Please enter User ID');
          
          try {
            const response = await fetch(\`/api/v1/links/\${userId}\`);
            const data = await response.json();
            
            if (data.success) {
              let html = \`
                <table class="w-full border">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="p-2 border">Short ID</th>
                      <th class="p-2 border">Clicks</th>
                      <th class="p-2 border">Page Views</th>
                      <th class="p-2 border">Earnings</th>
                      <th class="p-2 border">Created</th>
                    </tr>
                  </thead>
                  <tbody>
              \`;
              
              data.links.forEach(link => {
                html += \`
                  <tr>
                    <td class="p-2 border">
                      <a href="/s/\${link.short_id}" target="_blank" class="text-blue-600">\${link.short_id}</a>
                    </td>
                    <td class="p-2 border">\${link.clicks || 0}</td>
                    <td class="p-2 border">\${link.page_views || 0}</td>
                    <td class="p-2 border">$\${(link.earnings || 0).toFixed(3)}</td>
                    <td class="p-2 border">\${new Date(link.created_at).toLocaleDateString()}</td>
                  </tr>
                \`;
              });
              
              html += '</tbody></table>';
              document.getElementById('linksTable').innerHTML = html;
            } else {
              document.getElementById('linksTable').innerHTML = '<p class="text-red-500">' + data.error + '</p>';
            }
          } catch (error) {
            document.getElementById('linksTable').innerHTML = '<p class="text-red-500">Error loading links</p>';
          }
        }
        
        // Load analytics
        async function loadAnalytics() {
          const userId = document.getElementById('analyticsUserId').value;
          if (!userId) return alert('Please enter User ID');
          
          try {
            const response = await fetch(\`/api/v1/stats/user/\${userId}\`);
            const data = await response.json();
            
            if (data.success) {
              const html = \`
                <div class="bg-purple-50 p-4 rounded-lg">
                  <div class="text-3xl font-bold text-purple-600">\${data.total_links}</div>
                  <div class="text-sm text-purple-800">Total Links</div>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg">
                  <div class="text-3xl font-bold text-blue-600">\${data.total_clicks}</div>
                  <div class="text-sm text-blue-800">Total Clicks</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                  <div class="text-3xl font-bold text-green-600">\${data.total_page_views}</div>
                  <div class="text-sm text-green-800">Page Views</div>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg">
                  <div class="text-3xl font-bold text-yellow-600">$\${data.total_earnings.toFixed(3)}</div>
                  <div class="text-sm text-yellow-800">Total Earnings</div>
                </div>
              \`;
              
              document.getElementById('statsCards').innerHTML = html;
            }
          } catch (error) {
            document.getElementById('statsCards').innerHTML = '<p class="text-red-500">Error loading analytics</p>';
          }
        }
        
        // Article functions
        document.getElementById('articleForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const articleData = {
            user_id: document.getElementById('articleUserId').value,
            title: document.getElementById('articleTitle').value,
            content: document.getElementById('articleContent').value,
            image: document.getElementById('articleImage').value,
            tags: document.getElementById('articleTags').value.split(',').map(t => t.trim())
          };
          
          try {
            const response = await fetch('/api/v1/articles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(articleData)
            });
            
            const result = await response.json();
            if (result.success) {
              alert('Article saved successfully!');
              document.getElementById('articleForm').reset();
              loadUserArticles();
            } else {
              alert('Error: ' + result.error);
            }
          } catch (error) {
            alert('Error saving article');
          }
        });
        
        async function loadUserArticles() {
          const userId = document.getElementById('userArticlesId').value;
          if (!userId) return alert('Please enter User ID');
          
          try {
            const response = await fetch(\`/api/v1/articles/\${userId}\`);
            const data = await response.json();
            
            let html = '';
            if (data.success && data.articles.length > 0) {
              data.articles.forEach(article => {
                html += \`
                  <div class="border rounded-lg p-3">
                    <h4 class="font-bold">\${article.title}</h4>
                    <p class="text-sm text-gray-600 truncate">\${article.content.substring(0, 100)}...</p>
                    <div class="flex justify-between mt-2">
                      <span class="text-xs text-gray-500">\${article.tags?.join(', ') || 'No tags'}</span>
                      <button onclick="deleteArticle('\${article._id}')" class="text-xs text-red-500">Delete</button>
                    </div>
                  </div>
                \`;
              });
            } else {
              html = '<p class="text-gray-500">No articles found</p>';
            }
            
            document.getElementById('articlesList').innerHTML = html;
          } catch (error) {
            document.getElementById('articlesList').innerHTML = '<p class="text-red-500">Error loading articles</p>';
          }
        }
        
        async function deleteArticle(articleId) {
          if (!confirm('Delete this article?')) return;
          
          try {
            const response = await fetch(\`/api/v1/articles/\${articleId}\`, {
              method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
              loadUserArticles();
            } else {
              alert('Error deleting article');
            }
          } catch (error) {
            alert('Error deleting article');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ========================
// SECURE PAGE FLOW SYSTEM (Fixed - No bypass)
// ========================

// 🔹 1. Universal Short Link Creation (with Page Flow)
app.get("/api/v1/shorten", authenticateAPI, async (req, res) => {
  const { 
    url, 
    user_id, 
    page_title = "Exploring Mythological Content",
    page_delay = PAGE_FLOW_CONFIG.wait_time_per_page,
    total_pages = PAGE_FLOW_CONFIG.total_pages,
    ad_type = "timer",
    wait_time = 10,
    reward_type = "points",
    custom_alias,
    skip_pages = "false",
    article_ids // New: Custom article IDs
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
    
    const flowCode = crypto.randomBytes(6).toString("hex"); // Longer code for security
    const usePages = skip_pages !== "true" && PAGE_FLOW_CONFIG.enabled;
    
    // Generate secure tokens for each page to prevent bypass
    const pageTokens = {};
    if (usePages) {
      for (let i = 1; i <= total_pages; i++) {
        pageTokens[i] = generateSecureToken(16);
      }
    }
    
    const shortUrl = `https://${req.hostname}/s/${shortId}`;
    const pageFlowUrl = `https://${req.hostname}/flow/${flowCode}?token=${pageTokens[1]}`; // First page requires token
    const directAdUrl = `https://${req.hostname}/adgate/${shortId}`;
    
    const adConfig = {
      type: ad_type,
      wait_time: parseInt(wait_time),
      reward_type: reward_type,
      earnings_per_click: 0.001
    };
    
    // Get articles (custom or default)
    let articlesToUse = DEFAULT_ARTICLES;
    if (article_ids) {
      const articleIds = article_ids.split(',').map(id => parseInt(id.trim()));
      const customArticles = await articlesCollection.find({
        _id: { $in: articleIds }
      }).toArray();
      
      if (customArticles.length > 0) {
        articlesToUse = customArticles.map(article => ({
          id: article._id,
          title: article.title,
          content: article.content,
          image: article.image || DEFAULT_ARTICLES[0].image,
          tags: article.tags || []
        }));
      }
    }
    
    await adLinksCollection.insertOne({
      short_id: shortId,
      flow_code: flowCode,
      creator_id: parseInt(user_id),
      target_url: url,
      page_tokens: pageTokens, // Store tokens for validation
      page_flow_config: {
        enabled: usePages,
        title: page_title,
        delay: parseInt(page_delay),
        total_pages: parseInt(total_pages),
        articles: articlesToUse.map(article => article.id)
      },
      ad_config: adConfig,
      custom_alias: custom_alias || null,
      created_at: new Date(),
      clicks: 0,
      page_views: 0,
      direct_clicks: 0,
      earnings: 0,
      status: "active",
      access_logs: [],
      page_logs: [],
      metadata: {
        created_via: "api",
        skip_pages: skip_pages === "true",
        ip: req.ip,
        secure: true // Mark as secure flow
      }
    });
    
    const responseData = {
      success: true,
      data: {
        short_id: shortId,
        flow_code: flowCode,
        user_id: parseInt(user_id),
        created_at: new Date().toISOString(),
        page_flow_config: {
          enabled: usePages,
          title: page_title,
          delay: page_delay,
          total_pages: total_pages
        },
        ad_config: adConfig,
        stats_url: `https://${req.hostname}/api/v1/stats/${shortId}?api_key=${req.query.api_key}`,
        delete_url: `https://${req.hostname}/api/v1/delete/${shortId}?api_key=${req.query.api_key}`,
        secure: true
      },
      message: usePages 
        ? "Secure short link created with page flow (cannot be bypassed)" 
        : "Short link created (page flow disabled)"
    };
    
    if (usePages) {
      responseData.data.primary_url = pageFlowUrl;
      responseData.data.short_url = shortUrl;
      responseData.data.direct_ad_url = directAdUrl;
      responseData.data.qr_code = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pageFlowUrl)}`;
      responseData.data.page_preview = `https://${req.hostname}/flow/${flowCode}/preview`;
    } else {
      responseData.data.primary_url = directAdUrl;
      responseData.data.short_url = directAdUrl;
      responseData.data.direct_ad_url = directAdUrl;
      responseData.data.qr_code = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(directAdUrl)}`;
    }
    
    if (TELEGRAM_ADMIN_CHAT_ID && process.env.NOTIFY_NEW_LINKS === "true") {
      const notification = `
🔗 <b>New ${usePages ? 'Secure Page Flow ' : ''}Short Link Created</b>

👤 <b>User ID:</b> <code>${user_id}</code>
📝 <b>Short ID:</b> <code>${shortId}</code>
🔐 <b>Security:</b> ${usePages ? 'Token-based (no bypass)' : 'Basic'}
📄 <b>Pages:</b> ${usePages ? '3 pages × 10s each' : 'Disabled'}
🎯 <b>Ad Type:</b> ${ad_type}
⏱️ <b>Wait Time:</b> ${wait_time}s

🔗 <b>Primary URL:</b> ${usePages ? pageFlowUrl : directAdUrl}
📊 <b>Stats:</b> <a href="https://${req.hostname}/api/v1/stats/${shortId}?api_key=${req.query.api_key}">View Stats</a>
      `;
      
      await sendTelegramNotification(notification);
    }
    
    res.json(responseData);
    
  } catch (error) {
    console.error("API shorten error:", error);
    res.json({
      success: false,
      error: error.code === 'ERR_INVALID_URL' ? 'Invalid URL format' : error.message
    });
  }
});

// 🔹 2. Short URL Redirect
app.get("/s/:shortId", async (req, res) => {
  const { shortId } = req.params;
  const { direct } = req.query;
  
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
    
    await adLinksCollection.updateOne(
      { short_id: shortId },
      { $inc: { views: 1 } }
    );
    
    const skipPages = direct === "true" || !linkData.page_flow_config?.enabled;
    
    if (skipPages) {
      res.redirect(`/adgate/${shortId}`);
    } else {
      // Redirect to first page with token
      const firstToken = linkData.page_tokens?.[1];
      if (firstToken) {
        res.redirect(`/flow/${linkData.flow_code}?token=${firstToken}`);
      } else {
        res.redirect(`/flow/${linkData.flow_code}`);
      }
    }
    
  } catch (error) {
    console.error("Short URL error:", error);
    res.status(500).send("Internal server error");
  }
});

// 🔹 3. Page Flow System - SECURE (with token validation)
app.get("/flow/:code", async (req, res) => {
  const { code } = req.params;
  const { page = 1, token } = req.query;
  
  try {
    const linkData = await adLinksCollection.findOne({ 
      flow_code: code,
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
            <h1>Page Flow Link Not Found</h1>
            <p>This page flow link has expired or doesn't exist.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    const currentPage = parseInt(page);
    const totalPages = linkData.page_flow_config?.total_pages || PAGE_FLOW_CONFIG.total_pages;
    const waitTime = linkData.page_flow_config?.delay || PAGE_FLOW_CONFIG.wait_time_per_page;
    
    // SECURITY: Validate token for current page
    if (currentPage === 1 && !token) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Denied</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc3545; font-size: 48px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="error">🚫</div>
          <h1>Access Denied</h1>
          <p>Invalid access token. Please use the correct link.</p>
          <p><small>Security token missing or invalid</small></p>
        </body>
        </html>
      `);
    }
    
    // SECURITY: Validate token for subsequent pages
    if (currentPage > 1) {
      const pageToken = token || req.session?.pageToken;
      const expectedToken = linkData.page_tokens?.[currentPage];
      
      if (!pageToken || pageToken !== expectedToken) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Access Denied</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc3545; font-size: 48px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="error">🔒</div>
            <h1>Page Bypass Detected</h1>
            <p>You cannot skip pages or access pages out of order.</p>
            <p><small>Each page requires a valid security token</small></p>
          </body>
          </html>
        `);
      }
    }
    
    if (currentPage > totalPages) {
      // Show "Get Link" page after all pages
      return renderGetLinkPage(res, code, linkData);
    }
    
    // Track page view
    await adLinksCollection.updateOne(
      { flow_code: code },
      { 
        $inc: { page_views: 1 },
        $push: {
          page_logs: {
            type: 'page_view',
            page: currentPage,
            timestamp: new Date(),
            ip: req.ip,
            user_agent: req.get("user-agent"),
            valid_token: true
          }
        }
      }
    );
    
    // Get article for current page
    let article;
    const articlesToUse = linkData.page_flow_config?.articles || DEFAULT_ARTICLES.map(a => a.id);
    const articleIndex = (currentPage - 1) % articlesToUse.length;
    
    // Try to get custom article first
    const customArticle = await articlesCollection.findOne({
      _id: articlesToUse[articleIndex]
    });
    
    if (customArticle) {
      article = {
        id: customArticle._id,
        title: customArticle.title,
        content: customArticle.content,
        image: customArticle.image || DEFAULT_ARTICLES[0].image,
        tags: customArticle.tags || []
      };
    } else {
      // Use default article
      article = DEFAULT_ARTICLES[articleIndex] || DEFAULT_ARTICLES[0];
    }
    
    // Generate next page token
    const nextPageToken = linkData.page_tokens?.[currentPage + 1];
    const nextPageUrl = nextPageToken 
      ? `/flow/${code}?page=${currentPage + 1}&token=${nextPageToken}`
      : `/flow/${code}/get-link`;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Page ${currentPage}/${totalPages} - MythoBot Flow</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <style>
          .pulse { animation: pulse 2s infinite; }
          @keyframes pulse {
            0%,100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          .progress-bar {
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
            margin: 20px 0;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            width: 0%;
            transition: width 1s linear;
          }
          .tag {
            display: inline-block;
            background: #e0e7ff;
            color: #4f46e5;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-right: 5px;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full">
          <!-- Security Badge -->
          <div class="mb-4 text-center">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <i class="fas fa-shield-alt mr-1"></i> Secure Page ${currentPage}
            </span>
          </div>
          
          <!-- Progress Header -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <h1 class="text-xl font-bold text-gray-800">📖 ${linkData.page_flow_config?.title || "MythoBot Content Hub"}</h1>
              <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                Page ${currentPage}/${totalPages}
              </span>
            </div>
            <div class="progress-bar">
              <div id="progressFill" class="progress-fill" style="width: ${((currentPage - 1) / totalPages) * 100}%"></div>
            </div>
          </div>
          
          <!-- Article Content -->
          <div class="mb-6">
            <div class="mb-4">
              ${article.image ? `<img src="${article.image}" alt="${article.title}" class="w-full h-48 object-cover rounded-lg mb-3">` : ''}
              <h2 class="text-2xl font-bold text-gray-800 mb-2">${article.title}</h2>
              <div class="mb-3">
                ${article.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
              </div>
            </div>
            
            <div class="prose max-w-none">
              ${article.content}
            </div>
            
            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-600">
                <i class="fas fa-info-circle mr-2 text-blue-500"></i>
                Reading time: ${waitTime} seconds. Next page loads automatically.
              </p>
              <p class="text-xs text-gray-500 mt-1">
                <i class="fas fa-lock mr-1"></i> Secure token: ${token ? 'Validated' : 'Required'}
              </p>
            </div>
          </div>
          
          <!-- Timer Section -->
          <div class="mb-6">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold text-blue-700 mb-2" id="countdown">${waitTime}</div>
              <p class="text-blue-600">Seconds until next page</p>
            </div>
          </div>
          
          <!-- Continue Button (Disabled until timer ends) -->
          <button id="continueBtn" disabled
            class="w-full py-3 bg-gray-200 text-gray-500 rounded-lg font-bold cursor-not-allowed">
            <i class="fas fa-clock mr-2"></i>
            Please Wait (<span id="btnTimer">${waitTime}</span>s)
          </button>
          
          <!-- Footer -->
          <div class="mt-6 pt-4 border-t border-gray-200 text-center">
            <p class="text-xs text-gray-500">
              <i class="fas fa-shield-alt mr-1"></i>
              Secure page flow by MythoBot • Page ${currentPage} of ${totalPages} • Token: ${token ? '✓' : '✗'}
            </p>
          </div>
        </div>
        
        <script>
          const currentPage = ${currentPage};
          const totalPages = ${totalPages};
          const waitTime = ${waitTime};
          const nextPageUrl = "${nextPageUrl}";
          let timeLeft = waitTime;
          const countdownElement = document.getElementById('countdown');
          const btnTimerElement = document.getElementById('btnTimer');
          const progressFill = document.getElementById('progressFill');
          const continueBtn = document.getElementById('continueBtn');
          
          // Update progress bar
          progressFill.style.width = '${((currentPage - 1) / totalPages) * 100}%';
          
          const timer = setInterval(() => {
            timeLeft--;
            countdownElement.textContent = timeLeft;
            btnTimerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
              clearInterval(timer);
              continueBtn.disabled = false;
              continueBtn.classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
              continueBtn.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'text-white', 'hover:from-blue-600', 'hover:to-purple-700', 'cursor-pointer');
              continueBtn.innerHTML = '<i class="fas fa-forward mr-2"></i>Continue to Next Page';
              
              // Enable button click
              continueBtn.onclick = function() {
                window.location.href = nextPageUrl;
              };
            }
          }, 1000);
          
          // Auto-redirect after wait time
          setTimeout(function() {
            window.location.href = nextPageUrl;
          }, waitTime * 1000);
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error("Page flow error:", error);
    res.status(500).send("Internal server error");
  }
});

// 🔹 4. Get Link Page (After all pages)
async function renderGetLinkPage(res, code, linkData) {
  const shortId = linkData.short_id;
  
  await adLinksCollection.updateOne(
    { flow_code: code },
    { 
      $push: {
        page_logs: {
          type: 'get_link_page',
          timestamp: new Date(),
          ip: res.req.ip
        }
      }
    }
  );
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🎯 Get Your Link - MythoBot</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
      <style>
        .success-checkmark {
          width: 80px;
          height: 80px;
          margin: 0 auto;
          position: relative;
        }
        .success-checkmark:before {
          content: '';
          position: absolute;
          width: 80px;
          height: 80px;
          background: #10b981;
          border-radius: 50%;
          animation: scale 0.3s ease-in-out;
        }
        .check-icon {
          width: 40px;
          height: 40px;
          position: absolute;
          top: 20px;
          left: 20px;
          transform: rotate(45deg);
        }
        .check-icon:before, .check-icon:after {
          content: '';
          position: absolute;
          background: white;
        }
        .check-icon:before {
          width: 4px;
          height: 25px;
          left: 18px;
          top: 8px;
        }
        .check-icon:after {
          width: 12px;
          height: 4px;
          left: 8px;
          top: 29px;
        }
        @keyframes scale {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        .link-box {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px dashed #0ea5e9;
          transition: all 0.3s ease;
        }
        .link-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(14, 165, 233, 0.2);
        }
      </style>
    </head>
    <body class="bg-gradient-to-br from-green-50 to-blue-50 min-h-screen flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
        <!-- Success Animation -->
        <div class="mb-6">
          <div class="success-checkmark">
            <div class="check-icon"></div>
          </div>
        </div>
        
        <!-- Title -->
        <h1 class="text-3xl font-bold text-gray-800 mb-2">🎉 Congratulations!</h1>
        <p class="text-gray-600 mb-6">You've successfully completed all pages. Your link is ready!</p>
        
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mb-8">
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-700">3</div>
            <div class="text-sm text-blue-600">Pages Read</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-700">30s</div>
            <div class="text-sm text-green-600">Total Time</div>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-purple-700">100%</div>
            <div class="text-sm text-purple-600">Complete</div>
          </div>
        </div>
        
        <!-- Link Box -->
        <div class="mb-8">
          <div class="link-box rounded-xl p-6 mb-4">
            <div class="flex items-center justify-center mb-3">
              <i class="fas fa-link text-blue-500 text-2xl mr-3"></i>
              <h2 class="text-xl font-bold text-gray-800">Your Destination Link</h2>
            </div>
            <p class="text-gray-600 mb-4">Click the button below to proceed to the final ad page (10-second wait)</p>
            
            <a href="/adgate/${shortId}" 
              class="inline-block px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg text-lg">
              <i class="fas fa-external-link-alt mr-2"></i>
              Get My Link Now
            </a>
          </div>
          
          <p class="text-sm text-gray-500">
            <i class="fas fa-clock mr-1"></i>
            Ad page will show for 10 seconds before redirecting to your destination
          </p>
        </div>
        
        <!-- Footer -->
        <div class="mt-8 pt-6 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            <i class="fas fa-star mr-1 text-yellow-500"></i>
            Thank you for reading our content! Your support helps us create more amazing mythological resources.
          </p>
        </div>
      </div>
      
      <script>
        // Celebrate with confetti
        setTimeout(() => {
          if (typeof confetti === 'function') {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }, 500);
      </script>
      <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
    </body>
    </html>
  `);
}

// Direct route to Get Link page
app.get("/flow/:code/get-link", async (req, res) => {
  const { code } = req.params;
  
  try {
    const linkData = await adLinksCollection.findOne({ 
      flow_code: code,
      status: "active"
    });
    
    if (!linkData) {
      return res.status(404).send("Link not found");
    }
    
    renderGetLinkPage(res, code, linkData);
    
  } catch (error) {
    console.error("Get link page error:", error);
    res.status(500).send("Internal server error");
  }
});

// 🔹 5. Ad Gateway (default wait 10s)
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
    
    const userIP = req.ip;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingVisit = await adLinksCollection.findOne({
      short_id: shortId,
      "access_logs.ip": userIP,
      "access_logs.timestamp": { $gte: today }
    });
    
    const isFirstVisitToday = !existingVisit;
    
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
    
    const adType = linkData.ad_config?.type || "timer";
    const waitTime = linkData.ad_config?.wait_time || 10;
    
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

// 🔹 6. Direct Route
app.get("/d/:shortId", async (req, res) => {
  const { shortId } = req.params;
  
  try {
    const linkData = await adLinksCollection.findOne({ 
      short_id: shortId,
      status: "active"
    });
    
    if (!linkData) {
      return res.status(404).send("Link not found");
    }
    
    await adLinksCollection.updateOne(
      { short_id: shortId },
      { 
        $inc: { direct_clicks: 1 },
        $push: {
          access_logs: {
            type: 'direct_click',
            timestamp: new Date(),
            ip: req.ip,
            user_agent: req.get("user-agent"),
            bypassed_blogger: true,
            bypassed_ad: true
          }
        }
      }
    );
    
    res.redirect(linkData.target_url);
    
  } catch (error) {
    console.error("Direct route error:", error);
    res.status(500).send("Internal server error");
  }
});

// ========================
// AD PAGE RENDER FUNCTIONS (unchanged)
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
// CLICK TRACKING
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
          earnings: earnings
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
// NEW API ENDPOINTS FOR DASHBOARD
// ========================

// Get user links
app.get("/api/v1/links/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const links = await adLinksCollection
      .find({ creator_id: parseInt(userId) })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    
    res.json({
      success: true,
      links: links.map(link => ({
        short_id: link.short_id,
        flow_code: link.flow_code,
        target_url: link.target_url,
        clicks: link.clicks || 0,
        page_views: link.page_views || 0,
        earnings: link.earnings || 0,
        created_at: link.created_at,
        status: link.status,
        page_flow_enabled: link.page_flow_config?.enabled || false
      }))
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: "Failed to fetch links"
    });
  }
});

// Get user stats
app.get("/api/v1/stats/user/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const links = await adLinksCollection
      .find({ creator_id: parseInt(userId) })
      .toArray();
    
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalPageViews = links.reduce((sum, link) => sum + (link.page_views || 0), 0);
    const totalEarnings = links.reduce((sum, link) => sum + (link.earnings || 0), 0);
    
    res.json({
      success: true,
      user_id: userId,
      total_links: totalLinks,
      total_clicks: totalClicks,
      total_page_views: totalPageViews,
      total_earnings: totalEarnings
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: "Failed to fetch stats"
    });
  }
});

// Article management endpoints
app.post("/api/v1/articles", express.json(), async (req, res) => {
  const { user_id, title, content, image, tags } = req.body;
  
  if (!user_id || !title || !content) {
    return res.json({
      success: false,
      error: "Missing required fields: user_id, title, content"
    });
  }
  
  try {
    const result = await articlesCollection.insertOne({
      user_id: parseInt(user_id),
      title: title,
      content: content,
      image: image || DEFAULT_ARTICLES[0].image,
      tags: tags || [],
      created_at: new Date(),
      updated_at: new Date()
    });
    
    res.json({
      success: true,
      article_id: result.insertedId
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: "Failed to save article"
    });
  }
});

app.get("/api/v1/articles/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const articles = await articlesCollection
      .find({ user_id: parseInt(userId) })
      .sort({ created_at: -1 })
      .toArray();
    
    res.json({
      success: true,
      articles: articles
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: "Failed to fetch articles"
    });
  }
});

app.delete("/api/v1/articles/:articleId", async (req, res) => {
  const { articleId } = req.params;
  
  try {
    await articlesCollection.deleteOne({ _id: articleId });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: "Failed to delete article" });
  }
});

// ========================
// ORIGINAL ROUTES (KEEP ALL)
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
      await maskedCollection.insertOne({
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
  
  let dbRecord = null;
  try {
    dbRecord = await urlShortenerCollection.findOne({ 
      token: token,
      creator_id: parseInt(userId) 
    });
  } catch (dbError) {
    console.error("Database error:", dbError);
  }
  
  if (dbRecord) {
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
      let decodedTarget = null;
      let decodeMethod = "";
      
      try {
        decodedTarget = base62_decode(t);
        new URL(decodedTarget);
        decodeMethod = "base62";
      } catch (e1) {
        try {
          decodedTarget = decodeURIComponent(t);
          new URL(decodedTarget);
          decodeMethod = "legacy_url";
        } catch (e2) {
          try {
            if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('t.me/') || t.startsWith('tg://')) {
              decodedTarget = t;
              new URL(decodedTarget);
              decodeMethod = "direct";
            } else {
              throw new Error("Not a valid URL format");
            }
          } catch (e3) {
            throw new Error("All decode methods failed");
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
      
      return res.redirect(decodedTarget);
      
    } catch (error) {
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
          <a href="https://t.me/MythoSerialBot" class="btn">
            <span style="vertical-align: middle;">🤖 Go To MythoBot</span>
          </a>
        </body>
        </html>
      `);
    }
  }
  
  res.send(`
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
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
});

// ========================
// PAYMENT ROUTES (unchanged)
// ========================

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

                <div class="mt-6">
                    <p class="text-sm font-semibold text-slate-600 mb-3">Or open directly in:</p>
                    <div class="grid grid-cols-4 gap-3 mb-4" id="upi-apps-container"></div>
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
                    { name: "GPay", package: "com.google.android.apps.nbu.paisa.user", icon: "fa-brands fa-google-pay", color: "bg-gradient-to-r from-blue-500 to-purple-600" },
                    { name: "Paytm", package: "net.one97.paytm", icon: "fa-solid fa-mobile-screen-button", color: "bg-gradient-to-r from-blue-600 to-blue-800" },
                    { name: "PhonePe", package: "com.phonepe.app", icon: "fa-solid fa-phone", color: "bg-gradient-to-r from-purple-600 to-purple-800" },
                    { name: "BHIM", package: "in.org.npci.upiapp", icon: "fa-solid fa-indian-rupee-sign", color: "bg-gradient-to-r from-green-600 to-green-800" },
                    { name: "Amazon Pay", package: "in.amazon.mShop.android.shopping", icon: "fa-brands fa-amazon", color: "bg-gradient-to-r from-yellow-500 to-orange-500" },
                    { name: "WhatsApp", package: "com.whatsapp", icon: "fa-brands fa-whatsapp", color: "bg-gradient-to-r from-green-500 to-green-600" },
                    { name: "Cred", package: "com.dreamplug.androidapp", icon: "fa-solid fa-gem", color: "bg-gradient-to-r from-purple-700 to-purple-900" },
                    { name: "Any UPI", package: "", icon: "fa-solid fa-wallet", color: "bg-gradient-to-r from-gray-600 to-gray-800" }
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
                            setTimeout(() => { window.location.href = upiUrl; }, 500);
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
                        setTimeout(() => { copySpan.innerHTML = originalCopyHTML; }, 2000);
                    });
                });
            });
        </script>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
                document.addEventListener('keydown', function(e) {
                    if (e.ctrlKey && (e.key === 'c' || e.key === 'u')) { e.preventDefault(); }
                    if (e.key === 'F12') { e.preventDefault(); }
                });
                document.addEventListener('dragstart', function(e) { e.preventDefault(); });
            });
        </script>
    </body>
    </html>
  `);
});

// ========================
// PREMIUM PAYMENT ROUTES (unchanged)
// ========================

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
  
  const isPaymentVerified = false; // Implement actual verification
  
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
    
    const usersCollection = client.db("mythobot").collection("users");
    const subscriptionDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + paymentSession.duration);
    
    await usersCollection.updateOne(
      { user_id: paymentSession.user_id },
      { 
        $set: { 
          is_premium: true,
          premium_since: subscriptionDate,
          premium_until: expiryDate,
          plan_duration: paymentSession.duration
        } 
      },
      { upsert: true }
    );
    
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

// ========================
// HOME PAGE
// ========================

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
        
        <div class="glass text-center p-6 delay-700">
          <i class="fa-solid fa-link text-purple-400 text-3xl mb-3"></i>
          <h2 class="text-xl font-bold">URL Shortener</h2>
          <p class="text-purple-100 text-sm mt-2">Create secure short links with page flow & analytics.</p>
          <a href="/dashboard" class="btn inline-block mt-4 bg-purple-500 text-white font-semibold px-5 py-2 rounded-full">Go to Dashboard</a>
        </div>
      </div>

      <div class="text-center mt-12 text-sm text-purple-200">
        <p>💫 Developed by <b>@Sandip10x</b> | Powered by <b>MythoBot Server</b></p>
        <p class="mt-1">
          <a href="https://t.me/MythoSerialBot" class="underline text-purple-100">Telegram Bot</a> • 
          <a href="/radhe" class="underline text-purple-100">Radhe Radhe Game</a> •
          <a href="/dashboard" class="underline text-purple-100">URL Dashboard</a>
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

// YouTube Downloader
app.use("/yt", youtubeDLRouter);

// ========================
// USER DASHBOARD (Original) - Keep for backward compatibility
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
    const totalPageViews = links.reduce((sum, link) => sum + (link.page_views || 0), 0);
    
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
                  <i class="fa-solid fa-file-alt text-purple-500 text-xl"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Page Views</p>
                  <p class="text-2xl font-bold">${totalPageViews}</p>
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
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page Views</th>
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
                            ${link.flow_code ? `
                            <p class="text-xs text-gray-500">
                              <i class="fas fa-file-alt mr-1"></i>
                              Page Flow: <a href="/flow/${link.flow_code}" target="_blank" class="text-green-500">/flow/${link.flow_code}</a>
                            </p>
                            ` : ''}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">${link.clicks || 0}</td>
                      <td class="px-6 py-4">${link.page_views || 0}</td>
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

// ========================
// ERROR HANDLING
// ========================

app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; }
        .error { color: #dc3545; font-size: 48px; margin: 20px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error">🔍 404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/" class="btn">Return to Home</a>
      </div>
    </body>
    </html>
  `);
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>500 - Server Error</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; }
        .error { color: #dc3545; font-size: 48px; margin: 20px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error">💥 500</div>
        <h1>Internal Server Error</h1>
        <p>Something went wrong on our end. Please try again later.</p>
        <a href="/" class="btn">Return to Home</a>
      </div>
    </body>
    </html>
  `);
});

// ========================
// START SERVER
// ========================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Home: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔗 Short URLs: http://localhost:${PORT}/s/{id}`);
  console.log(`📄 Page Flow: http://localhost:${PORT}/flow/{code}`);
  console.log(`🎯 Get Link Page: http://localhost:${PORT}/flow/{code}/get-link`);
  console.log(`💰 Ad Page: http://localhost:${PORT}/adgate/{shortId}`);
  console.log(`📊 User Dashboard: http://localhost:${PORT}/dashboard/{userId}`);
  console.log(`✨ MythoBot Portal: FULLY FUNCTIONAL`);
  console.log(`🛡️ Security: Token-based page flow (NO BYPASS)`);
  console.log(`📝 Dashboard: Full management interface`);
  console.log(`📰 Articles: Customizable content system`);
  console.log(`📱 UI: Instagram-style bottom menu (3 rows)`);
  console.log(`⏱️ Page wait time: 10s per page (3 pages total)`);
  console.log(`⏱️ Ad page wait: 10s`);
  console.log(`🚫 Skip buttons: REMOVED - Users must wait full time`);
  console.log(`🎉 Complete flow: 3 pages → Get Link → 10s ad → Destination`);
});
