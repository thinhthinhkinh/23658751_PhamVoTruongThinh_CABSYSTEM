// Helper riêng cho Admin Service test: tạo & hoàn thành 1 chuyến thật bên Trip Service
// (Admin Service không sở hữu dữ liệu, chỉ tổng hợp từ Trip/Customer/Driver/Payment Service).
const { req, signCustomerToken, signDriverToken, uuid } = require("../helpers");

async function createCompletedTripWithRating(score = 5) {
  const customerId = uuid();
  const driverId = uuid();
  const customerToken = signCustomerToken(customerId);
  const driverToken = signDriverToken(driverId);

  const tripRes = await req("POST", "/trips", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  const tripId = tripRes.json.data.id;

  await req("POST", "/trips/events/driver-assigned", { body: { event: "DriverAssigned", payload: { tripId, driverId, eta: 5 } } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "arrived" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "picked_up" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "in_progress" } });
  const completeRes = await req("PATCH", `/trips/${tripId}/status`, {
    token: driverToken,
    body: { status: "completed", distanceKm: 5, durationMin: 15 },
  });
  await req("POST", `/trips/${tripId}/rating`, { token: customerToken, body: { score } });

  return { tripId, customerId, driverId, fareAmount: completeRes.json.data.fareAmount };
}

module.exports = { createCompletedTripWithRating };
