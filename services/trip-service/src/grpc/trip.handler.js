const repo = require("../repositories/trip.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 }; }

module.exports = {
  async CreateTrip(call, cb) {
    try {
      const { customerId, pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType } = call.request;
      const trip = await repo.createTripRequest(customerId, {
        pickupLocation:  { lat: pickupLat,  lng: pickupLng  },
        dropoffLocation: { lat: dropoffLat, lng: dropoffLng },
        vehicleType,
      });
      cb(null, ok(trip, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListAll(call, cb) {
    try {
      const trips = await repo.listAll(null);
      cb(null, ok({ data: trips }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetTripById(call, cb) {
    try {
      const { tripId, callerId, callerRole } = call.request;
      const trip = await repo.getOwnedById(tripId, { id: callerId, role: callerRole });
      cb(null, ok(trip));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetTripStatus(call, cb) {
    try {
      const { tripId, callerId, callerRole } = call.request;
      const trip = await repo.getOwnedById(tripId, { id: callerId, role: callerRole });
      cb(null, ok({ id: trip.id, status: trip.status }));
    } catch (e) { cb(null, fail(e)); }
  },
  async UpdateStatus(call, cb) {
    try {
      const { tripId, callerId, status } = call.request;
      const trip = await repo.updateStatusByDriver(tripId, callerId, status, {});
      cb(null, ok(trip));
    } catch (e) { cb(null, fail(e)); }
  },
  async CancelTrip(call, cb) {
    try {
      const trip = await repo.cancelTrip(call.request.tripId, call.request.callerId);
      cb(null, ok(trip));
    } catch (e) { cb(null, fail(e)); }
  },
  async AddRating(call, cb) {
    try {
      const { tripId, customerId, score, comment } = call.request;
      const rating = await repo.addRating(tripId, customerId, { score, comment });
      cb(null, ok(rating, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetTripInternal(call, cb) {
    try {
      const trip = await repo.getInternal(call.request.tripId);
      cb(null, ok(trip));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetCustomerTrips(call, cb) {
    try {
      const { userId, limit, page } = call.request;
      const trips = await repo.listByCustomerId(userId, { limit, page });
      cb(null, ok({ data: trips }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetDriverTrips(call, cb) {
    try {
      const { userId, limit, page } = call.request;
      const trips = await repo.listByDriverId(userId, { limit, page });
      cb(null, ok({ data: trips }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetDriverRatings(call, cb) {
    try {
      const result = await repo.getDriverRatings(call.request.userId);
      cb(null, ok(result));
    } catch (e) { cb(null, fail(e)); }
  },
};
