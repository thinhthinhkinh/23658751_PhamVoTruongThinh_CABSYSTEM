require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.DRIVER_SERVICE_PORT || 4002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/driver_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[driver-service] đã kết nối MongoDB");
    app.listen(PORT, () => {
      console.log(`[driver-service] đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[driver-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });