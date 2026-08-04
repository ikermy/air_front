import https from "https";

export default async function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path.join("/") : "";
  const backendUrl = process.env.BACKEND_INTERNAL_URL || "https://127.0.0.1";
  const target = new URL(`/${path}`, backendUrl);
  target.search = new URL(req.url, "http://localhost").search;
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body);

  try {
    const response = await new Promise((resolve, reject) => {
      const request = https.request(target, {
        method: req.method,
        rejectUnauthorized: false,
        headers: {
          ...req.headers,
          host: target.host,
          ...(body ? { "content-length": Buffer.byteLength(body) } : {}),
        },
      }, (upstream) => {
        let data = "";
        upstream.setEncoding("utf8");
        upstream.on("data", (chunk) => { data += chunk; });
        upstream.on("end", () => resolve({ status: upstream.statusCode || 502, headers: upstream.headers, data }));
      });
      request.on("error", reject);
      if (body) request.write(body);
      request.end();
    });

    Object.entries(response.headers).forEach(([key, value]) => {
      if (value !== undefined && key !== "transfer-encoding") res.setHeader(key, value);
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error("Development backend proxy error", error);
    res.status(502).json({ error: "Backend unavailable" });
  }
}
