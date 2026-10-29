const repo = require("../repositories/booking.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

module.exports = {
  async CreateBooking(call, cb) {
    try {
      const { customerId, pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType } = call.request;
      const booking = await repo.createBookingRequest(customerId, {
        pickupLocation:  { lat: pickupLat,  lng: pickupLng  },
        dropoffLocation: { lat: dropoffLat, lng: dropoffLng },
        vehicleType,
      });
      cb(null, ok({ data: booking }, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListAll(call, cb) {
    try {
      const bookings = await repo.listAll(null);
      cb(null, ok({ data: bookings }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetBookingById(call, cb) {
    try {
      const { bookingId, callerId, callerRole } = call.request;
      const booking = await repo.getOwnedById(bookingId, { id: callerId, role: callerRole });
      cb(null, ok({ data: booking }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetBookingStatus(call, cb) {
    try {
      const { bookingId, callerId, callerRole } = call.request;
      const booking = await repo.getOwnedById(bookingId, { id: callerId, role: callerRole });
      cb(null, ok({ data: { bookingId: booking.bookingId, status: booking.status } }));
    } catch (e) { cb(null, fail(e)); }
  },
  async CancelBooking(call, cb) {
    try {
      const booking = await repo.cancelBooking(call.request.bookingId, call.request.callerId);
      cb(null, ok({ data: booking }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetBookingInternal(call, cb) {
    try {
      const booking = await repo.getInternal(call.request.bookingId);
      cb(null, ok({ data: booking }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetCustomerBookings(call, cb) {
    try {
      const { userId, limit, page } = call.request;
      const result = await repo.listByCustomerId(userId, { limit, page });
      const bookings = Array.isArray(result) ? result : (result.items || []);
      cb(null, ok({ data: bookings }));
    } catch (e) { cb(null, fail(e)); }
  },
};
