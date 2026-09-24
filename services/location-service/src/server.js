require("dotenv").config();
const app = require("./app");

const PORT = process.env.LOCATION_SERVICE_PORT || 4005;

app.listen(PORT, () => {
  console.log(`[location-service] đang chạy tại http://localhost:${PORT}`);
});
