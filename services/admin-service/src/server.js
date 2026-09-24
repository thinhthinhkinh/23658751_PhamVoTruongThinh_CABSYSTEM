require("dotenv").config();
const app = require("./app");

const PORT = process.env.ADMIN_SERVICE_PORT || 4009;

app.listen(PORT, () => {
  console.log(`[admin-service] đang chạy tại http://localhost:${PORT}`);
});
