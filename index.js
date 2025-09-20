import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB setup
if (!process.env.DATABASE_URI) {
  console.error("DATABASE_URI missing");
  process.exit(1);
}
const client = new MongoClient(process.env.DATABASE_URI);
let db, doubleCollection;
async function connectDB() {
  await client.connect();
  db = client.db(process.env.DATABASE_NAME || "test");
  doubleCollection = db.collection("double_points");
  console.log("MongoDB connected");
}
connectDB().catch(err => {
  console.error("MongoDB connect error:", err);
  process.exit(1);
});

// Helper: is request likely coming from Softurl redirect / real browser navigation
function isValidReferrerOrBrowser(req) {
  const referer = (req.get("referer") || "").toLowerCase();
  const ua = (req.get("user-agent") || "").toLowerCase();
  const secFetchSite = (req.get("sec-fetch-site") || "").toLowerCase();
  const secFetchMode = (req.get("sec-fetch-mode") || "").toLowerCase();
  const accept = (req.get("accept") || "").toLowerCase();

  // 1) Direct referer check
  if (referer.includes("softurl.in")) return { ok: true, reason: "referer-softurl" };

  // 2) Some shorteners / browsers remove Referer; check for navigation headers that real browsers send
  //    - sec-fetch-site: cross-site (or same-origin)
  //    - sec-fetch-mode: navigate
  //    - accept contains 'text/html'
  if ((secFetchMode === "navigate") &&
      (secFetchSite === "cross-site" || secFetchSite === "same-origin") &&
      accept.includes("text/html") &&
      ua.includes("mozilla")) {
    return { ok: true, reason: "browser-nav-headers" };
  }

  // 3) As an explicit fallback, allow if you appended a safety query param (useful for tests)
  //    e.g. https://yourapp.koyeb.app/double/USER/TOKEN?safety=1
  if (req.query && req.query.safety === "1") return { ok: true, reason: "safety-param" };

  // 4) Otherwise reject
  return { ok: false, reason: "no-matching-headers" };
}

// route: /double/:userId/:token
app.get("/double/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;

  // Log headers for debugging (only log minimal info)
  console.log(`--- incoming /double request for user=${userId} token=${token} at ${new Date().toISOString()} ---`);
  console.log("referer:", req.get("referer"));
  console.log("user-agent:", req.get("user-agent"));
  console.log("sec-fetch-site:", req.get("sec-fetch-site"));
  console.log("sec-fetch-mode:", req.get("sec-fetch-mode"));
  console.log("accept:", req.get("accept"));
  console.log("x-forwarded-for:", req.get("x-forwarded-for"));
  console.log("query:", req.query);

  if (!token) return res.status(403).send("❌ Bypass Detected!");

  try {
    const record = await doubleCollection.findOne({ token });

    if (!record) {
      console.warn("Token not found in DB:", token);
      return res.status(403).send("❌ Bypass Detected");
    }

    if (record.used) {
      return res.status(403).send("❌ Token already used");
    }

    // Check userId matches record (string compare to be safe)
    if (record.user_id && record.user_id.toString() !== userId.toString()) {
      return res.status(403).send("❌ Token does not belong to this user");
    }

    // Header-based validation
    const check = isValidReferrerOrBrowser(req);
    console.log("validation check:", check);

    if (!check.ok) {
      // If you want to see the headers while developing, keep these logs, otherwise comment them out.
      return res.status(403).send(`🚫 Bypass Detected! Reason: ${check.reason}`);
    }

    // Token ok and request looks legit — mark used and redirect
    await doubleCollection.updateOne({ token }, { $set: { used: true, used_at: new Date() } });

    // Build bot start link (the bot will parse start param)
    const botUsername = process.env.BOT_USERNAME || "MythoserialBot";
    const finalLink = `https://t.me/${botUsername}?start=double_${userId}_${token}`;

    console.log(`Redirecting to bot start for user=${userId}`);
    return res.redirect(finalLink);
  } catch (err) {
    console.error("Error handling /double:", err);
    return res.status(500).send("❌ Server error");
  }
});

app.get("/", (req, res) => res.send("✅ Server running"));

app.listen(port, () => console.log(`Server running on port ${port}`));
