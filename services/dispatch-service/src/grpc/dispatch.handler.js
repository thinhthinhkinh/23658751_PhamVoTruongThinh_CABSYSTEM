const repo = require("../repositories/dispatch.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 }; }

module.exports = {
  // OfferRequest { tripId, driverId, callerRole }
  async AcceptOffer(call, cb) {
    try {
      const result = await repo.accept(call.request.tripId, call.request.driverId);
      cb(null, ok(result));
    } catch (e) { cb(null, fail(e)); }
  },
  async DeclineOffer(call, cb) {
    try {
      const result = await repo.decline(call.request.tripId, call.request.driverId);
      cb(null, ok(result));
    } catch (e) { cb(null, fail(e)); }
  },
  // TripIdRequest { tripId, callerId, callerRole }
  async GetCandidates(call, cb) {
    try {
      const candidates = await repo.getCandidates(call.request.tripId);
      cb(null, ok({ data: candidates }));
    } catch (e) { cb(null, fail(e)); }
  },
  // UserIdRequest { userId, callerRole }
  async GetMyPendingOffer(call, cb) {
    try {
      const offer = await repo.getPendingOfferForDriver(call.request.userId);
      cb(null, ok(offer || null));
    } catch (e) { cb(null, fail(e)); }
  },
};
