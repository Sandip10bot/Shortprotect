import { generateToken, shortenLink } from "./utils";

async function createNonBypassableShortLink(finalUrl) {
  const token = generateToken(finalUrl);

  // Vercel redirect link
  const redirectLink = `https://mythobot.vercel.app/api/redirect?token=${token}`;

  // Auto-shortened final link via Softurl.in
  const shortLink = await shortenLink(redirectLink);

  return shortLink;
}

// Example usage
(async () => {
  const finalUrl = "https://example.com/final-destination";
  const nonBypassableShortLink = await createNonBypassableShortLink(finalUrl);
  console.log("Send this to the user:", nonBypassableShortLink);
})();
