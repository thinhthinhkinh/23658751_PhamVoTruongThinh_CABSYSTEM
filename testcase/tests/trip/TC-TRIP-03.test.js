// TC-TRIP-03 | Negative | Tài xế cố tạo yêu cầu đặt xe
const { req, signDriverToken, uuid } = require("../helpers");

test("TC-TRIP-03 | Negative | Tài xế cố tạo yêu cầu đặt xe", async () => {
  const driverToken = signDriverToken(uuid());
  const { status } = await req("POST", "/trips", {
    token: driverToken,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });

  expect(status).toBe(403);
});
