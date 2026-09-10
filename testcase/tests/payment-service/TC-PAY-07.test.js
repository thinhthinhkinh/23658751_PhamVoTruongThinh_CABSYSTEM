// TC-PAY-07 | Negative | Thanh toán khi chuyến chưa có cước
// ⚠️ Cần Trip Service đang chạy: Payment Service fallback gọi GET /trips/{id}/internal
// khi không có fare trong cache; Trip Service trả 404 cho id không tồn tại -> Payment Service
// chuyển thành lỗi nghiệp vụ FARE_NOT_AVAILABLE thay vì lỗi kết nối.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-PAY-07 | Negative | Thanh toán khi chuyến chưa có cước", async () => {
  const unknownTripId = uuid(); // chưa từng được seed fare, cũng không tồn tại bên Trip Service

  const { status, json } = await req("POST", "/payments", {
    token: signCustomerToken(uuid()),
    body: { tripId: unknownTripId, method: "cash" },
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("FARE_NOT_AVAILABLE");
});
