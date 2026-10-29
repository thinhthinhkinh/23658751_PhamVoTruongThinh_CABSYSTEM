const repo = require("../repositories/dispatch.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

module.exports = {
  // OfferRequest { bookingId, driverId, callerRole }
  async AcceptOffer(call, cb) {
    try {
      const result = await repo.accept(call.request.bookingId, call.request.driverId);
      cb(null, ok({ data: result }));
    } catch (e) { cb(null, fail(e)); }
  },
  async DeclineOffer(call, cb) {
    try {
      const result = await repo.decline(call.request.bookingId, call.request.driverId);
      cb(null, ok({ data: result }));
    } catch (e) { cb(null, fail(e)); }
  },
  // BookingIdRequest { bookingId, callerId, callerRole }
  async GetCandidates(call, cb) {
    try {
      const candidates = await repo.getCandidates(call.request.bookingId);
      cb(null, ok({ data: candidates }));
    } catch (e) { cb(null, fail(e)); }
  },
  // UserIdRequest { userId, callerRole }
  async GetMyPendingOffer(call, cb) {
    try {
      const offer = await repo.getPendingOfferForDriver(call.request.userId);
      cb(null, ok({ data: offer || null }));
    } catch (e) { cb(null, fail(e)); }
  },
};
