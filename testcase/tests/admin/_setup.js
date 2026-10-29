// Helper riêng cho Admin Service test: tạo & hoàn thành 1 chuyến thật bên Trip Service
// (Admin Service không sở hữu dữ liệu, chỉ tổng hợp từ Trip/Customer/Driver/Payment Service).
const { req, signCustomerToken, signDriverToken, uuid } = require("../helpers");

async function createCompletedTripWithRating(score = 5) {
  const customerId = uuid();
  const driverId = uuid();
  const customerToken = signCustomerToken(customerId);
  const driverToken = signDriverToken(driverId);

  const tripRes = await req("POST", "/bookings", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  const bookingId = tripRes.json.data.bookingId;

  await req("POST", "/bookings/events/driver-assigned", { body: { event: "DriverAssigned", payload: { bookingId, driverId, eta: 5 } } });
  await req("POST", "/trips/events/driver-assigned", { body: { event: "DriverAssigned", payload: { bookingId, driverId, eta: 5 } } });

  await req("PATCH", `/trips/${bookingId}/status`, { token: driverToken, body: { status: "arrived" } });
  await req("PATCH", `/trips/${bookingId}/status`, { token: driverToken, body: { status: "picked_up" } });
  await req("PATCH", `/trips/${bookingId}/status`, { token: driverToken, body: { status: "in_progress" } });
  const completeRes = await req("PATCH", `/trips/${bookingId}/status`, {
    token: driverToken,
    body: { status: "completed", distanceKm: 5, durationMin: 15 },
  });
  await req("POST", `/trips/${bookingId}/rating`, { token: customerToken, body: { score } });

  return { bookingId, customerId, driverId, fareAmount: completeRes.json.data.actualFare };
}

module.exports = { createCompletedTripWithRating };
