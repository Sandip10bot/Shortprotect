import { connectDB } from "./db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  try {
    const body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => { data += chunk });
      req.on("end", () => resolve(JSON.parse(data)));
      req.on("error", reject);
    });

    const { token, url } = body;

    if (!token || !url) {
      return res.status(400).send("❌ Missing token or url");
    }

    const db = await connectDB();
    const collection = db.collection("links");

    // Save with expiry time (10 min)
    await collection.insertOne({
      token,
      url,
      expireAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    return res.status(200).json({ success: true, token });
  } catch (err) {
    return res.status(500).send("Server Error: " + err.message);
  }
}
