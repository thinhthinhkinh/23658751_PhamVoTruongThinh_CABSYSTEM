require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.LOCATION_SERVICE_PORT || 4005;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/location_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[location-service] đã kết nối MongoDB");
    app.listen(PORT, () => {
      console.log(`[location-service] đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[location-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });