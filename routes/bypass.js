// routes/bypass.js
import express from "express";
import { generateToken, isValidUrl } from "../utils/helpers.js";
import { getCollections } from "../utils/database.js";

const router = express.Router();

// Helper function to extract token from SoftURL format
function extractTokenFromSoftURL(softurlToken) {
  console.log("Extracting token from:", softurlToken);
  
  // If token has underscore, it's likely from SoftURL
  if (softurlToken.includes('_')) {
    const parts = softurlToken.split('_');
    
    // SoftURL format: PREFIX_RANDOM_TOKEN
    // We want the RANDOM_TOKEN part
    if (parts.length >= 2) {
      // Return the last part (the actual token)
      const extractedToken = parts[parts.length - 1];
      console.log("Extracted token:", extractedToken);
      return extractedToken;
    }
  }
  
  // If no underscore, return as is
  return softurlToken;
}

// 🔹 Bypass protection for URL shortener (Main Route)
router.get("/Bypass/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const collections = getCollections();
    const { urlShortenerCollection } = collections;

    console.log("=== NEW BYPASS REQUEST ===");
    console.log("Incoming token from URL:", token);
    console.log("Referer:", req.get("referer"));
    console.log("User Agent:", req.get("user-agent"));

    // Extract the actual token from SoftURL format
    const actualToken = extractTokenFromSoftURL(token);
    console.log("Actual token to search:", actualToken);

    const referer = req.get("referer") || "";
    const userAgent = req.get("user-agent") || "";
    const isFromSoftURL = referer.includes("softurl.in") || userAgent.includes("SoftURL");

    console.log("Is from SoftURL?", isFromSoftURL);

    // Look for the token in the database
    let record = await urlShortenerCollection.findOne({ 
      token: actualToken 
    });

    // If not found with actual token, try the original token
    if (!record && actualToken !== token) {
      record = await urlShortenerCollection.findOne({ 
        token: token 
      });
    }

    if (!record) {
      console.log("Token not found in database");
      
      // Create a test response to debug
      const allTokens = await urlShortenerCollection.find({}).project({ token: 1, _id: 0 }).toArray();
      console.log("All tokens in database:", allTokens.map(t => t.token));
      
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .error { background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .debug { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 15px 0; font-family: monospace; font-size: 12px; }
            .success { background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Token Not Found in Database</h2>
            <p><strong>Received Token:</strong> <code>${token}</code></p>
            <p><strong>Extracted Token:</strong> <code>${actualToken}</code></p>
            <p><strong>Is from SoftURL:</strong> ${isFromSoftURL ? 'Yes' : 'No'}</p>
            <p><strong>Referer:</strong> ${referer || 'None'}</p>
          </div>
          
          <div class="debug">
            <h3>Debug Information:</h3>
            <p><strong>Total records in database:</strong> ${allTokens.length}</p>
            <p><strong>All stored tokens:</strong></p>
            <ul>
              ${allTokens.map(t => `<li><code>${t.token || 'No token'}</code></li>`).join('')}
            </ul>
          </div>
          
          <div class="success">
            <h3>Test Links:</h3>
            <p><a href="/test/shorten?url=https://google.com">Create a test short URL</a></p>
            <p><a href="/debug/tokens">View all tokens (JSON)</a></p>
          </div>
          
          <p><a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
        </body>
        </html>
      `);
    }

    console.log("Found record:", {
      id: record._id,
      token: record.token,
      target_url: record.target_url,
      original_url: record.original_url
    });

    // Update click count
    await urlShortenerCollection.updateOne(
      { _id: record._id },
      { 
        $inc: { clicks: 1 }, 
        $set: { 
          last_accessed: new Date(),
          accessed_from: isFromSoftURL ? 'softurl' : 'direct',
          referer: referer,
          user_agent: userAgent,
          ip_address: req.ip
        }
      }
    );

    // Get the target URL
    const targetUrl = record.target_url || record.original_url;
    
    if (!targetUrl) {
      return res.status(404).send("No target URL found for this token");
    }
    
    console.log("Target URL:", targetUrl);
    
    // Check if this is a bypass attempt (not from SoftURL)
    if (!isFromSoftURL) {
      console.log("Bypass attempt detected!");
      
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
      
      // Show roast page for bypass attempts
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
          <p style="font-size: 12px; margin-top: 20px;">
            Token: ${record.token}<br>
            Access blocked: ${new Date().toLocaleString()}
          </p>
        </body>
        </html>
      `);
    }

    // LEGITIMATE ACCESS FROM SOFTURL
    console.log(`✅ Legitimate SoftURL access - Redirecting to: ${targetUrl}`);
    
    // Log successful access
    await urlShortenerCollection.updateOne(
      { _id: record._id },
      { 
        $set: { 
          status: "SUCCESS - Redirected",
          last_success_access: new Date()
        }
      }
    );

    // REDIRECT to the target URL
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
    
    // Generate a clean token (just random hex, no prefix)
    const token = generateToken(12); // 12 bytes = 24 hex characters
    
    console.log("Creating short URL with token:", token);
    
    // Store in database
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: token,
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true,
      status: "active"
    });
    
    // Generate bypass URL for SoftURL
    const bypassUrl = `https://${req.hostname}/Bypass/${token}`;
    
    res.json({
      success: true,
      original_url: url,
      bypass_url: bypassUrl,
      token: token,
      user_id: userId,
      timestamp: new Date().toISOString(),
      note: "Use this bypass_url with SoftURL.in. The token will be extracted automatically."
    });
    
  } catch (error) {
    console.error("Shorten error:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

// 🔹 Test endpoint to create a short URL
router.get("/test/shorten", async (req, res) => {
  const { url = "https://google.com", userId = "test123" } = req.query;
  
  try {
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    const token = generateToken(12);
    
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: token,
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true,
      status: "test"
    });
    
    const bypassUrl = `https://${req.hostname}/Bypass/${token}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Short URL Created</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .info { background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 15px 0; }
          code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>✅ Test Short URL Created</h1>
        
        <div class="success">
          <h3>Successfully Created!</h3>
          <p><strong>Original URL:</strong> <code>${url}</code></p>
          <p><strong>Token:</strong> <code>${token}</code></p>
          <p><strong>User ID:</strong> ${userId}</p>
        </div>
        
        <div class="info">
          <h3>Test Links:</h3>
          <p>1. <a href="${bypassUrl}" target="_blank">Direct Access (Should show bypass page)</a></p>
          <p>2. <a href="/shorten?url=${encodeURIComponent(url)}&userId=${userId}">API Response (JSON)</a></p>
          <p>3. <a href="/debug/tokens">View All Tokens</a></p>
        </div>
        
        <div class="info">
          <h3>Instructions for SoftURL:</h3>
          <p>1. Go to <a href="https://softurl.in" target="_blank">softurl.in</a></p>
          <p>2. Paste this URL: <code>${bypassUrl}</code></p>
          <p>3. Get the shortened link from SoftURL</p>
          <p>4. Click the SoftURL link - it should redirect to ${url}</p>
        </div>
        
        <p><a href="/">Back to Home</a></p>
      </body>
      </html>
    `);
    
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// 🔹 Debug endpoint to see all tokens
router.get("/debug/tokens", async (req, res) => {
  try {
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    const tokens = await urlShortenerCollection.find({})
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    
    res.json({
      success: true,
      total_tokens: tokens.length,
      tokens: tokens.map(t => ({
        token: t.token,
        url: t.target_url || t.original_url,
        created_at: t.created_at,
        clicks: t.clicks || 0,
        status: t.status || 'active'
      }))
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Other routes remain the same...

export default router;
