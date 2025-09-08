import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;   // Vercel Environment Variables me set karo
let client;
let db;

export async function connectDB() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  db = client.db("shortprotect");  // apna DB naam
  return db;
}
