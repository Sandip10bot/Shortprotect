import express from "express";
import { validateRequest } from "../utils/validate.js";

const app = express();

// Root route
app.get("/", (req, res) => {
  res.send(`
    <h1>🔒 SoftURL Protector Active</h1>
    <p>Use a valid short link like <code>/abc123</code> to test.</p>
  `);
});

// Dynamic short link route
app.get("/:id", (req, res) => {
  const { id } = req.params;

  if (!validateRequest(req)) {
    return res.status(403).send(`
      <h2>🚫 Bypass Detected!</h2>
      <p>😂 Bhai shortcut marne aaya tha kya? Chal step by step follow kar!</p>
    `);
  }

  // Replace with your actual final URL logic
  const realUrl = "https://google.com";

  res.redirect(realUrl);
});

export default app;
