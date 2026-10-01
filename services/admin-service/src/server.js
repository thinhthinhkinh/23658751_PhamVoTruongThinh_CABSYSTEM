require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");

const PORT      = process.env.ADMIN_SERVICE_PORT || 4009;
const GRPC_PORT = process.env.ADMIN_GRPC_PORT    || 5009;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/admin_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/admin.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/admin.handler");
  const server = new grpc.Server();
  server.addService(pkg["cab.admin"].AdminService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[admin-service] gRPC bind error:", err.message); return; }
    console.log(`[admin-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[admin-service] đã kết nối MongoDB");
    app.listen(PORT, () => {
      console.log(`[admin-service] REST đang chạy tại http://localhost:${PORT}`);
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[admin-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
