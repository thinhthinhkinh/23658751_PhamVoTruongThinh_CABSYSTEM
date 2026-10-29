require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");

const PORT      = process.env.LOCATION_SERVICE_PORT || 4005;
const GRPC_PORT = process.env.LOCATION_GRPC_PORT    || 5005;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/location_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/location.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/location.handler");
  const server = new grpc.Server();
  server.addService(pkg.cab.location.LocationService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[location-service] gRPC bind error:", err.message); return; }
    console.log(`[location-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[location-service] đã kết nối MongoDB");
    app.listen(PORT, () => {
      console.log(`[location-service] REST đang chạy tại http://localhost:${PORT}`);
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[location-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
