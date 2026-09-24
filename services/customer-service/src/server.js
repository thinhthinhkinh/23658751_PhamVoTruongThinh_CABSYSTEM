require("dotenv").config();
const app = require("./app");

const PORT = process.env.CUSTOMER_SERVICE_PORT || 4001;

app.listen(PORT, () => {
  console.log(`[customer-service] đang chạy tại http://localhost:${PORT}`);
});
