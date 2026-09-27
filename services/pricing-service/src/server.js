require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const app = require("./app");
const { PricingRule } = require("./models/pricingRule.model");

const PORT = process.env.PRICING_SERVICE_PORT || 4006;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pricing_db";

async function seedIfEmpty() {
  const count = await PricingRule.countDocuments();
  if (count > 0) return;
  const seedPath = path.join(__dirname, "../data/pricingRules.json");
  const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const docs = seedData.map((r) => ({
    _id: r.vehicleType,
    baseFare: r.baseFare,
    perKmRate: r.perKmRate,
    perMinuteRate: r.perMinuteRate,
  }));
  await PricingRule.insertMany(docs);
  console.log(`[pricing-service] đã seed ${docs.length} quy tắc giá mặc định`);
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("[pricing-service] đã kết nối MongoDB");
    await seedIfEmpty();
    app.listen(PORT, () => {
      console.log(`[pricing-service] đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[pricing-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });