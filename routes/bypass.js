// routes/bypass.js
import express from "express";
import { generateToken, isValidUrl } from "../utils/helpers.js";
import { getCollections } from "../utils/database.js";

const router = express.Router();

// Helper function to extract token from SoftURL format
function extractTokenFromSoftURL(softurlToken) {
  console.log("Extracting token from:", softurlToken);
  
  // If token has underscore, extract the part after the last underscore
  if (softurlToken.includes('_')) {
    const parts = softurlToken.split('_');
    const extractedToken = parts[parts.length - 1];
    console.log("Extracted token:", extractedToken);
    return extractedToken;
  }
  
  return softurlToken;
}

// 🔹 Bypass protection with userId and token format: /Bypass/:userId/:token
router.get("/Bypass/:userId/:token", async (req, res) => {
  try {
    const { userId, token } = req.params;
    const collections = getCollections();
    const { urlShortenerCollection } = collections;

    console.log("=== BYPASS REQUEST WITH USER ID ===");
    console.log("User ID:", userId);
    console.log("Token from URL:", token);

    // Extract clean token
    const cleanToken = extractTokenFromSoftURL(token);
    console.log("Clean token:", cleanToken);

    // Check referer to determine if it's from SoftURL
    const referer = req.get("referer") || "";
    const isFromSoftURL = referer.includes("softurl.in");
    console.log("Referer:", referer);
    console.log("Is from SoftURL?", isFromSoftURL);

    // Try to find the record with user_id and token
    let record = await urlShortenerCollection.findOne({ 
      user_id: parseInt(userId),
      token: cleanToken
    });

    // If not found with clean token, try with original token
    if (!record && cleanToken !== token) {
      record = await urlShortenerCollection.findOne({ 
        user_id: parseInt(userId),
        token: token
      });
    }

    // If still not found, try just by token (any user)
    if (!record) {
      record = await urlShortenerCollection.findOne({ 
        token: cleanToken
      });
      
      if (!record && cleanToken !== token) {
        record = await urlShortenerCollection.findOne({ 
          token: token
        });
      }
    }

    if (!record) {
      console.log("Token not found for user", userId);
      
      // Show error page
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .debug { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 15px 0; font-family: monospace; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Token Not Found</h2>
            <p>User ID: <code>${userId}</code></p>
            <p>Token: <code>${token}</code></p>
            <p>Clean Token: <code>${cleanToken}</code></p>
            <p>This token was not found in the database for the specified user.</p>
          </div>
          
          <div class="debug">
            <h4>Debug Info:</h4>
            <p><strong>From SoftURL:</strong> ${isFromSoftURL ? 'Yes' : 'No'}</p>
            <p><strong>Referer:</strong> ${referer || 'None'}</p>
            <p><strong>Solution:</strong> Create a new short URL using the API</p>
          </div>
          
          <p><a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
          <p><a href="/create-short?userId=${userId}">Create Short URL for User ${userId}</a></p>
        </body>
        </html>
      `);
    }

    // Update click count
    await urlShortenerCollection.updateOne(
      { _id: record._id },
      { 
        $inc: { clicks: 1 }, 
        $set: { 
          last_accessed: new Date(),
          accessed_from: isFromSoftURL ? 'softurl' : 'direct',
          referer: referer,
          last_user_id: userId
        }
      }
    );

    // Get target URL
    const targetUrl = record.target_url || record.original_url || "https://t.me/MythoSerialBot";
    
    console.log("Redirecting to:", targetUrl);
    
    // Check if it's a direct bypass attempt (not from SoftURL)
    if (!isFromSoftURL) {
      console.log("Direct access attempt detected");
      
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
      
      // Show roast page for direct access attempts
      const roastMessages = [
        "🚫 Direct access detected! You must use SoftURL!",
        "🤡 Trying to skip the line? Not on my watch!",
        "🎯 Bypass attempt blocked! Use the proper SoftURL link!",
      ];
      const randomRoast = roastMessages[Math.floor(Math.random() * roastMessages.length)];
      
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Direct Access Blocked! 🚫</title>
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
            <p>User ID: <code>${userId}</code></p>
            <p>This content is protected and can only be accessed through SoftURL!</p>
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

    // LEGITIMATE SOFTURL ACCESS - REDIRECT
    console.log(`✅ Legitimate SoftURL access for user ${userId} - Redirecting to: ${targetUrl}`);
    
    await urlShortenerCollection.updateOne(
      { _id: record._id },
      { 
        $set: { 
          status: "SUCCESS - Redirected via SoftURL",
          last_success_access: new Date(),
          last_success_user_id: userId
        }
      }
    );

    // REDIRECT to target URL
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

// 🔹 Bypass protection with just token format: /Bypass/:token (for backward compatibility)
router.get("/Bypass/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const collections = getCollections();
    const { urlShortenerCollection } = collections;

    console.log("=== BYPASS REQUEST (TOKEN ONLY) ===");
    console.log("Token from URL:", token);

    // Extract clean token
    const cleanToken = extractTokenFromSoftURL(token);
    console.log("Clean token:", cleanToken);

    // Check referer
    const referer = req.get("referer") || "";
    const isFromSoftURL = referer.includes("softurl.in");
    console.log("Is from SoftURL?", isFromSoftURL);

    // Find record by token
    let record = await urlShortenerCollection.findOne({ 
      token: cleanToken
    });

    if (!record && cleanToken !== token) {
      record = await urlShortenerCollection.findOne({ 
        token: token
      });
    }

    if (!record) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Token Not Found</h2>
            <p>Token: <code>${token}</code> was not found in the database.</p>
            <p>Please use the correct URL format with user ID.</p>
          </div>
          <p><a href="https://t.me/MythoSerialBot">Go to MythoBot</a></p>
        </body>
        </html>
      `);
    }

    // Get user ID from record
    const userId = record.user_id || "unknown";
    
    // Update click count
    await urlShortenerCollection.updateOne(
      { _id: record._id },
      { 
        $inc: { clicks: 1 }, 
        $set: { 
          last_accessed: new Date(),
          accessed_from: isFromSoftURL ? 'softurl' : 'direct',
          referer: referer
        }
      }
    );

    // Get target URL
    const targetUrl = record.target_url || record.original_url || "https://t.me/MythoSerialBot";
    
    console.log("Redirecting to:", targetUrl);
    
    // Check if it's a direct bypass attempt
    if (!isFromSoftURL) {
      console.log("Direct access attempt detected");
      
      await urlShortenerCollection.updateOne(
        { _id: record._id },
        { 
          $set: { 
            is_bypass_attempt: true,
            blocked: true,
            status: "BLOCKED - Direct access"
          }
        }
      );
      
      // Show roast page
      const roastMessages = [
        "🚫 Direct access detected! You must use SoftURL!",
        "🤡 Trying to bypass? This isn't the right way!",
        "🎯 Bypass attempt blocked!",
      ];
      const randomRoast = roastMessages[Math.floor(Math.random() * roastMessages.length)];
      
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Direct Access Blocked! 🚫</title>
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
            <p>User ID: <code>${userId}</code></p>
            <p>Use SoftURL to access this content!</p>
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

    // LEGITIMATE SOFTURL ACCESS - REDIRECT
    console.log(`✅ Legitimate SoftURL access - Redirecting to: ${targetUrl}`);
    
    await urlShortenerCollection.updateOne(
      { _id: record._id },
      { 
        $set: { 
          status: "SUCCESS - Redirected via SoftURL",
          last_success_access: new Date()
        }
      }
    );

    // REDIRECT to target URL
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
  const { url, userId = "0" } = req.query;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing url parameter"
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
    
    // Generate a clean token
    const cleanToken = generateToken(12);
    
    console.log("Creating short URL for user", userId, "with token:", cleanToken);
    
    // Store in database
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId) || 0,
      token: cleanToken,
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true,
      status: "active"
    });
    
    // Generate TWO bypass URLs:
    // 1. With user ID: /Bypass/:userId/:token
    // 2. Without user ID: /Bypass/:token (for backward compatibility)
    const bypassUrlWithUser = `https://${req.hostname}/Bypass/${userId}/${cleanToken}`;
    const bypassUrlSimple = `https://${req.hostname}/Bypass/${cleanToken}`;
    
    res.json({
      success: true,
      original_url: url,
      bypass_url_with_user: bypassUrlWithUser,
      bypass_url_simple: bypassUrlSimple,
      token: cleanToken,
      user_id: userId,
      timestamp: new Date().toISOString(),
      recommended_url: bypassUrlWithUser,
      note: "Use bypass_url_with_user for better user tracking"
    });
    
  } catch (error) {
    console.error("Shorten error:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

// 🔹 Create a short URL with user ID
router.get("/create-short", async (req, res) => {
  const { url = "https://google.com", userId = "5189870730" } = req.query;
  
  try {
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    const cleanToken = generateToken(12);
    
    await urlShortenerCollection.insertOne({
      user_id: parseInt(userId) || 5189870730,
      token: cleanToken,
      original_url: url,
      target_url: url,
      created_at: new Date(),
      clicks: 0,
      is_active: true,
      status: "test"
    });
    
    const bypassUrl = `https://${req.hostname}/Bypass/${userId}/${cleanToken}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Short URL Created</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .info { background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 15px 0; }
          code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
          .url-box { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>✅ Short URL Created!</h1>
        
        <div class="success">
          <h3>Your Short URL Details:</h3>
          <p><strong>User ID:</strong> <code>${userId}</code></p>
          <p><strong>Original URL:</strong> <code>${url}</code></p>
          <p><strong>Clean Token:</strong> <code>${cleanToken}</code></p>
        </div>
        
        <div class="info">
          <h3>📋 Your Bypass URL:</h3>
          <div class="url-box">
            <code>${bypassUrl}</code>
          </div>
          <p><a href="${bypassUrl}" target="_blank">Test this URL directly</a></p>
        </div>
        
        <div class="info">
          <h3>📝 How to Test with SoftURL:</h3>
          <ol>
            <li>Copy this bypass URL: <code>${bypassUrl}</code></li>
            <li>Go to <a href="https://softurl.in" target="_blank">softurl.in</a></li>
            <li>Paste the bypass URL and click "Shorten URL"</li>
            <li>Copy the shortened SoftURL link</li>
            <li>Open the SoftURL link in a new tab</li>
            <li><strong>Expected:</strong> It should redirect to <code>${url}</code></li>
          </ol>
        </div>
        
        <div class="info">
          <h3>🔧 API Endpoint:</h3>
          <p><a href="/shorten?url=${encodeURIComponent(url)}&userId=${userId}">View JSON API response</a></p>
          <p><a href="/view-all">View all stored URLs</a></p>
        </div>
        
        <p><a href="/">Back to Home</a></p>
      </body>
      </html>
    `);
    
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// 🔹 View all stored URLs
router.get("/view-all", async (req, res) => {
  try {
    const collections = getCollections();
    const { urlShortenerCollection } = collections;
    
    const urls = await urlShortenerCollection.find({})
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>All Stored URLs</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 50px auto; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
          th { background-color: #f2f2f2; }
          .token { font-family: monospace; font-size: 12px; }
          .url { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .create-btn { display: inline-block; background: #28a745; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>📋 All Stored URLs (${urls.length})</h1>
        
        <a href="/create-short?userId=5189870730" class="create-btn">➕ Create New URL for User 5189870730</a>
        
        <table>
          <tr>
            <th>User ID</th>
            <th>Token</th>
            <th>Target URL</th>
            <th>Created</th>
            <th>Clicks</th>
            <th>Status</th>
            <th>Test Links</th>
          </tr>
          ${urls.map(u => `
          <tr>
            <td>${u.user_id || 'N/A'}</td>
            <td class="token"><code>${u.token || 'N/A'}</code></td>
            <td class="url" title="${u.target_url || u.original_url || ''}">
              <a href="${u.target_url || u.original_url || '#'}" target="_blank">
                ${(u.target_url || u.original_url || '').substring(0, 40)}...
              </a>
            </td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>${u.clicks || 0}</td>
            <td>${u.status || 'active'}</td>
            <td>
              ${u.user_id ? `<a href="/Bypass/${u.user_id}/${u.token}" target="_blank">With User ID</a><br>` : ''}
              <a href="/Bypass/${u.token}" target="_blank">Token Only</a>
            </td>
          </tr>
          `).join('')}
        </table>
        
        <p><a href="/">Back to Home</a></p>
      </body>
      </html>
    `);
    
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

export default router;
