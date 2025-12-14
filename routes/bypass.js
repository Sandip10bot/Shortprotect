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
    // We want the RANDOM_TOKEN part (last part)
    if (parts.length >= 2) {
      const extractedToken = parts[parts.length - 1];
      console.log("Extracted token:", extractedToken);
      return extractedToken;
    }
  }
  
  // If no underscore, return as is
  return softurlToken;
}

// Helper function to generate a clean token (just the random part)
function generateCleanToken() {
  // Generate 12 random bytes = 24 hex characters
  const token = generateToken(12);
  console.log("Generated clean token:", token);
  return token;
}

// 🔹 Bypass protection for URL shortener (Main Route)
router.get("/Bypass/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const collections = getCollections();
    const { urlShortenerCollection } = collections;

    console.log("=== NEW BYPASS REQUEST ===");
    console.log("Incoming token from URL:", token);

    // Extract the actual token from SoftURL format
    const actualToken = extractTokenFromSoftURL(token);
    console.log("Actual token to search:", actualToken);

    const referer = req.get("referer") || "";
    const userAgent = req.get("user-agent") || "";
    const isFromSoftURL = referer.includes("softurl.in") || userAgent.includes("SoftURL");

    console.log("Is from SoftURL?", isFromSoftURL);

    // Look for the token in the database - try multiple approaches
    let record = null;
    
    // FIRST: Try to find by the extracted token (the random part)
    record = await urlShortenerCollection.findOne({ 
      token: actualToken 
    });

    // SECOND: If not found, try to find by full token
    if (!record) {
      record = await urlShortenerCollection.findOne({ 
        token: token 
      });
    }

    // THIRD: If still not found, search for any token that contains the extracted token
    if (!record) {
      const allRecords = await urlShortenerCollection.find({}).toArray();
      record = allRecords.find(r => {
        if (!r.token) return false;
        
        // Check if stored token ends with the extracted token
        if (r.token.endsWith(actualToken)) {
          console.log("Found partial match:", r.token, "ends with", actualToken);
          return true;
        }
        
        // Check if stored token contains the extracted token
        if (r.token.includes(actualToken)) {
          console.log("Found contains match:", r.token, "contains", actualToken);
          return true;
        }
        
        return false;
      });
    }

    if (!record) {
      console.log("Token not found in database");
      
      // Get all tokens for debugging
      const allTokens = await urlShortenerCollection.find({}).project({ token: 1, _id: 0 }).toArray();
      const uniqueTokens = [...new Set(allTokens.map(t => t.token))];
      
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
          </div>
          
          <div class="debug">
            <h3>Database Tokens (${uniqueTokens.length} unique):</h3>
            <ul>
              ${uniqueTokens.map(t => `<li><code>${t || 'No token'}</code></li>`).join('')}
            </ul>
          </div>
          
          <div class="success">
            <h3>Fix This Issue:</h3>
            <p>The problem is that your database has tokens WITH SoftURL prefixes (like <code>xnBJZGfX_02750b6813</code>).</p>
            <p>You need to:</p>
            <ol>
              <li>Clear your database or update existing records</li>
              <li>Use the new <a href="/fix-database">Fix Database</a> tool</li>
              <li>Create new short URLs using the updated system</li>
            </ol>
          </div>
          
          <p><a href="/">Back to Home</a> | <a href="/fix-database">Fix Database</a></p>
        </body>
        </html>
      `);
    }

    console.log("Found record:", {
      id: record._id,
      stored_token: record.token,
      target_url: record.target_url
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
    
    console.log("Redirecting to:", targetUrl);
    
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

// 🔹 URL Shortener API endpoint (UPDATED - Store clean tokens)
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
    
    // Generate a CLEAN token (just the random part, no prefix)
    const cleanToken = generateCleanToken();
    
    console.log("Creating short URL with CLEAN token:", cleanToken);
    
    // Store in database - ONLY the clean token
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: cleanToken, // Store ONLY the clean token
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true,
      status: "active",
      note: "Clean token stored - SoftURL will add its own prefix"
    });
    
    // Generate bypass URL
    const bypassUrl = `https://${req.hostname}/Bypass/${cleanToken}`;
    
    res.json({
      success: true,
      original_url: url,
      bypass_url: bypassUrl,
      token: cleanToken,
      clean_token: cleanToken,
      user_id: userId,
      timestamp: new Date().toISOString(),
      note: "IMPORTANT: Use this bypass_url with SoftURL.in. The system will extract the clean token automatically."
    });
    
  } catch (error) {
    console.error("Shorten error:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

// 🔹 Fix Database Tool
router.get("/fix-database", async (req, res) => {
  try {
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    // Get all records
    const allRecords = await urlShortenerCollection.find({}).toArray();
    
    let fixedCount = 0;
    let errorCount = 0;
    const results = [];
    
    // Process each record
    for (const record of allRecords) {
      if (record.token && record.token.includes('_')) {
        const oldToken = record.token;
        const newToken = extractTokenFromSoftURL(oldToken);
        
        if (newToken !== oldToken) {
          try {
            // Update the record with clean token
            await urlShortenerCollection.updateOne(
              { _id: record._id },
              { 
                $set: { 
                  token: newToken,
                  fixed_at: new Date(),
                  old_token: oldToken // Keep old token for reference
                }
              }
            );
            
            fixedCount++;
            results.push({
              id: record._id.toString(),
              old_token: oldToken,
              new_token: newToken,
              status: "FIXED"
            });
            
          } catch (error) {
            errorCount++;
            results.push({
              id: record._id.toString(),
              old_token: oldToken,
              error: error.message,
              status: "ERROR"
            });
          }
        }
      }
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Database Fix Tool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .error { background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .info { background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Database Fix Tool</h1>
        
        <div class="success">
          <h3>✅ Database Fix Complete</h3>
          <p><strong>Total Records Processed:</strong> ${allRecords.length}</p>
          <p><strong>Fixed:</strong> ${fixedCount}</p>
          <p><strong>Errors:</strong> ${errorCount}</p>
        </div>
        
        ${results.length > 0 ? `
        <div class="info">
          <h3>Fix Results:</h3>
          <table>
            <tr>
              <th>Record ID</th>
              <th>Old Token</th>
              <th>New Token</th>
              <th>Status</th>
            </tr>
            ${results.map(r => `
            <tr>
              <td>${r.id.substring(0, 8)}...</td>
              <td><code>${r.old_token}</code></td>
              <td><code>${r.new_token || ''}</code></td>
              <td>${r.status}</td>
            </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}
        
        <div class="info">
          <h3>Next Steps:</h3>
          <ol>
            <li><a href="/test/shorten">Create a test short URL</a> to verify the fix</li>
            <li><a href="/debug/tokens">Check all tokens</a> to ensure they're clean</li>
            <li>Test with SoftURL to confirm redirection works</li>
          </ol>
        </div>
        
        <p><a href="/">Back to Home</a></p>
      </body>
      </html>
    `);
    
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Database Fix Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #f8d7da; padding: 20px; border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Database Fix Error</h2>
          <p>Error: ${error.message}</p>
        </div>
        <p><a href="/">Back to Home</a></p>
      </body>
      </html>
    `);
  }
});

// 🔹 Test endpoint to create a short URL
router.get("/test/shorten", async (req, res) => {
  const { url = "https://google.com", userId = "test123" } = req.query;
  
  try {
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    // Generate CLEAN token
    const cleanToken = generateCleanToken();
    
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId),
      token: cleanToken,
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true,
      status: "test"
    });
    
    const bypassUrl = `https://${req.hostname}/Bypass/${cleanToken}`;
    
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
          <p><strong>Clean Token:</strong> <code>${cleanToken}</code></p>
          <p><strong>Bypass URL:</strong> <code>${bypassUrl}</code></p>
        </div>
        
        <div class="info">
          <h3>Test Steps:</h3>
          <ol>
            <li>Copy this bypass URL: <code>${bypassUrl}</code></li>
            <li>Go to <a href="https://softurl.in" target="_blank">softurl.in</a></li>
            <li>Paste the bypass URL and shorten it</li>
            <li>Click the SoftURL shortened link</li>
            <li>It should redirect to <code>${url}</code></li>
          </ol>
        </div>
        
        <div class="info">
          <h3>Direct Test Links:</h3>
          <p>1. <a href="${bypassUrl}" target="_blank">Direct Access (Should show bypass page)</a></p>
          <p>2. <a href="/shorten?url=${encodeURIComponent(url)}&userId=${userId}">API Response</a></p>
          <p>3. <a href="/debug/tokens">View All Tokens</a></p>
        </div>
        
        <p><a href="/">Back to Home</a> | <a href="/fix-database">Fix Old Tokens</a></p>
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
        id: t._id.toString().substring(0, 8) + '...',
        token: t.token,
        clean_token: t.token.includes('_') ? extractTokenFromSoftURL(t.token) : t.token,
        has_prefix: t.token.includes('_'),
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

export default router;
