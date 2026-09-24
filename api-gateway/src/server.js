require("dotenv").config();
const app = require("./app");

const PORT = process.env.API_GATEWAY_PORT || 3000;

app.listen(PORT, () => {
  console.log(`[api-gateway] đang chạy tại http://localhost:${PORT}`);
});
