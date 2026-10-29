const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const repo = require("../repositories/payment.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

// Lazy gRPC client for booking-service (service-to-service)
let _bookingClient = null;
function getBookingClient() {
  if (_bookingClient) return _bookingClient;
  const PROTO_DIR = path.join(__dirname, "../../../../proto");
  const pkgDef = protoLoader.loadSync(path.join(PROTO_DIR, "booking.proto"), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(pkgDef);
  const host = process.env.BOOKING_GRPC_URL || "localhost:5003";
  _bookingClient = new pkg.cab.booking.BookingService(host, grpc.credentials.createInsecure());
  return _bookingClient;
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
      const { bookingId, method } = call.request;
      const payment = await repo.createAndProcess({ bookingId, method });
      cb(null, ok({ data: payment }, 201));
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
      cb(null, ok({ data: payment }));
    } catch (e) { cb(null, fail(e)); }
  },
  async RetryPayment(call, cb) {
    try {
      const payment = await repo.retry(call.request.paymentId);
      cb(null, ok({ data: payment }));
    } catch (e) { cb(null, fail(e)); }
  },
  // UserIdRequest { userId, callerRole }
  async GetMyPayments(call, cb) {
    try {
      const { userId } = call.request;
      let bookingIds = [];
      try {
        const bookingResp = await callGrpc(getBookingClient(), "GetCustomerBookings", { userId, callerRole: "customer", page: 1, limit: 200 });
        if (bookingResp.success) {
          const parsed = JSON.parse(bookingResp.json || "{}");
          const bookings = parsed.data || parsed || [];
          bookingIds = (Array.isArray(bookings) ? bookings : []).map((b) => b.bookingId || b.id).filter(Boolean);
        }
      } catch (grpcErr) {
        console.error("[payment] booking-service gRPC error:", grpcErr.message);
      }
      const payments = await repo.listByBookingIds(bookingIds);
      cb(null, ok({ data: payments }));
    } catch (e) { cb(null, fail(e)); }
  },
};
