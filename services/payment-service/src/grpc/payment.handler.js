const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const repo = require("../repositories/payment.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 }; }

// Lazy gRPC client for trip-service (service-to-service)
let _tripClient = null;
function getTripClient() {
  if (_tripClient) return _tripClient;
  const PROTO_DIR = path.join(__dirname, "../../../../proto");
  const pkgDef = protoLoader.loadSync(path.join(PROTO_DIR, "trip.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const host = process.env.TRIP_GRPC_URL || "localhost:5003";
  _tripClient = new pkg["cab.trip"].TripService(host, grpc.credentials.createInsecure());
  return _tripClient;
}

function callGrpc(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = {
  async CreatePayment(call, cb) {
    try {
      const { tripId, method } = call.request;
      const payment = await repo.createAndProcess({ tripId, method });
      cb(null, ok(payment, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListAll(call, cb) {
    try {
      const payments = await repo.listAll();
      cb(null, ok({ data: payments }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetById(call, cb) {
    try {
      const payment = await repo.getById(call.request.paymentId);
      cb(null, ok(payment));
    } catch (e) { cb(null, fail(e)); }
  },
  async RetryPayment(call, cb) {
    try {
      const payment = await repo.retry(call.request.paymentId);
      cb(null, ok(payment));
    } catch (e) { cb(null, fail(e)); }
  },
  // UserIdRequest { userId, callerRole }
  async GetMyPayments(call, cb) {
    try {
      const { userId } = call.request;
      // Call trip-service via gRPC to get this customer's trips
      let tripIds = [];
      try {
        const tripResp = await callGrpc(getTripClient(), "GetCustomerTrips", { userId, callerRole: "customer", page: 1, limit: 200 });
        if (tripResp.success) {
          const parsed = JSON.parse(tripResp.json || "{}");
          const trips = parsed.data || parsed || [];
          tripIds = (Array.isArray(trips) ? trips : []).map((t) => t.id).filter(Boolean);
        }
      } catch (grpcErr) {
        // Gracefully degrade: return empty list if trip-service unreachable
        console.error("[payment] trip-service gRPC error:", grpcErr.message);
      }
      const payments = await repo.listByTripIds(tripIds);
      cb(null, ok({ data: payments }));
    } catch (e) { cb(null, fail(e)); }
  },
};
