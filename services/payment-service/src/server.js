require("dotenv").config();
const app = require("./app");
const eventBus = require("./utils/eventBusClient");

const PORT = process.env.PAYMENT_SERVICE_PORT || 4007;
const SELF_URL = process.env.PAYMENT_SERVICE_URL || `http://localhost:${PORT}`;

app.listen(PORT, async () => {
  console.log(`[payment-service] đang chạy tại http://localhost:${PORT}`);
  await eventBus.subscribe("FareCalculated", `${SELF_URL}/payments/events/fare-calculated`);
});
