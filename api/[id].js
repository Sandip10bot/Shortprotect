import express from "express";
import { fetchFinalUrl } from "../utils/fetchFinalUrl.js";
import { validateRequest } from "../utils/validate.js";
const fetch = require("node-fetch");  // node-fetch@2 syntax


const app = express();

// Root page
app.get("/", (req, res) => {
  res.send(`
    <h1>🔒 SoftURL Protector Active</h1>
    <p>Use a short link like <code>/gsusue</code> to access the final page.</p>
  `);
});

// Dynamic shortcode route
app.get("/:id", async (req, res) => {
  const { id } = req.params;

  const shortUrl = `https://softurl.in/${id}`;

  // Step validation
  const isValid = validateRequest(req);

  if (!isValid) {
    return res.status(403).send(`
      <h2>🚫 Bypass Detected!</h2>
      <p>😂 Shortcut marne aaya? Step by step follow kar!</p>
    `);
  }

  // Fetch final URL from SoftURL
  const originalFinalUrl = await fetchFinalUrl(shortUrl);

  // Replace last part with marker
  const serverToken = `SP-${id}`;
  const finalUrl = originalFinalUrl.replace(/\/[^\/]+$/, `/${serverToken}`);

  // Redirect user
  res.redirect(finalUrl);
});

export default app;
