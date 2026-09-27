require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");

const PORT = process.env.TRIP_SERVICE_PORT || 4003;
const SELF_URL = process.env.TRIP_SERVICE_URL || `http://localhost:${PORT}`;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/trip_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[trip-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[trip-service] đang chạy tại http://localhost:${PORT}`);
      await Promise.all([
        eventBus.subscribe("DriverAssigned", `${SELF_URL}/trips/events/driver-assigned`),
        eventBus.subscribe("NoDriverFound", `${SELF_URL}/trips/events/no-driver-found`),
      ]);
    });
  })
  .catch((err) => {
    console.error("[trip-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });