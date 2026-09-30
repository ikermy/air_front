import http from "http";
import https from "https";

// Отключаем встроенный body-parser Next: он ломает multipart/form-data
// (парсит тело в объект и теряет файлы). Тело нужно пробрасывать как есть.
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path.join("/") : "";
  const backendUrl = process.env.NODE_ENV === "development"
    ? "https://localhost:443"
    : (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8080");
  const target = new URL(`/${path}`, backendUrl);
  target.search = new URL(req.url, "http://localhost").search;
  const transport = target.protocol === "https:" ? https : http;
  const hasBody = !["GET", "HEAD"].includes(req.method);

  try {
    await new Promise((resolve, reject) => {
      const request = transport.request(target, {
        method: req.method,
        ...(target.protocol === "https:" ? { rejectUnauthorized: false } : {}),
        headers: {
          // req.headers содержит корректный content-type (с boundary для
          // multipart) и content-length — ничего перевычислять не нужно.
          ...req.headers,
          host: target.host,
        },
      }, (upstream) => {
        res.statusCode = upstream.statusCode || 502;
        Object.entries(upstream.headers).forEach(([key, value]) => {
          if (value !== undefined && key !== "transfer-encoding") res.setHeader(key, value);
        });
        upstream.pipe(res);
        upstream.on("end", resolve);
      });
      request.on("error", reject);
      if (hasBody) {
        // Стримим сырое тело (multipart, JSON, binary) без изменений.
        req.pipe(request);
      } else {
        request.end();
      }
    });
  } catch (error) {
    console.error("Backend proxy error", error);
    if (!res.headersSent) res.status(502).json({ error: "Backend unavailable" });
  }
}
