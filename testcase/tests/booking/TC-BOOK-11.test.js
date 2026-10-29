// TC-BOOK-11 | Negative | Customer không được xem danh sách tất cả booking → 403
// GET /bookings yêu cầu role ops_staff hoặc ops_admin; customer bị từ chối 403 FORBIDDEN.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-11 | Negative | Customer gọi GET /bookings (danh sách tất cả) → 403", async () => {
  const token = signCustomerToken(uuid());

  const { status, json } = await req("GET", "/bookings", { token });

  expect(status).toBe(403);
  expect(json.error?.code).toBeDefined();
});
