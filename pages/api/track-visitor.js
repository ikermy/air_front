export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const backend = process.env.BACKEND_INTERNAL_URL || "http://airbff:8080";

  try {
    const response = await fetch(`${backend}/track-visitor`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const body = await response.text();
    res.status(response.status).send(body);
  } catch (error) {
    console.error("track-visitor proxy error", error);
    res.status(502).json({ error: "Backend unavailable" });
  }
}
