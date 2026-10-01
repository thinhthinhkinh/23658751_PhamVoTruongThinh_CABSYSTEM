require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const paymentRepo = require("./repositories/payment.repository");

const PORT = process.env.PAYMENT_SERVICE_PORT || 4007;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/payment_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[payment-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[payment-service] đang chạy tại http://localhost:${PORT}`);
      await eventBus.subscribe("FareCalculated", (payload) =>
        paymentRepo.cacheFare(payload.tripId, payload.amount)
      );
    });
  })
  .catch((err) => {
    console.error("[payment-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
