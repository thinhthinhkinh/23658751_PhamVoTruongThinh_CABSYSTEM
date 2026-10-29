// TC-BOOK-03 | Negative | Driver không được tạo booking → 403
// Gateway kiểm tra role: POST /bookings chỉ dành cho role "customer".
// Driver token hợp lệ về chữ ký nhưng sai role → 403 FORBIDDEN.
const { req, signDriverToken, uuid } = require("../helpers");

test("TC-BOOK-03 | Negative | Driver token tạo booking → 403", async () => {
  const token = signDriverToken(uuid());

  const { status, json } = await req("POST", "/bookings", {
    token,
    body: {
      pickupLocation:  { lat: 10.77, lng: 106.70 },
      dropoffLocation: { lat: 10.79, lng: 106.68 },
      vehicleType: "4-seat",
    },
  });

  expect(status).toBe(403);
  expect(json.error?.code).toBe("FORBIDDEN");
});
