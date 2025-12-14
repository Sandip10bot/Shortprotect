// routes/bypass.js
import express from "express";
import { generateToken, isValidUrl } from "../utils/helpers.js";
import { getCollections } from "../utils/database.js";

const router = express.Router();

// 🔹 Generate a token and return protected link
router.get("/generate/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const token = generateToken();
    const collections = getCollections();
    const { doubleCollection } = collections;

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
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).send("Server error");
  }
});

// 🔹 Validate and redirect for double points
router.get("/double/:userId/:token", async (req, res) => {
  try {
    const { userId, token } = req.params;
    const collections = getCollections();
    const { doubleCollection } = collections;

    console.log(`--- incoming /double request for user=${userId} token=${token} ---`);

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
          </style>
        </head>
        <body>
          <div class="roast-container">
            <div class="roast-message">"${randomRoast}"</div>
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
  } catch (error) {
    console.error("Double points error:", error);
    res.status(500).send("Server error");
  }
});

// 🔹 Bypass protection for URL shortener
router.get("/Bypass/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const collections = getCollections();
    const { doubleCollection, urlShortenerCollection } = collections;

    console.log("--- incoming /Bypass request ---");
    console.log("token:", token);

    const referer = req.get("referer") || "";
    const isBypassAttempt = !referer.includes("softurl.in");

    // Clean the token - remove any underscores that might be added
    const cleanToken = token.includes('_') ? token.split('_')[1] || token : token;
    
    console.log("Searching for token:", cleanToken);

    // Look for the token in the database
    let record = await urlShortenerCollection.findOne({ 
      token: cleanToken
    });

    // If not found with clean token, try the original token
    if (!record && cleanToken !== token) {
      record = await urlShortenerCollection.findOne({ 
        token: token
      });
    }

    if (!record) {
      // If not found, try to find it in double_points collection
      let doubleRecord = await doubleCollection.findOne({ token: cleanToken });
      
      if (!doubleRecord && cleanToken !== token) {
        doubleRecord = await doubleCollection.findOne({ token });
      }
      
      if (doubleRecord && !doubleRecord.used) {
        // Mark as used and redirect to bot
        await doubleCollection.updateOne(
          { _id: doubleRecord._id },
          { $set: { used: true, used_at: new Date() } }
        );
        
        const botUsername = "MythoSerialBot";
        const deepLink = `https://t.me/${botUsername}?start=double_${doubleRecord.user_id}_${doubleRecord.token}`;
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
              <li>Token: ${token}</li>
              <li>Clean token: ${cleanToken}</li>
            </ul>
            <p><strong>Debug Info:</strong></p>
            <p>Total records in urlShortenerCollection: ${await urlShortenerCollection.countDocuments()}</p>
            <p>Total records in doubleCollection: ${await doubleCollection.countDocuments()}</p>
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
    
    if (!targetUrl) {
      return res.status(404).send("No target URL found for this token");
    }
    
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
          <p>Error: ${err.message}</p>
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
    
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    // Generate token for the URL
    const token = generateToken();
    
    console.log("Generated token for shortening:", token);
    
    // Store in database
    const result = await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: token,
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true,
      status: "active"
    });
    
    console.log("Inserted record with ID:", result.insertedId);
    
    // Generate bypass URL
    const bypassUrl = `https://${req.hostname}/Bypass/${token}`;
    
    res.json({
      success: true,
      original_url: url,
      bypass_url: bypassUrl,
      token: token,
      user_id: userId,
      timestamp: new Date().toISOString(),
      debug: {
        inserted: true,
        recordId: result.insertedId
      }
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
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    const stats = await urlShortenerCollection
      .find({ user_id: parseInt(userId) })
      .sort({ created_at: -1 })
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

// 🔹 Debug endpoint to see all tokens
router.get("/debug/tokens", async (req, res) => {
  try {
    const collections = getCollections();
    const { urlShortenerCollection, doubleCollection } = collections;
    
    const urlTokens = await urlShortenerCollection.find({}).project({ token: 1, created_at: 1, _id: 0 }).toArray();
    const doubleTokens = await doubleCollection.find({}).project({ token: 1, created_at: 1, _id: 0 }).toArray();
    
    res.json({
      success: true,
      url_tokens: urlTokens,
      double_tokens: doubleTokens,
      total_url_tokens: urlTokens.length,
      total_double_tokens: doubleTokens.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
