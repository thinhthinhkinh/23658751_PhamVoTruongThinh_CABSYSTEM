// Helper riêng cho Trip Service test: tạo 1 chuyến rồi "giả lập" Dispatch Service
// đã gán tài xế, bằng cách gọi thẳng webhook nội bộ /trips/events/driver-assigned
// — tránh phải bật cả Dispatch + Location + Event Bus chỉ để test Trip Service.
const { req, signCustomerToken, signDriverToken, uuid } = require("../helpers");

async function createAssignedTrip() {
  const customerId = uuid();
  const driverId = uuid();
  const customerToken = signCustomerToken(customerId);
  const driverToken = signDriverToken(driverId);

  const tripRes = await req("POST", "/trips", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.7769, lng: 106.7009 },
      dropoffLocation: { lat: 10.7829, lng: 106.6934 },
      vehicleType: "4-seat",
    },
  });
  const tripId = tripRes.json.data.id;

  await req("POST", "/trips/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId, driverId, eta: 5 } },
  });

  return { tripId, customerId, driverId, customerToken, driverToken };
}

async function createCompletedTrip() {
  const assigned = await createAssignedTrip();
  const { tripId, driverToken } = assigned;
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "arrived" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "picked_up" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "in_progress" } });
  await req("PATCH", `/trips/${tripId}/status`, {
    token: driverToken,
    body: { status: "completed", distanceKm: 5, durationMin: 15 },
  });
  return assigned;
}

module.exports = { createAssignedTrip, createCompletedTrip };
