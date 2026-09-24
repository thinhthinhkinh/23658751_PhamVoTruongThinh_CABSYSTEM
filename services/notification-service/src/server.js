require("dotenv").config();
const app = require("./app");
const eventBus = require("./utils/eventBusClient");

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 4008;
const SELF_URL = process.env.NOTIFICATION_SERVICE_URL || `http://localhost:${PORT}`;

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
