// TC-NOTI-01 | Positive | Khách hàng nhận thông báo khi tài xế nhận chuyến
// ⚠️ Cần Trip Service đang chạy (webhook gọi ngược GET /trips/{id}/internal).
const { req, signCustomerToken } = require("../helpers");
const { createRealTrip } = require("./_setup");

test("TC-NOTI-01 | Positive | Khách hàng nhận thông báo khi tài xế nhận chuyến", async () => {
  const { tripId, customerId } = await createRealTrip();

  await req("POST", "/notifications/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId, driverId: "driver-x", eta: 5 } },
  });

  const { status, json } = await req("GET", "/notifications/me", { token: signCustomerToken(customerId) });

  expect(status).toBe(200);
  expect(json.data.some((n) => n.title === "Đã tìm thấy tài xế")).toBe(true);
});
