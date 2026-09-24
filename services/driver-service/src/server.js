require("dotenv").config();
const app = require("./app");

const PORT = process.env.DRIVER_SERVICE_PORT || 4002;

app.listen(PORT, () => {
  console.log(`[driver-service] đang chạy tại http://localhost:${PORT}`);
});
