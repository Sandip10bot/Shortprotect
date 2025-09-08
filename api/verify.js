export default function handler(req, res) {
  const referer = req.headers.referer || "";
  const { real } = req.query;  // Bot se aaya actual link

  if (!real) {
    return res.status(400).send("❌ No real link provided");
  }

  // Sirf Softurl ke step-by-step visit allow karo
  if (referer.includes("softurl.in")) {
    res.writeHead(302, { Location: real });
    res.end();
  } else {
    res.status(403).send("❌ Bypass detected");
  }
}
