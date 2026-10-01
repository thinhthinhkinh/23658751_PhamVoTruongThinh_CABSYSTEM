require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const paymentRepo = require("./repositories/payment.repository");

const PORT      = process.env.PAYMENT_SERVICE_PORT || 4007;
const GRPC_PORT = process.env.PAYMENT_GRPC_PORT    || 5007;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/payment_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/payment.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/payment.handler");
  const server = new grpc.Server();
  server.addService(pkg["cab.payment"].PaymentService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[payment-service] gRPC bind error:", err.message); return; }
    console.log(`[payment-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[payment-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[payment-service] REST đang chạy tại http://localhost:${PORT}`);
      await eventBus.subscribe("FareCalculated", (payload) =>
        paymentRepo.cacheFare(payload.tripId, payload.amount)
      );
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[payment-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
