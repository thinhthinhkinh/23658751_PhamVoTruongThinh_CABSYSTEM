require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");

const PORT = process.env.DISPATCH_SERVICE_PORT || 4004;
const SELF_URL = process.env.DISPATCH_SERVICE_URL || `http://localhost:${PORT}`;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/dispatch_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[dispatch-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[dispatch-service] đang chạy tại http://localhost:${PORT}`);
      await eventBus.subscribe("TripRequested", `${SELF_URL}/dispatch/events/trip-requested`);
    });
  })
  .catch((err) => {
    console.error("[dispatch-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });