import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const slug = Math.random().toString(36).substring(2, 8);

  const client = await clientPromise;
  const db = client.db("shortener");

  await db.collection("links").insertOne({
    slug,
    url,
    created: Date.now(),
  });

  res.status(200).json({ shortUrl: `${process.env.BASE_URL}/${slug}`, slug });
}
