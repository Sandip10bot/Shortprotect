export default function handler(req, res) {
  const referer = req.headers.referer || "";
  const { real } = req.query;  // bot se aaya actual link

  if (!real) {
    return res.status(400).send("❌ No real link provided");
  }

  // Agar Softurl ke step se aaya hai tabhi allow karo
  if (referer.includes("softurl.in")) {
    res.writeHead(302, { Location: real });
    res.end();
  } else {
    res.status(403).send("❌ Bypass detected");
  }
}
