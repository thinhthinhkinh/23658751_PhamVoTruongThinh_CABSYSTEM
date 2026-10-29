// TC-BOOK-05 | Negative | Customer xem booking của người khác → 403
// booking-service kiểm tra customerId trong booking có khớp callerId từ JWT không.
// Hai customer khác nhau: customer A tạo booking, customer B cố lấy → 403.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-05 | Negative | Customer xem booking của người khác → 403", async () => {
  const tokenA = signCustomerToken(uuid());
  const tokenB = signCustomerToken(uuid()); // customer khác

  // Customer A tạo booking
  const create = await req("POST", "/bookings", {
    token: tokenA,
    body: {
      pickupLocation:  { lat: 10.77, lng: 106.70 },
      dropoffLocation: { lat: 10.79, lng: 106.68 },
      vehicleType: "4-seat",
    },
  });
  expect(create.status).toBe(201);
  const bookingId = create.json.data.bookingId;

  // Customer B cố truy cập booking của A
  const { status, json } = await req("GET", `/bookings/${bookingId}`, { token: tokenB });

  expect(status).toBe(403);
  expect(json.error?.code).toBe("FORBIDDEN");
});
