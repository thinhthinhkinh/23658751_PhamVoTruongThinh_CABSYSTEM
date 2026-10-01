require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const eventBus = require("./utils/eventBusClient");
const driverRepo = require("./repositories/driver.repository");

const PORT      = process.env.DRIVER_SERVICE_PORT || 4002;
const GRPC_PORT = process.env.DRIVER_GRPC_PORT    || 5002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/driver_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/driver.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/driver.handler");
  const server = new grpc.Server();
  server.addService(pkg["cab.driver"].DriverService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[driver-service] gRPC bind error:", err.message); return; }
    console.log(`[driver-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[driver-service] đã kết nối MongoDB");
    app.listen(PORT, async () => {
      console.log(`[driver-service] REST đang chạy tại http://localhost:${PORT}`);
      await eventBus.subscribe("DriverAssigned", async (payload) => {
        if (payload && payload.driverId) {
          await driverRepo.updateStatus(payload.driverId, "busy").catch((err) =>
            console.error("[driver-service] updateStatus lỗi:", err.message)
          );
        }
      });
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[driver-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
