import express from "express";
import { validateRequest } from "../utils/validate.js";

const app = express();

// Sample route to protect links
app.get("/:id", (req, res) => {
  const { id } = req.params;

  // Step validation
  if (!validateRequest(req)) {
    return res.status(403).send(`
      <h2>🚫 Bypass Detected!</h2>
      <p>😂 Bhai shortcut marne aaya tha kya? Chal step by step follow kar!</p>
    `);
  }

  // Normally you would fetch the actual URL from your DB
  // For demo, let's pretend each ID maps to google.com
  const realUrl = "https://google.com";

  res.redirect(realUrl);
});

export default app;
