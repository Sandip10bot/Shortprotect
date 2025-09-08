import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import { SOFTURL_API_KEY, DOMAIN, TOKEN_EXPIRY } from "./config";

// In-memory token store (replace with DB in production)
export const tokenStore = {};

// Generate a unique token
export function generateToken(finalUrl) {
  const token = uuidv4();
  tokenStore[token] = { url: finalUrl, used: false, createdAt: Date.now() };
  return token;
}

// Validate token + referer + expiry
export function validateToken(token, referer) {
  const record = tokenStore[token];
  if (!record) return { valid: false, message: "Invalid link" };
  if (record.used) return { valid: false, message: "Token already used" };
  if (!referer || !referer.includes(DOMAIN)) return { valid: false, message: "Bypass detected 🚫" };

  // Optional: expire token after TOKEN_EXPIRY ms
  if (Date.now() - record.createdAt > TOKEN_EXPIRY) return { valid: false, message: "Token expired ⏰" };

  record.used = true; 
  return { valid: true, url: record.url };
}

// Auto shorten via Softurl.in
export async function shortenLink(longUrl) {
  const response = await fetch("https://softurl.in/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SOFTURL_API_KEY}`
    },
    body: JSON.stringify({ url: longUrl })
  });
  const data = await response.json();
  return data.shortenedUrl; // Softurl.in returns the shortened URL
}
