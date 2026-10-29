// TC-BOOK-02 | Negative | Thiếu field bắt buộc khi tạo booking → 400
// Gateway kiểm tra pickupLocation, dropoffLocation, vehicleType trước khi forward gRPC.
// Test lần lượt 3 trường hợp thiếu field.
const { req, signCustomerToken, uuid } = require("../helpers");

const token = signCustomerToken(uuid());

const BASE_BODY = {
  pickupLocation:  { lat: 10.77, lng: 106.70 },
  dropoffLocation: { lat: 10.79, lng: 106.68 },
  vehicleType: "4-seat",
};

test("TC-BOOK-02a | Negative | Thiếu pickupLocation → 400", async () => {
  const { pickupLocation, ...body } = BASE_BODY;
  const { status } = await req("POST", "/bookings", { token, body });
  expect(status).toBe(400);
});

test("TC-BOOK-02b | Negative | Thiếu dropoffLocation → 400", async () => {
  const { dropoffLocation, ...body } = BASE_BODY;
  const { status } = await req("POST", "/bookings", { token, body });
  expect(status).toBe(400);
});

test("TC-BOOK-02c | Negative | Thiếu vehicleType → 400", async () => {
  const { vehicleType, ...body } = BASE_BODY;
  const { status } = await req("POST", "/bookings", { token, body });
  expect(status).toBe(400);
});
