// TC-BOOK-01 | Positive | Tạo booking thành công với token customer hợp lệ
// Bảng chấm mục 7 (FR-02): Customer đặt xe → 201, status "finding_driver", có bookingId.
// Dùng signCustomerToken(uuid()) thay vì đăng ký thật: booking-service chỉ lưu customerId
// từ JWT, không xác minh id có tồn tại trong customer_db hay không.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-01 | Positive | Tạo booking thành công", async () => {
  const token = signCustomerToken(uuid());

  const { status, json } = await req("POST", "/bookings", {
    token,
    body: {
      pickupLocation:  { lat: 10.7769, lng: 106.7009 },
      dropoffLocation: { lat: 10.7900, lng: 106.6800 },
      vehicleType: "4-seat",
    },
  });

  expect(status).toBe(201);
  expect(json.data.bookingId).toBeDefined();
  expect(json.data.status).toBe("finding_driver");
  expect(json.data.vehicleType).toBe("4-seat");
  expect(json.data.pickupLocation).toBeDefined();
  expect(json.data.dropoffLocation).toBeDefined();
});
