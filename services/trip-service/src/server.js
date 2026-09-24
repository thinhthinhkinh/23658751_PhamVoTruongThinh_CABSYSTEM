require("dotenv").config();
const app = require("./app");
const eventBus = require("./utils/eventBusClient");

const PORT = process.env.TRIP_SERVICE_PORT || 4003;
const SELF_URL = process.env.TRIP_SERVICE_URL || `http://localhost:${PORT}`;

app.listen(PORT, async () => {
  console.log(`[trip-service] đang chạy tại http://localhost:${PORT}`);
  await Promise.all([
    eventBus.subscribe("DriverAssigned", `${SELF_URL}/trips/events/driver-assigned`),
    eventBus.subscribe("NoDriverFound", `${SELF_URL}/trips/events/no-driver-found`),
  ]);
});
