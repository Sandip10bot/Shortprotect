import { validateToken } from "../utils";

export default function handler(req, res) {
  const { token } = req.query;
  const referer = req.headers.referer || "";

  const validation = validateToken(token, referer);

  if (!validation.valid) {
    return res.status(403).send(validation.message);
  }

  return res.redirect(validation.url);
}
