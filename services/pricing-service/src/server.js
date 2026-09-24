require("dotenv").config();
const app = require("./app");

const PORT = process.env.PRICING_SERVICE_PORT || 4006;

app.listen(PORT, () => {
  console.log(`[pricing-service] đang chạy tại http://localhost:${PORT}`);
});
