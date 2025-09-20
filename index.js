// index.js
import express from "express";
import { MongoClient } from "mongodb";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB setup (use your Koyeb secret or .env variable)
const MONGO_URI = process.env.DATABASE_URI;  // set this in Koyeb secrets
if (!MONGO_URI) {
  console.error("❌ Missing MONGODB_URI in environment variables");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);
let doubleCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("mythobot"); // change if you use another DB name
  doubleCollection = db.collection("double_points");
  console.log("✅ MongoDB connected");
}
connectDB();

// 🔹 Generate a token and return protected link
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

// 🔹 Validate and redirect for double points
app.get("/double/:userId/:token", async (req, res) => {
  const { userId, token } = req.params;

  console.log(`--- incoming /double request for user=${userId} token=${token} ---`);
  console.log("referer:", req.get("referer"));
  console.log("user-agent:", req.get("user-agent"));

  // Check referer (must come from softurl.in)
  const referer = req.get("referer") || "";
  if (!referer.includes("softurl.in")) {
    return res.status(403).send("🚫 Bypass detected! Please open via Softurl link.");
  }

  

  // Mark token as used
  await doubleCollection.updateOne(
    { user_id: userId, token },
    { $set: { used: true, used_at: new Date() } }
  );

  // Redirect to bot deep link
  const botUsername = "MythoSerialBot"; // change to your bot username
  const deepLink = `https://t.me/${botUsername}?start=double_${userId}_${token}`;

  res.redirect(deepLink);
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ Server is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
