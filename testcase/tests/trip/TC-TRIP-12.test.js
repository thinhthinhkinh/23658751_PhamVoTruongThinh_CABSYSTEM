// TC-TRIP-12 | Positive | Service khác tra cứu trip qua endpoint nội bộ
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-TRIP-12 | Positive | Service khác tra cứu trip qua endpoint nội bộ (không token)", async () => {
  const tripRes = await req("POST", "/trips", {
    token: signCustomerToken(uuid()),
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  const tripId = tripRes.json.data.id;

  const { status, json } = await req("GET", `/trips/${tripId}/internal`); // không có Authorization header

  expect(status).toBe(200);
  expect(json.data.id).toBe(tripId);
});
