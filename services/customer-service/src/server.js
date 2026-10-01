require("dotenv").config();
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const app = require("./app");

const PORT      = process.env.CUSTOMER_SERVICE_PORT || 4001;
const GRPC_PORT = process.env.CUSTOMER_GRPC_PORT    || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/customer_db";

function startGrpcServer() {
  const pkgDef = protoLoader.loadSync(path.join(__dirname, "../../../proto/customer.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const handler = require("./grpc/customer.handler");
  const server = new grpc.Server();
  server.addService(pkg["cab.customer"].CustomerService.service, handler);
  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("[customer-service] gRPC bind error:", err.message); return; }
    console.log(`[customer-service] gRPC đang lắng nghe tại port ${port}`);
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[customer-service] đã kết nối MongoDB");
    app.listen(PORT, () => {
      console.log(`[customer-service] REST đang chạy tại http://localhost:${PORT}`);
    });
    startGrpcServer();
  })
  .catch((err) => {
    console.error("[customer-service] lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
