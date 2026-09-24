// TC-TRIP-04 | Negative | Người không liên quan xem chi tiết chuyến
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-TRIP-04 | Negative | Người không liên quan xem chi tiết chuyến", async () => {
  const customerA = signCustomerToken(uuid());
  const customerB = signCustomerToken(uuid());

  const tripRes = await req("POST", "/trips", {
    token: customerA,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  const tripId = tripRes.json.data.id;

  const { status } = await req("GET", `/trips/${tripId}`, { token: customerB });

  expect(status).toBe(403);
});
