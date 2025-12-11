// youtube-dl.js
import express from "express";
import { spawn } from "child_process";

const router = express.Router();

// Initialize MongoDB connection variables
let downloadsCollection = null;
let isDBConnected = false;

// Function to set up database connection
export function setupYoutubeDB(client) {
    if (client) {
        const db = client.db("mythobot");
        downloadsCollection = db.collection("youtube_downloads");
        isDBConnected = true;
        console.log("✅ YouTube downloads database connected");
    }
}

// 🔹 YouTube Downloader Main Page
router.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YouTube Downloader Pro</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .glass {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .pulse {
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            .formats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 10px;
            }
            .format-btn {
                transition: all 0.3s ease;
            }
            .format-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .loader {
                border: 3px solid #f3f3f3;
                border-radius: 50%;
                border-top: 3px solid #3498db;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body class="min-h-screen p-4 md:p-6">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-4xl md:text-5xl font-bold text-white mb-3">
                    <i class="fab fa-youtube text-red-500"></i> YouTube Downloader Pro
                </h1>
                <p class="text-white/80 text-lg">Download videos & audio from YouTube in HD quality</p>
                <p class="text-white/60 text-sm mt-2">Supports MP4, MP3, 720p, 1080p, 4K formats</p>
            </div>

            <!-- Main Card -->
            <div class="glass p-6 md:p-8 mb-6">
                <!-- URL Input -->
                <div class="mb-6">
                    <label class="block text-white font-semibold mb-2" for="url">
                        <i class="fas fa-link mr-2"></i>YouTube Video URL
                    </label>
                    <div class="flex flex-col md:flex-row gap-3">
                        <input 
                            type="text" 
                            id="url" 
                            placeholder="https://www.youtube.com/watch?v=..." 
                            class="flex-grow p-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                        <button 
                            onclick="fetchVideoInfo()"
                            id="fetchBtn"
                            class="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <i class="fas fa-search"></i> Fetch Info
                        </button>
                    </div>
                </div>

                <!-- Video Info Display (Hidden initially) -->
                <div id="videoInfo" class="hidden">
                    <div class="bg-white/10 rounded-xl p-4 mb-6">
                        <div class="flex flex-col md:flex-row gap-4">
                            <!-- Thumbnail -->
                            <div class="md:w-1/3">
                                <img id="thumbnail" src="" alt="Video Thumbnail" class="w-full rounded-lg shadow-lg">
                            </div>
                            <!-- Details -->
                            <div class="md:w-2/3">
                                <h3 id="videoTitle" class="text-white text-xl font-bold mb-2"></h3>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-white/80 text-sm mb-4">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-clock"></i>
                                        <span id="duration"></span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-eye"></i>
                                        <span id="views"></span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-calendar"></i>
                                        <span id="uploadDate"></span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-user"></i>
                                        <span id="channel"></span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 mb-4">
                                    <span class="px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-sm" id="qualityBadge">HD</span>
                                    <span class="px-3 py-1 bg-green-500/30 text-green-200 rounded-full text-sm" id="sizeBadge"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Download Formats -->
                    <div class="mb-6">
                        <h3 class="text-white font-bold text-lg mb-4">
                            <i class="fas fa-download mr-2"></i>Select Format
                        </h3>
                        <div id="formatsContainer" class="formats-grid"></div>
                    </div>

                    <!-- Progress Bar -->
                    <div id="progressContainer" class="hidden mb-6">
                        <div class="flex justify-between text-white mb-2">
                            <span>Downloading...</span>
                            <span id="progressPercent">0%</span>
                        </div>
                        <div class="w-full bg-white/20 rounded-full h-3">
                            <div id="progressBar" class="bg-green-500 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                        <p id="progressMessage" class="text-white/60 text-sm mt-2"></p>
                    </div>

                    <!-- Download Result -->
                    <div id="downloadResult" class="hidden"></div>
                </div>

                <!-- Loading -->
                <div id="loading" class="hidden text-center py-8">
                    <div class="loader mx-auto mb-4"></div>
                    <p class="text-white">Fetching video information...</p>
                </div>

                <!-- Error -->
                <div id="error" class="hidden bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    <span id="errorMessage"></span>
                </div>
            </div>

            <!-- Features -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="glass p-4 text-center">
                    <div class="text-blue-400 text-2xl mb-2">
                        <i class="fas fa-film"></i>
                    </div>
                    <h4 class="text-white font-bold">Multiple Formats</h4>
                    <p class="text-white/70 text-sm">MP4, MP3, WebM, 144p to 4K</p>
                </div>
                <div class="glass p-4 text-center">
                    <div class="text-green-400 text-2xl mb-2">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <h4 class="text-white font-bold">Fast Download</h4>
                    <p class="text-white/70 text-sm">High-speed servers</p>
                </div>
                <div class="glass p-4 text-center">
                    <div class="text-purple-400 text-2xl mb-2">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h4 class="text-white font-bold">Safe & Secure</h4>
                    <p class="text-white/70 text-sm">No data collection</p>
                </div>
            </div>

            <!-- Instructions -->
            <div class="glass p-6">
                <h3 class="text-white font-bold text-xl mb-4">
                    <i class="fas fa-info-circle mr-2"></i>How to Use
                </h3>
                <ol class="text-white/80 list-decimal pl-5 space-y-2">
                    <li>Copy YouTube video URL from your browser</li>
                    <li>Paste it in the input field above</li>
                    <li>Click "Fetch Info" to get video details</li>
                    <li>Select your preferred format and quality</li>
                    <li>Click download and wait for processing</li>
                </ol>
                <div class="mt-4 text-white/60 text-sm">
                    <p><i class="fas fa-exclamation-triangle mr-2"></i>Only download content you have permission to use</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center mt-8 text-white/60 text-sm">
                <p>© 2024 MythoBot YouTube Downloader • Powered by yt-dlp</p>
                <p class="mt-1">
                    <a href="/" class="hover:text-white transition-colors">
                        <i class="fas fa-home mr-1"></i>Back to Home
                    </a>
                </p>
            </div>
        </div>

        <script>
            let videoId = '';
            let videoTitle = '';
            let availableFormats = [];

            async function fetchVideoInfo() {
                const urlInput = document.getElementById('url').value.trim();
                if (!urlInput) {
                    showError('Please enter a YouTube URL');
                    return;
                }

                // Reset UI
                document.getElementById('videoInfo').classList.add('hidden');
                document.getElementById('error').classList.add('hidden');
                document.getElementById('loading').classList.remove('hidden');
                document.getElementById('fetchBtn').disabled = true;
                document.getElementById('fetchBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                try {
                    const response = await fetch('/yt/api/info?url=' + encodeURIComponent(urlInput));
                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.error || 'Failed to fetch video info');
                    }

                    videoId = data.videoId;
                    videoTitle = data.title;
                    availableFormats = data.formats || [];

                    // Update UI with video info
                    document.getElementById('videoTitle').textContent = data.title;
                    document.getElementById('duration').textContent = data.duration || 'N/A';
                    document.getElementById('views').textContent = data.views ? formatNumber(data.views) + ' views' : 'N/A';
                    document.getElementById('uploadDate').textContent = data.uploadDate || 'N/A';
                    document.getElementById('channel').textContent = data.channel || 'N/A';
                    
                    if (data.thumbnail) {
                        document.getElementById('thumbnail').src = data.thumbnail;
                    }

                    // Generate format buttons
                    renderFormats(availableFormats);

                    // Show video info section
                    document.getElementById('videoInfo').classList.remove('hidden');

                } catch (error) {
                    showError(error.message);
                } finally {
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('fetchBtn').disabled = false;
                    document.getElementById('fetchBtn').innerHTML = '<i class="fas fa-search"></i> Fetch Info';
                }
            }

            function renderFormats(formats) {
                const container = document.getElementById('formatsContainer');
                container.innerHTML = '';

                // Group formats by type
                const videoFormats = formats.filter(f => f.vcodec !== 'none' && f.acodec !== 'none');
                const audioFormats = formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none');

                // Video formats
                if (videoFormats.length > 0) {
                    const section = document.createElement('div');
                    section.className = 'col-span-full mb-4';
                    section.innerHTML = '<h4 class="text-white font-semibold mb-2">📹 Video Formats</h4>';
                    container.appendChild(section);

                    videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
                    videoFormats.slice(0, 6).forEach(format => {
                        const btn = createFormatButton(format, 'video');
                        container.appendChild(btn);
                    });
                }

                // Audio formats
                if (audioFormats.length > 0) {
                    const section = document.createElement('div');
                    section.className = 'col-span-full mb-4 mt-4';
                    section.innerHTML = '<h4 class="text-white font-semibold mb-2">🎵 Audio Formats</h4>';
                    container.appendChild(section);

                    audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0));
                    audioFormats.slice(0, 4).forEach(format => {
                        const btn = createFormatButton(format, 'audio');
                        container.appendChild(btn);
                    });
                }
            }

            function createFormatButton(format, type) {
                const btn = document.createElement('button');
                btn.className = 'format-btn bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg flex flex-col items-center justify-center';
                
                let label = '';
                let icon = '';
                
                if (type === 'video') {
                    icon = 'fas fa-video';
                    if (format.height) {
                        label = format.height + 'p';
                        if (format.fps > 30) label += ' ' + format.fps + 'fps';
                    } else {
                        label = format.format_note || 'Video';
                    }
                } else {
                    icon = 'fas fa-music';
                    if (format.abr) {
                        label = format.abr + 'kbps';
                    } else {
                        label = 'Audio';
                    }
                }
                
                btn.innerHTML = '<i class="' + icon + ' text-xl mb-1"></i>' +
                               '<span class="font-bold">' + label + '</span>' +
                               '<span class="text-xs opacity-70 mt-1">' + format.ext.toUpperCase() + '</span>';
                
                btn.onclick = function() { 
                    downloadFormat(format.format_id); 
                };
                return btn;
            }

            async function downloadFormat(formatId) {
                if (!videoId) return;
                
                const urlInput = document.getElementById('url').value.trim();
                showProgress('Starting download...', 0);
                
                try {
                    // Start download
                    const response = await fetch('/yt/api/download?url=' + encodeURIComponent(urlInput) + '&format=' + formatId);
                    
                    if (!response.ok) {
                        throw new Error('Download failed');
                    }
                    
                    // Get filename from headers
                    const contentDisposition = response.headers.get('Content-Disposition');
                    let filename = 'download.' + (formatId.includes('audio') ? 'mp3' : 'mp4');
                    if (contentDisposition) {
                        const match = contentDisposition.match(/filename="?(.+?)"?$/);
                        if (match) filename = match[1];
                    }
                    
                    // Create blob and download
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    showProgress('Download complete!', 100);
                    
                    // Hide progress after delay
                    setTimeout(function() {
                        document.getElementById('progressContainer').classList.add('hidden');
                    }, 2000);
                    
                } catch (error) {
                    showError('Download failed: ' + error.message);
                    document.getElementById('progressContainer').classList.add('hidden');
                }
            }

            function showProgress(message, percent) {
                const container = document.getElementById('progressContainer');
                const bar = document.getElementById('progressBar');
                const percentEl = document.getElementById('progressPercent');
                const messageEl = document.getElementById('progressMessage');
                
                container.classList.remove('hidden');
                bar.style.width = percent + '%';
                percentEl.textContent = percent + '%';
                messageEl.textContent = message;
            }

            function showError(message) {
                const errorEl = document.getElementById('error');
                const errorMessage = document.getElementById('errorMessage');
                errorMessage.textContent = message;
                errorEl.classList.remove('hidden');
                
                // Auto-hide error after 5 seconds
                setTimeout(function() {
                    errorEl.classList.add('hidden');
                }, 5000);
            }

            function formatNumber(num) {
                if (num >= 1000000) {
                    return (num / 1000000).toFixed(1) + 'M';
                } else if (num >= 1000) {
                    return (num / 1000).toFixed(1) + 'K';
                }
                return num.toString();
            }

            // Enter key support
            document.getElementById('url').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    fetchVideoInfo();
                }
            });
        </script>
    </body>
    </html>
    `);
});

// 🔹 Get video information
router.get("/api/info", async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.json({ success: false, error: "No URL provided" });
    }
    
    try {
        // Extract video ID for logging
        let videoId = '';
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.searchParams.get('v') || urlObj.pathname.slice(1);
        }
        
        // Use yt-dlp to get video info
        const ytdlp = spawn("yt-dlp", ["-j", "--no-playlist", url]);
        
        let output = "";
        let errorOutput = "";
        
        ytdlp.stdout.on("data", (data) => {
            output += data.toString();
        });
        
        ytdlp.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });
        
        ytdlp.on("close", async (code) => {
            if (code !== 0) {
                console.error("yt-dlp error:", errorOutput);
                return res.json({ 
                    success: false, 
                    error: "Failed to fetch video information. Make sure the URL is valid." 
                });
            }
            
            try {
                const info = JSON.parse(output);
                
                // Format the response
                const response = {
                    success: true,
                    videoId: videoId,
                    title: info.title || "Unknown Title",
                    duration: info.duration_string || null,
                    views: info.view_count || 0,
                    uploadDate: info.upload_date ? 
                        info.upload_date.slice(0,4) + '-' + info.upload_date.slice(4,6) + '-' + info.upload_date.slice(6,8) : 
                        null,
                    channel: info.channel || info.uploader || "Unknown Channel",
                    thumbnail: info.thumbnail || null,
                    formats: []
                };
                
                // Process available formats
                if (info.formats && Array.isArray(info.formats)) {
                    response.formats = info.formats
                        .filter(f => f.ext === 'mp4' || f.ext === 'webm' || f.ext === 'm4a')
                        .map(f => ({
                            format_id: f.format_id,
                            ext: f.ext,
                            format_note: f.format_note,
                            height: f.height,
                            width: f.width,
                            fps: f.fps,
                            vcodec: f.vcodec,
                            acodec: f.acodec,
                            filesize: f.filesize,
                            abr: f.abr,
                            quality: f.quality
                        }))
                        .slice(0, 20); // Limit to 20 formats
                }
                
                // Log the request to database
                if (isDBConnected && downloadsCollection) {
                    await downloadsCollection.insertOne({
                        video_id: videoId,
                        title: info.title || "Unknown",
                        url: url,
                        ip: req.ip,
                        user_agent: req.get("user-agent") || "Unknown",
                        action: "info_fetch",
                        timestamp: new Date()
                    });
                }
                
                res.json(response);
                
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                res.json({ 
                    success: false, 
                    error: "Failed to parse video information" 
                });
            }
        });
        
    } catch (error) {
        console.error("Error in /api/info:", error);
        res.json({ 
            success: false, 
            error: "Invalid URL format" 
        });
    }
});

// 🔹 Download video/audio
router.get("/api/download", async (req, res) => {
    const { url, format, quality = "best" } = req.query;
    
    if (!url) {
        return res.status(400).send("No URL provided");
    }
    
    try {
        // Get video info first for filename
        const infoProcess = spawn("yt-dlp", ["--get-title", "--get-id", url]);
        let videoTitle = "";
        let videoId = "";
        
        infoProcess.stdout.on("data", (data) => {
            const lines = data.toString().split("\n");
            videoTitle = lines[0] || "video";
            videoId = lines[1] || "unknown";
        });
        
        infoProcess.on("close", async () => {
            // Sanitize filename
            const sanitizedTitle = videoTitle
                .replace(/[^\w\s-]/g, "")
                .replace(/\s+/g, "_")
                .substring(0, 50);
            
            let formatOption = format || quality;
            let extension = "mp4";
            
            if (format && format.includes("audio")) {
                extension = "mp3";
                formatOption = "bestaudio[ext=m4a]/bestaudio";
            }
            
            const filename = sanitizedTitle + "_" + videoId + "." + extension;
            
            // Set headers for download
            res.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            
            if (extension === "mp3") {
                res.setHeader("Content-Type", "audio/mpeg");
            } else {
                res.setHeader("Content-Type", "video/mp4");
            }
            
            // Use yt-dlp to stream the video
            const args = [
                "-f", formatOption,
                "-o", "-",
                "--no-playlist",
                url
            ];
            
            const ytdlp = spawn("yt-dlp", args);
            
            // Pipe the output directly to response
            ytdlp.stdout.pipe(res);
            
            ytdlp.stderr.on("data", (data) => {
                console.error("yt-dlp stderr:", data.toString());
            });
            
            ytdlp.on("error", (error) => {
                console.error("yt-dlp error:", error);
                if (!res.headersSent) {
                    res.status(500).send("Download failed");
                }
            });
            
            ytdlp.on("close", async (code) => {
                console.log("yt-dlp exited with code " + code);
                
                // Log successful download
                if (isDBConnected && downloadsCollection) {
                    await downloadsCollection.insertOne({
                        video_id: videoId,
                        title: videoTitle,
                        url: url,
                        format: formatOption,
                        extension: extension,
                        ip: req.ip,
                        user_agent: req.get("user-agent") || "Unknown",
                        action: "download",
                        timestamp: new Date(),
                        status: code === 0 ? "success" : "failed"
                    });
                }
            });
            
            // Handle client disconnect
            req.on("close", () => {
                if (!ytdlp.killed) {
                    ytdlp.kill();
                }
            });
        });
        
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).send("Download failed");
    }
});

// 🔹 Log download activity
router.post("/api/log", express.json(), async (req, res) => {
    if (isDBConnected && downloadsCollection) {
        try {
            await downloadsCollection.insertOne({
                ...req.body,
                ip: req.ip,
                timestamp: new Date()
            });
            res.json({ success: true });
        } catch (error) {
            console.error("Log error:", error);
            res.json({ success: false });
        }
    } else {
        res.json({ success: false, error: "Database not connected" });
    }
});

// 🔹 Get download stats
router.get("/api/stats", async (req, res) => {
    if (!isDBConnected || !downloadsCollection) {
        return res.json({ success: false, error: "Database not connected" });
    }
    
    try {
        const stats = await downloadsCollection.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 }
        ]).toArray();
        
        const total = await downloadsCollection.countDocuments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await downloadsCollection.countDocuments({
            timestamp: { $gte: today }
        });
        
        res.json({
            success: true,
            total_downloads: total,
            today_downloads: todayCount,
            daily_stats: stats
        });
        
    } catch (error) {
        console.error("Stats error:", error);
        res.json({ success: false, error: "Failed to fetch stats" });
    }
});

// Make sure to export router
export default router;
