export default function handler(req, res) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || req.socket.remoteAddress || "").split(",")[0].trim();
  res.status(200).json({ ip });
}
