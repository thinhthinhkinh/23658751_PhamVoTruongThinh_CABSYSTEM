// TC-BOOK-06 | Negative | Booking không tồn tại → 404
// Dùng UUID ngẫu nhiên không có trong DB → BOOKING_NOT_FOUND.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-06 | Negative | Booking không tồn tại → 404", async () => {
  const token = signCustomerToken(uuid());
  const fakeId = uuid();

  const { status, json } = await req("GET", `/bookings/${fakeId}`, { token });

  expect(status).toBe(404);
  expect(json.error?.code).toBe("BOOKING_NOT_FOUND");
});
