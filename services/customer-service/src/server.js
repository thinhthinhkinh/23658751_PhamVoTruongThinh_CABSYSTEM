require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.CUSTOMER_SERVICE_PORT || 4001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/customer_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[customer-service] đã kết nối MongoDB");
    app.listen(PORT, () => {
      console.log(`[customer-service] đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[customer-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });