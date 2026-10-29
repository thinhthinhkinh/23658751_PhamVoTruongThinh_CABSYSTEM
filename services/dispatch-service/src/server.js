require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const dispatchRepo = require("./repositories/dispatch.repository");

const PORT      = process.env.DISPATCH_SERVICE_PORT || 4004;
const GRPC_PORT = process.env.DISPATCH_GRPC_PORT    || 5004;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/dispatch_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/dispatch.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/dispatch.handler");
  const server = new grpc.Server();
  server.addService(pkg.cab.dispatch.DispatchService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[dispatch-service] gRPC bind error:", err.message); return; }
    console.log(`[dispatch-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[dispatch-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[dispatch-service] REST đang chạy tại http://localhost:${PORT}`);
      await eventBus.subscribe("BookingRequested", (payload) => dispatchRepo.handleBookingRequested(payload));
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[dispatch-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
