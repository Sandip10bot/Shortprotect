import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ---------------- MongoDB Setup ----------------
if (!process.env.DATABASE_URI) {
    console.error("❌ DATABASE_URI is missing in environment variables!");
    process.exit(1);
}

const client = new MongoClient(process.env.DATABASE_URI);
let db, doubleCollection;

async function connectDB() {
    await client.connect();
    db = client.db(process.env.DATABASE_NAME);
    doubleCollection = db.collection("double_points");
    console.log("✅ MongoDB connected");
}
connectDB().catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
});

// ---------------- Double Points Endpoint ----------------
// URL format: /double/<userId>/<token>?t=<tokenOptional>
app.get("/double/:userId/:token", async (req, res) => {
    const { userId, token } = req.params;

    if (!token) return res.status(403).send("❌ Bypass Detected!");

    try {
        const record = await doubleCollection.findOne({ token });

        if (!record || record.used || record.userId.toString() !== userId) {
            return res.status(403).send("❌ Bypass Detected");
        }

        // Optional: check referer to allow only Softurl clicks
        const referer = req.get("referer") || "";
        if (!referer.includes("softurl.in")) {
            return res.status(403).send("❌ Bypass Detected! Must click via Softurl.");
        }

        // Mark token as used
        await doubleCollection.updateOne({ token }, { $set: { used: true } });

        // Redirect to Telegram bot
        const finalTelegramLink = `https://t.me/${process.env.BOT_USERNAME}?start=double_${userId}_${token}`;
        return res.redirect(finalTelegramLink);
    } catch (err) {
        console.error("Error in /double route:", err);
        return res.status(500).send("❌ Server error");
    }
});

// ---------------- Health Check ----------------
app.get("/", (req, res) => res.send("✅ Server is running"));

app.listen(port, () => console.log(`Server running on port ${port}`));
