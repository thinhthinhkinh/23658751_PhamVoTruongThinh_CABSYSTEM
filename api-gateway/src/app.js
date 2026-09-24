const express = require("express");
const cors = require("cors");
const { registerRoutes } = require("./routes/gateway.routes");

const app = express();

app.use(cors());
// Lưu ý: KHÔNG dùng express.json() ở Gateway — để nguyên request stream forward
// thẳng cho service phía sau tự parse, tránh lỗi mất body khi proxy.

app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));

registerRoutes(app);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route không tồn tại qua API Gateway" } });
});

module.exports = app;
