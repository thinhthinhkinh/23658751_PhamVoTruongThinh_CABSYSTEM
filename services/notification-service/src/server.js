require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const notifRepo = require("./repositories/notification.repository");
const { Channel } = require("./models/notification.model");

const PORT      = process.env.NOTIFICATION_SERVICE_PORT || 4008;
const GRPC_PORT = process.env.NOTIFICATION_GRPC_PORT    || 5008;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/notification_db";

async function seedIfEmpty() {
  const count = await Channel.countDocuments();
  if (count > 0) return;
  await Channel.insertMany([
    { name: "Push notification (app)", type: "push" },
    { name: "SMS", type: "sms" },
  ]);
  console.log("[notification-service] đã seed 2 kênh thông báo mặc định");
}

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/notification.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/notification.handler");
  const server = new grpc.Server();
  server.addService(pkg.cab.notification.NotificationService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[notification-service] gRPC bind error:", err.message); return; }
    console.log(`[notification-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("[notification-service] đã kết nối MongoDB");
    await seedIfEmpty();
    app.listen(PORT, async () => {
      console.log(`[notification-service] REST đang chạy tại http://localhost:${PORT}`);
      await Promise.all([
        eventBus.subscribe("DriverAssigned", (p) => notifRepo.onDriverAssigned(p)),
        eventBus.subscribe("NoDriverFound", (p) => notifRepo.onNoDriverFound(p)),
        eventBus.subscribe("TripStatusChanged", (p) => notifRepo.onBookingStatusChanged(p)),
        eventBus.subscribe("TripCompleted", (p) => notifRepo.onBookingCompleted(p)),
        eventBus.subscribe("PaymentCompleted", (p) => notifRepo.onPaymentCompleted(p)),
        eventBus.subscribe("PaymentFailed", (p) => notifRepo.onPaymentFailed(p)),
      ]);
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[notification-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
