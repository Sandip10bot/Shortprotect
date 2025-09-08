import { connectDB } from "./db";

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(403).send("🚫 Bypass Detected");
  }

  try {
    const db = await connectDB();
    const collection = db.collection("links");

    const record = await collection.findOne({ token });

    if (!record) {
      return res.status(403).send("🚫 Bypass Detected");
    }

    // Check expiry
    if (new Date() > record.expireAt) {
      await collection.deleteOne({ token });
      return res.status(403).send("⏳ Token Expired / Bypass Detected");
    }

    res.writeHead(302, { Location: record.url });
    res.end();
  } catch (err) {
    return res.status(500).send("Server Error: " + err.message);
  }
}
