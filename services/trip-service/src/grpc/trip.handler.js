const repo = require("../repositories/trip.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

module.exports = {
  async CreateTripInternal(call, cb) {
    try {
      const { bookingId, driverId } = call.request;
      const trip = await repo.createTripFromEvent({ bookingId, driverId });
      cb(null, ok({ data: trip }, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetTripByBookingId(call, cb) {
    try {
      const { bookingId, callerId, callerRole } = call.request;
      const trip = await repo.getByBookingId(bookingId, { id: callerId, role: callerRole });
      cb(null, ok({ data: trip }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetTripInternal(call, cb) {
    try {
      const trip = await repo.getInternalByBookingId(call.request.bookingId);
      cb(null, ok({ data: trip }));
    } catch (e) { cb(null, fail(e)); }
  },
  async UpdateTripStatus(call, cb) {
    try {
      const { bookingId, callerId, status, distanceKm, durationMin } = call.request;
      const extra = {};
      if (distanceKm)  extra.distanceKm  = distanceKm;
      if (durationMin) extra.durationMin = durationMin;
      const trip = await repo.updateStatus(bookingId, callerId, status, extra);
      cb(null, ok({ data: trip }));
    } catch (e) { cb(null, fail(e)); }
  },
  async AddRating(call, cb) {
    try {
      const { bookingId, customerId, score, comment } = call.request;
      const rating = await repo.addRating(bookingId, customerId, { score, comment });
      cb(null, ok({ data: rating }, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetDriverRatings(call, cb) {
    try {
      const result = await repo.getDriverRatings(call.request.userId);
      cb(null, ok({ data: result }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetDriverTrips(call, cb) {
    try {
      const { userId, limit, page } = call.request;
      const result = await repo.listByDriverId(userId, { limit, page });
      const trips = Array.isArray(result) ? result : (result.items || []);
      cb(null, ok({ data: trips }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetCustomerTrips(call, cb) {
    try {
      const { userId, limit, page } = call.request;
      const result = await repo.listByCustomerId(userId, { limit, page });
      const trips = Array.isArray(result) ? result : (result.items || []);
      cb(null, ok({ data: trips }));
    } catch (e) { cb(null, fail(e)); }
  },
};
