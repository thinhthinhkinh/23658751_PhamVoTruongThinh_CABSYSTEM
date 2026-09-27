require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.ADMIN_SERVICE_PORT || 4009;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/admin_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[admin-service] đã kết nối MongoDB");
    app.listen(PORT, () => {
      console.log(`[admin-service] đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[admin-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });