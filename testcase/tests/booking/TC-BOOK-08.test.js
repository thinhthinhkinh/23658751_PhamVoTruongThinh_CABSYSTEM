// TC-BOOK-08 | Negative | Hủy booking đã ở trạng thái "cancelled" → 409
// CANCELLABLE_STATUSES = ["requested", "finding_driver"]; "cancelled" không nằm trong danh sách.
// Chiến lược: tạo booking → hủy lần 1 (success) → hủy lần 2 → 409 NOT_CANCELLABLE.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-08 | Negative | Hủy booking đã cancelled → 409", async () => {
  const token = signCustomerToken(uuid());

  // Tạo booking
  const create = await req("POST", "/bookings", {
    token,
    body: {
      pickupLocation:  { lat: 10.77, lng: 106.70 },
      dropoffLocation: { lat: 10.79, lng: 106.68 },
      vehicleType: "4-seat",
    },
  });
  expect(create.status).toBe(201);
  const bookingId = create.json.data.bookingId;

  // Hủy lần 1 → thành công
  const cancel1 = await req("POST", `/bookings/${bookingId}/cancel`, { token });
  expect(cancel1.status).toBe(200);

  // Hủy lần 2 → 409
  const { status, json } = await req("POST", `/bookings/${bookingId}/cancel`, { token });

  expect(status).toBe(409);
  expect(json.error?.code).toBe("NOT_CANCELLABLE");
});
