require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const dispatchRepo = require("./repositories/dispatch.repository");

const PORT = process.env.DISPATCH_SERVICE_PORT || 4004;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/dispatch_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[dispatch-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[dispatch-service] đang chạy tại http://localhost:${PORT}`);
      await eventBus.subscribe("TripRequested", (payload) => dispatchRepo.handleTripRequested(payload));
    });
  })
  .catch((err) => {
    console.error("[dispatch-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
