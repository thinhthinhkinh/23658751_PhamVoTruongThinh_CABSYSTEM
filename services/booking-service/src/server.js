require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const bookingRepo = require("./repositories/booking.repository");

const PORT      = process.env.BOOKING_SERVICE_PORT || 4003;
const GRPC_PORT = process.env.BOOKING_GRPC_PORT    || 5003;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/booking_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/booking.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/booking.handler");
  const server = new grpc.Server();
  server.addService(pkg.cab.booking.BookingService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[booking-service] gRPC bind error:", err.message); return; }
    console.log(`[booking-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[booking-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[booking-service] REST đang chạy tại http://localhost:${PORT}`);
      await Promise.all([
        eventBus.subscribe("DriverAssigned", (payload) => bookingRepo.handleDriverAssigned(payload)),
        eventBus.subscribe("NoDriverFound",  (payload) => bookingRepo.handleNoDriverFound(payload)),
      ]);
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[booking-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
