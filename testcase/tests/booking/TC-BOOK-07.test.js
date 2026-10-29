// TC-BOOK-07 | Positive | Hủy booking ở trạng thái có thể hủy → 200, status "cancelled"
// CANCELLABLE_STATUSES = ["requested", "finding_driver", "no_driver_found"].
// Booking mới tạo bắt đầu ở "finding_driver"; trong môi trường test không có tài xế khả dụng
// nên dispatch-service có thể chuyển ngay sang "no_driver_found" trước khi hủy — cả hai
// trạng thái đều hủy được (customer phải được hủy khi không tìm thấy tài xế).
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-07 | Positive | Hủy booking ở trạng thái cancellable → 200", async () => {
  const token = signCustomerToken(uuid());

  const create = await req("POST", "/bookings", {
    token,
    body: {
      pickupLocation:  { lat: 10.7769, lng: 106.7009 },
      dropoffLocation: { lat: 10.7900, lng: 106.6800 },
      vehicleType: "4-seat",
    },
  });
  expect(create.status).toBe(201);
  const bookingId = create.json.data.bookingId;

  const { status, json } = await req("POST", `/bookings/${bookingId}/cancel`, { token });

  expect(status).toBe(200);
  expect(json.data.status).toBe("cancelled");
  expect(json.data.bookingId).toBe(bookingId);
});
