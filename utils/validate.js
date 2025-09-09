export function validateRequest(req) {
  const referer = req.headers.referer || "";
  const userAgent = req.headers["user-agent"] || "";

  // Valid if user came via protector page
  if (referer.includes("shortprotect-ksgf.vercel.app")) {
    return true;
  }

  // Direct bypass attempt
  return false;
}
