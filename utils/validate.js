export function validateRequest(req) {
  // Example validation logic:
  // You can add more (cookies, tokens, timestamp check, etc.)

  const referer = req.headers.referer || "";
  const userAgent = req.headers["user-agent"] || "";

  // Allow only if came from your SoftURL domain
  if (referer.includes("softurl.in") && userAgent !== "") {
    return true;
  }

  return false;
}
