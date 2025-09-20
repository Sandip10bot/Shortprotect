import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  const client = await clientPromise;
  const db = client.db("shortener");
  const link = await db.collection("links").findOne({ slug });

  if (!link) return res.status(404).json({ error: "Not found" });
  if (link.uses_left !== undefined && link.uses_left <= 0) return res.status(403).json({ error: "Link used" });

  if (link.uses_left !== undefined) {
    await db.collection("links").updateOne({ slug }, { $inc: { uses_left: -1 } });
  }

  res.status(200).json({ url: link.url });
}
