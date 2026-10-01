// TC-TRIP-18 | Negative | Bấm đặt xe nhiều lần liên tiếp chỉ tạo một chuyến
// Dự kiến FAIL cho tới khi POST /trips xử lý idempotent (khóa theo khách hoặc unique index).
const { req, signCustomerToken, uuid } = require("../helpers");

test.failing("TC-TRIP-18 | Negative | Bấm đặt xe nhiều lần liên tiếp chỉ tạo một chuyến", async () => {
  const customerToken = signCustomerToken(uuid());
  const body = {
    pickupLocation: { lat: 10.77, lng: 106.7 },
    dropoffLocation: { lat: 10.78, lng: 106.69 },
    vehicleType: "4-seat",
  };

  const results = await Promise.all([
    req("POST", "/trips", { token: customerToken, body }),
    req("POST", "/trips", { token: customerToken, body }),
    req("POST", "/trips", { token: customerToken, body }),
  ]);

  const created = results.filter((r) => r.status === 201);
  expect(created.length).toBe(1);
});