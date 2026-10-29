// TC-BOOK-04 | Positive | Customer (chủ booking) lấy booking theo ID thành công → 200
// Bảng chấm mục 7: getById trả đầy đủ thông tin cho owner.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-BOOK-04 | Positive | Chủ booking lấy booking theo ID → 200", async () => {
  const token = signCustomerToken(uuid());

  // Tạo booking trước
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

  // Lấy lại bằng ID
  const { status, json } = await req("GET", `/bookings/${bookingId}`, { token });

  expect(status).toBe(200);
  expect(json.data.bookingId).toBe(bookingId);
  expect(json.data.vehicleType).toBe("4-seat");
  expect(json.data.status).toBeDefined();
});
