import fetch from "node-fetch";

export async function fetchFinalUrl(shortUrl) {
  try {
    // Fetch without following redirects
    const response = await fetch(shortUrl, { redirect: "manual" });

    // The location header contains the final URL
    const finalUrl = response.headers.get("location") || shortUrl;
    return finalUrl;
  } catch (err) {
    console.error("Error fetching final URL:", err);
    return shortUrl; // fallback
  }
}
