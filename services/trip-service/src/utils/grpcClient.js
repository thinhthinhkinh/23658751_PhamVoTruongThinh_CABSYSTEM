const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const AppError = require("./AppError");

const PROTO_DIR = path.join(__dirname, "../../../../proto");

function loadProto(filename) {
  const def = protoLoader.loadSync(path.join(PROTO_DIR, filename), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  return grpc.loadPackageDefinition(def);
}

function makeClient(pkg, ServiceName, host) {
  return new pkg[ServiceName](host, grpc.credentials.createInsecure());
}

function call(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

async function grpcCall(client, method, request) {
  const resp = await call(client, method, request);
  if (!resp.success) {
    throw new AppError(resp.http_status || 502, resp.error_code || "UPSTREAM_ERROR", resp.error_message || "Lỗi gRPC upstream");
  }
  return JSON.parse(resp.json);
}

const PRICING_GRPC_URL = process.env.PRICING_GRPC_URL || "pricing-service:5006";
const pricingPkg = loadProto("pricing.proto");
const pricingClient = makeClient(pricingPkg.cab.pricing, "PricingService", PRICING_GRPC_URL);

const BOOKING_GRPC_URL = process.env.BOOKING_GRPC_URL || "booking-service:5003";
const bookingPkg = loadProto("booking.proto");
const bookingClient = makeClient(bookingPkg.cab.booking, "BookingService", BOOKING_GRPC_URL);

module.exports = { grpcCall, pricingClient, bookingClient };
