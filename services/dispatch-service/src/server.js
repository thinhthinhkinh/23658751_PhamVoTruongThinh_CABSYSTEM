require("dotenv").config();
const app = require("./app");
const eventBus = require("./utils/eventBusClient");

const PORT = process.env.DISPATCH_SERVICE_PORT || 4004;
const SELF_URL = process.env.DISPATCH_SERVICE_URL || `http://localhost:${PORT}`;

app.listen(PORT, async () => {
  console.log(`[dispatch-service] đang chạy tại http://localhost:${PORT}`);
  await eventBus.subscribe("TripRequested", `${SELF_URL}/dispatch/events/trip-requested`);
});
