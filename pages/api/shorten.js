import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { url, ttl = 0, uses = 0 } = req.body; // ttl: seconds, uses: number of times link can be used
    if (!url) return res.status(400).json({ error: "Missing url" });

    const slug = Math.random().toString(36).substring(2, 8);

    const client = await clientPromise;
    const db = client.db("shortener");
    const doc = { slug, url, created: Date.now(), expiry: ttl ? Date.now() + ttl*1000 : null, uses_left: uses };
    await db.collection("links").insertOne(doc);

    res.status(200).json({ shortUrl: `${process.env.BASE_URL}/${slug}`, slug });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
