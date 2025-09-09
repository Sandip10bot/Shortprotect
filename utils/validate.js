export function validateRequest(req) {
  const referer = req.headers.referer || "";
  const userAgent = req.headers["user-agent"] || "";

  // Only allow requests coming from your shortener or legit browsers
  if (referer.includes("softurl.in") && userAgent !== "") {
    return true;
  }

  return false;
}
