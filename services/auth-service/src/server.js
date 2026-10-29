require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");
const redis = require("./config/redis");

const PORT      = process.env.AUTH_SERVICE_PORT || 4010;
const GRPC_PORT = process.env.AUTH_GRPC_PORT    || 5010;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/auth_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/auth.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/auth.handler");
  const server = new grpc.Server();
  server.addService(pkg.cab.auth.AuthService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[auth-service] gRPC bind error:", err.message); return; }
    console.log(`[auth-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

Promise.all([
  mongoose.connect(MONGO_URI),
  redis.ping(),
])
  .then(() => {
    console.log("[auth-service] đã kết nối MongoDB + Redis");
    app.listen(PORT, () => {
      console.log(`[auth-service] REST đang chạy tại http://localhost:${PORT}`);
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[auth-service] lỗi khởi động:", err.message);
    process.exit(1);
  });
