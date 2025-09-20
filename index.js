import express from "express";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ALLOWED_REFERRER = process.env.ALLOWED_REFERRER || "softurl.in";

// Temporary token store
const tokens = new Map();

// Fetch Softurl final URL dynamically
async function getFinalUrl(slug) {
    try {
        const res = await fetch(`https://softurl.in/${slug}`, { redirect: "manual" });
        const finalUrl = res.headers.get("location"); // Softurl Location header
        return finalUrl;
    } catch (e) {
        console.log("Error fetching final URL:", e);
        return null;
    }
}

// Step 1: Generate protected token link
app.get("/token/:slug", (req, res) => {
    const { slug } = req.params;
    const token = uuidv4();
    tokens.set(token, { slug, expire: Date.now() + 2 * 60 * 1000 }); // 2 minutes
    res.send(`${BASE_URL}/redirect/${slug}?t=${token}`);
});

// Step 2: Redirect with token & referrer check
app.get("/redirect/:slug", async (req, res) => {
    const { slug } = req.params;
    const token = req.query.t;
    const ref = req.get("Referer") || "";

    // Referrer must include Softurl.in
    if (!ref.includes(ALLOWED_REFERRER)) return res.send("🚫 Bypass Detected: Opened directly");

    // Token validation
    if (!token || !tokens.has(token)) return res.send("🚫 Bypass Detected: Invalid or missing token");
    const tokenData = tokens.get(token);
    if (Date.now() > tokenData.expire) {
        tokens.delete(token);
        return res.send("🚫 Token Expired");
    }

    tokens.delete(token);

    const finalUrl = await getFinalUrl(slug);
    if (!finalUrl) return res.send("❌ Cannot fetch target URL");

    res.redirect(finalUrl);
});

app.listen(PORT, () => console.log(`Protect server running on port ${PORT}`));
