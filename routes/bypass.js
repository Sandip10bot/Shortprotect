// routes/bypass.js
import express from "express";
import { getCollections } from "../utils/database.js";
import { generateToken, isValidUrl } from "../utils/helpers.js";

const router = express.Router();
const { doubleCollection, urlShortenerCollection } = getCollections();

// 🔹 Generate a token and return protected link
router.get("/generate/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = generateToken();

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
router.get("/double/:userId/:token", async (req, res) => {
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

// 🔹 Bypass protection for URL shortener
router.get("/Bypass/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log("--- incoming /Bypass request ---");
    console.log("token:", token);
    console.log("referer:", req.get("referer"));
    console.log("user-agent:", req.get("user-agent"));

    const referer = req.get("referer") || "";
    const isBypassAttempt = !referer.includes("softurl.in");

    // Look for the token in the database
    const record = await urlShortenerCollection.findOne({ 
      token: token,
      $or: [
        { target_url: { $exists: true } },
        { original_url: { $exists: true } }
      ]
    });

    if (!record) {
      // If not found, try to find it in double_points collection
      const doubleRecord = await doubleCollection.findOne({ token });
      if (doubleRecord && !doubleRecord.used) {
        // Mark as used and redirect to bot
        await doubleCollection.updateOne(
          { token },
          { $set: { used: true, used_at: new Date() } }
        );
        
        const botUsername = "MythoSerialBot";
        const deepLink = `https://t.me/${botUsername}?start=double_${doubleRecord.user_id}_${token}`;
        return res.redirect(deepLink);
      }
      
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Invalid or Expired Link</h2>
            <p>The token <code>${token}</code> was not found or has expired.</p>
            <p>This could be because:</p>
            <ul style="text-align: left; margin: 10px 0;">
              <li>The link has expired</li>
              <li>The token was already used</li>
              <li>Invalid token format</li>
            </ul>
          </div>
          <p><a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
        </body>
        </html>
      `);
    }

    // Update click count
    await urlShortenerCollection.updateOne(
      { _id: record._id },
      { $inc: { clicks: 1 }, $set: { last_accessed: new Date() } }
    );

    // Get the target URL from either field
    const targetUrl = record.target_url || record.original_url;
    
    // Check referer for bypass attempts
    if (!referer.includes("softurl.in")) {
      // This is a bypass attempt
      await urlShortenerCollection.updateOne(
        { _id: record._id },
        { 
          $set: { 
            is_bypass_attempt: true,
            blocked: true,
            status: "BLOCKED - Direct access attempt"
          },
          $push: {
            access_logs: {
              timestamp: new Date(),
              ip: req.ip,
              user_agent: req.get("user-agent"),
              referer: referer,
              status: "blocked"
            }
          }
        }
      );
      
      // Show roast page
      const roastMessages = [
        "🚫 Oops! Trying to bypass SoftURL? Even my grandma follows links better!",
        "🤡 Nice try, bypass bandit! But this isn't a shortcut, it's a dead end!",
        "🎯 Bypass detected! Your hacking skills need more practice, padawan!",
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
          </style>
        </head>
        <body>
          <div class="roast-container">
            <div class="roast-message">"${randomRoast}"</div>
            <p>Use the proper SoftURL link to access this content!</p>
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

    // Legitimate access - redirect to target
    console.log(`✅ Legitimate access from SoftURL - Redirecting to: ${targetUrl}`);
    return res.redirect(targetUrl);

  } catch (err) {
    console.error("Bypass route error:", err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { background: #f8d7da; padding: 20px; border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Server Error</h2>
          <p>Something went wrong on our end. Please try again later.</p>
        </div>
        <p><a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
      </body>
      </html>
    `);
  }
});

// 🔹 URL Shortener API endpoint
router.get("/shorten", async (req, res) => {
  const { url, userId } = req.query;
  
  if (!url || !userId) {
    return res.status(400).json({
      success: false,
      error: "Missing url or userId parameters"
    });
  }
  
  try {
    // Validate URL
    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: "Invalid URL format"
      });
    }
    
    // Generate token for the URL
    const token = generateToken();
    
    // Store in database
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: token,
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true
    });
    
    // Generate bypass URL
    const bypassUrl = `https://${req.hostname}/Bypass/${token}`;
    
    res.json({
      success: true,
      original_url: url,
      bypass_url: bypassUrl,
      token: token,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Shorten error:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

// 🔹 Get URL access statistics
router.get("/stats/:userId", async (req, res) => {
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

export default router;
