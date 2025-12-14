// utils/database.js
import { MongoClient } from "mongodb";

const MONGO_URI = process.env.DATABASE_URI;
let client;
let doubleCollection;
let urlShortenerCollection;
let downloadsCollection;

export async function connectDB() {
  if (!MONGO_URI) {
    console.error("❌ Missing DATABASE_URI in environment variables");
    process.exit(1);
  }

  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db("mythobot");
    doubleCollection = db.collection("double_points");
    urlShortenerCollection = db.collection("url_shortener");
    downloadsCollection = db.collection("youtube_downloads");
    
    console.log("✅ MongoDB connected");
    
    return { doubleCollection, urlShortenerCollection, downloadsCollection };
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

export function getCollections() {
  return { doubleCollection, urlShortenerCollection, downloadsCollection };
}

export async function closeDB() {
  if (client) {
    await client.close();
    console.log("✅ MongoDB connection closed");
  }
}
