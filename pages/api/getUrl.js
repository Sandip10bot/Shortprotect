import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  const client = await clientPromise;
  const db = client.db("shortener");
  const link = await db.collection("links").findOne({ slug });

  if (link) {
    res.status(200).json({ url: link.url });
  } else {
    res.status(404).json({ error: "Not found" });
  }
}
