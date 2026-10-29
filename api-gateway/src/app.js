const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redis = require("./config/redis");
const { registerRoutes, targets } = require("./routes/gateway.routes");

const app = express();

app.use(cors());
// Lưu ý: KHÔNG dùng express.json() ở Gateway — để nguyên request stream forward
// thẳng cho service phía sau tự parse, tránh lỗi mất body khi proxy.

// ── Health / Readiness endpoints của chính Gateway ───────────────────────────

app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));

app.get("/ready", (req, res) => res.json({ status: "ready", service: "api-gateway" }));

// Gọi /health của từng downstream service, trả kết quả tổng hợp
app.get("/health/services", async (req, res) => {
  const checks = Object.entries(targets).map(async ([name, url]) => {
    try {
      const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
      const body = await r.json().catch(() => ({}));
      return { name, url, status: r.ok ? "healthy" : "unhealthy", detail: body };
    } catch {
      return { name, url, status: "unreachable" };
    }
  });
  const settled = await Promise.allSettled(checks);
  const services = settled.map((r) => (r.status === "fulfilled" ? r.value : { status: "error" }));
  const allHealthy = services.every((s) => s.status === "healthy");
  return res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? "ok" : "degraded",
    services,
  });
});

// ── Rate limiting — STT 29: chống spam POST /bookings ───────────────────────────
// Key = JWT user ID để mỗi customer có quota riêng (30 req/giây).
// Store = Redis: quota chia sẻ chính xác kể cả khi scale nhiều gateway instance.
// TC-GATE-03: 1 token, 100 req → 70 nhận 429. Tokens khác → quota độc lập.
function extractUserId(req) {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      const payload = JSON.parse(Buffer.from(auth.slice(7).split(".")[1], "base64url").toString());
      if (payload.id) return payload.id;
    }
  } catch {}
  return req.ip;
}

const tripLimiter = rateLimit({
  windowMs: 1 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Quá nhiều yêu cầu, vui lòng thử lại sau" } },
  keyGenerator: extractUserId,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: "cab:ratelimit:",
  }),
});
app.use("/api/v1/bookings", tripLimiter);

registerRoutes(app);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route không tồn tại qua API Gateway" } });
});

module.exports = app;
