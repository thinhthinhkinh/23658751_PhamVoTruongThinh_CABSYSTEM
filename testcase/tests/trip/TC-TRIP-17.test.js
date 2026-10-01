// TC-TRIP-17 | Negative | Mỗi khách chỉ được có 1 chuyến đang hoạt động
// Dự kiến FAIL cho tới khi thêm ràng buộc 1 chuyến hoạt động / khách.
// Mã lỗi ACTIVE_TRIP_EXISTS là đề xuất của test case, không phải mã đã có sẵn trong code.
const { req, signCustomerToken, uuid } = require("../helpers");

test.failing("TC-TRIP-17 | Negative | Mỗi khách chỉ được có 1 chuyến đang hoạt động", async () => {
  const customerToken = signCustomerToken(uuid());
  const baseBody = {
    pickupLocation: { lat: 10.77, lng: 106.7 },
    dropoffLocation: { lat: 10.78, lng: 106.69 },
    vehicleType: "4-seat",
  };

  const first = await req("POST", "/trips", { token: customerToken, body: baseBody });
  expect(first.status).toBe(201);

  // chuyến thứ 2, khác điểm đến, cùng khách, trong khi chuyến 1 vẫn đang finding_driver
  const second = await req("POST", "/trips", {
    token: customerToken,
    body: { ...baseBody, dropoffLocation: { lat: 10.79, lng: 106.68 } },
  });

  expect(second.status).toBe(409);
  expect(second.json.error.code).toBe("ACTIVE_TRIP_EXISTS");
});