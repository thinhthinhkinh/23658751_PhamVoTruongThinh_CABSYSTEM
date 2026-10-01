require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const { PricingRule } = require("./models/pricingRule.model");

const PORT      = process.env.PRICING_SERVICE_PORT || 4006;
const GRPC_PORT = process.env.PRICING_GRPC_PORT    || 5006;
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

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/pricing.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/pricing.handler");
  const server = new grpc.Server();
  server.addService(pkg["cab.pricing"].PricingService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[pricing-service] gRPC bind error:", err.message); return; }
    console.log(`[pricing-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("[pricing-service] đã kết nối MongoDB");
    await seedIfEmpty();
    app.listen(PORT, () => {
      console.log(`[pricing-service] REST đang chạy tại http://localhost:${PORT}`);
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[pricing-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
