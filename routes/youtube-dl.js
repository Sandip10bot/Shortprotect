// routes/youtube-dl.js
import express from "express";
import { spawn } from "child_process";
import { getCollections } from "../utils/database.js";

const router = express.Router();
const { downloadsCollection } = getCollections();

// YouTube Downloader routes
router.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>YouTube Downloader</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        input { width: 100%; padding: 10px; margin: 10px 0; }
        button { padding: 10px 20px; background: #ff0000; color: white; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>YouTube Downloader</h1>
        <form id="downloadForm">
          <input type="url" id="url" placeholder="Enter YouTube URL" required>
          <select id="format">
            <option value="mp4">Video (MP4)</option>
            <option value="mp3">Audio (MP3)</option>
          </select>
          <button type="submit">Download</button>
        </form>
        <div id="result"></div>
      </div>
      <script>
        document.getElementById('downloadForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const url = document.getElementById('url').value;
          const format = document.getElementById('format').value;
          
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = 'Processing...';
          
          try {
            const response = await fetch('/yt/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, format })
            });
            
            const data = await response.json();
            if (data.success) {
              resultDiv.innerHTML = \`<a href="\${data.downloadUrl}" target="_blank">Download \${format.toUpperCase()}</a>\`;
            } else {
              resultDiv.innerHTML = 'Error: ' + data.error;
            }
          } catch (error) {
            resultDiv.innerHTML = 'Error: ' + error.message;
          }
        });
      </script>
    </body>
    </html>
  `);
});

router.post("/download", async (req, res) => {
  const { url, format = "mp4" } = req.body;
  
  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }
  
  try {
    // Log the download request
    await downloadsCollection.insertOne({
      url,
      format,
      requested_at: new Date(),
      ip: req.ip,
      user_agent: req.get("user-agent")
    });
    
    // Here you would implement the actual YouTube download logic
    // For now, return a mock response
    res.json({
      success: true,
      message: "Download started",
      format,
      downloadUrl: "#", // This would be the actual download URL
      info: "YouTube download functionality needs to be implemented"
    });
    
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ success: false, error: "Download failed" });
  }
});

export default router;
