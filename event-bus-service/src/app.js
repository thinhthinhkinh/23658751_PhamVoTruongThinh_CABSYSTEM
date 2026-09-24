const express = require("express");
const cors = require("cors");
const eventbusRoutes = require("./routes/eventbus.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "event-bus-service" }));
app.use("/", eventbusRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route không tồn tại" } });
});

module.exports = app;
