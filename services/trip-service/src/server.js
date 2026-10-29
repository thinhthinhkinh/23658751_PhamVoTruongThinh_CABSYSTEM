require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const tripRepo = require("./repositories/trip.repository");

const PORT      = process.env.TRIP_SERVICE_PORT || 4011;
const GRPC_PORT = process.env.TRIP_GRPC_PORT    || 5011;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/trip_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/trip.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/trip.handler");
  const server = new grpc.Server();
  server.addService(pkg.cab.trip.TripService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[trip-service] gRPC bind error:", err.message); return; }
    console.log(`[trip-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[trip-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[trip-service] REST đang chạy tại http://localhost:${PORT}`);
      await eventBus.subscribe("DriverAssigned", (payload) => tripRepo.createTripFromEvent(payload));
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[trip-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
