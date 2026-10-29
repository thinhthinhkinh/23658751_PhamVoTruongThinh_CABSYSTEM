// TC-BOOK-10 | Positive | Ops_staff xem được danh sách tất cả booking → 200
// Bảng chấm mục 7: GET /bookings (không có :id) chỉ ops_staff/ops_admin mới truy cập được.
const { req, signStaffToken, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-10 | Positive | Ops_staff lấy danh sách tất cả booking → 200", async () => {
  // Tạo ít nhất 1 booking để danh sách không rỗng
  const customerToken = signCustomerToken(uuid());
  await req("POST", "/bookings", {
    token: customerToken,
    body: {
      pickupLocation:  { lat: 10.77, lng: 106.70 },
      dropoffLocation: { lat: 10.79, lng: 106.68 },
      vehicleType: "4-seat",
    },
  });

  const staffToken = signStaffToken("ops_staff");
  const { status, json } = await req("GET", "/bookings", { token: staffToken });

  expect(status).toBe(200);
  expect(Array.isArray(json.data)).toBe(true);
  expect(json.data.length).toBeGreaterThan(0);
});
