// TC-TRIP-02 | Negative | Tạo chuyến thiếu dropoffLocation
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-TRIP-02 | Negative | Tạo chuyến thiếu dropoffLocation", async () => {
  const customerToken = signCustomerToken(uuid());
  const { status, json } = await req("POST", "/trips", {
    token: customerToken,
    body: { pickupLocation: { lat: 10.77, lng: 106.7 }, vehicleType: "4-seat" }, // thiếu dropoffLocation
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("INVALID_INPUT");
});
