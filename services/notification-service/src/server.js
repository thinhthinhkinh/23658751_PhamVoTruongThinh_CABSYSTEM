require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const { Channel } = require("./models/notification.model");

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 4008;
const SELF_URL = process.env.NOTIFICATION_SERVICE_URL || `http://localhost:${PORT}`;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/notification_db";

async function seedIfEmpty() {
  const count = await Channel.countDocuments();
  if (count > 0) return;
  await Channel.insertMany([
    { name: "Push notification (app)", type: "push" },
    { name: "SMS", type: "sms" },
  ]);
  console.log("[notification-service] đã seed 2 kênh thông báo mặc định");
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("[notification-service] đã kết nối MongoDB");
    await seedIfEmpty();
    app.listen(PORT, async () => {
      console.log(`[notification-service] đang chạy tại http://localhost:${PORT}`);
      await Promise.all([
        eventBus.subscribe("DriverAssigned", `${SELF_URL}/notifications/events/driver-assigned`),
        eventBus.subscribe("NoDriverFound", `${SELF_URL}/notifications/events/no-driver-found`),
        eventBus.subscribe("TripStatusChanged", `${SELF_URL}/notifications/events/trip-status-changed`),
        eventBus.subscribe("TripCompleted", `${SELF_URL}/notifications/events/trip-completed`),
        eventBus.subscribe("PaymentCompleted", `${SELF_URL}/notifications/events/payment-completed`),
        eventBus.subscribe("PaymentFailed", `${SELF_URL}/notifications/events/payment-failed`),
      ]);
    });
  })
  .catch((err) => {
    console.error("[notification-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });