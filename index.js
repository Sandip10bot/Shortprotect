import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ---------------- MongoDB Setup ----------------
const client = new MongoClient(process.env.DATABASE_URI);
let db, doubleCollection;

async function connectDB() {
    await client.connect();
    db = client.db(process.env.DATABASE_NAME);
    doubleCollection = db.collection("double_points");
}
connectDB().catch(console.error);

// ---------------- Redirect Endpoint ----------------
// Example URL: https://yourapp.koyeb.app/redirect/717YU?t=<token>
app.get("/redirect/:shortid", async (req, res) => {
    const shortid = req.params.shortid;
    const token = req.query.t;

    if (!token) {
        return res.status(403).send("❌ Bypass detected! No token provided.");
    }

    // Fetch record from MongoDB
    const record = await doubleCollection.findOne({ token });

    if (!record || record.used) {
        return res.status(403).send("❌ Bypass detected or invalid/used token!");
    }

    // Optional: Referrer check
    const referer = req.get("referer") || "";
    if (!referer.includes("softurl.in")) {
        return res.status(403).send("❌ Bypass detected! Must click via Softurl.");
    }

    // Mark token as used
    await doubleCollection.updateOne(
        { token },
        { $set: { used: true } }
    );

    // Redirect to Telegram start link
    const finalTelegramLink = `https://t.me/${process.env.BOT_USERNAME}?start=double_${record.user_id}_${token}`;
    res.redirect(finalTelegramLink);
});

// ---------------- Health Check ----------------
app.get("/", (req, res) => res.send("✅ Server is running"));

app.listen(port, () => console.log(`Server running on port ${port}`));
