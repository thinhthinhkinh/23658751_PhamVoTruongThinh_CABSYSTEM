// TC-AUTH-05 | Negative | Token role sai không được thực hiện thao tác yêu cầu role khác → 403
// Driver token cố gọi POST /bookings (chỉ customer) phải bị từ chối với 403.
// Khác TC-AUTH-02: token có, hợp lệ, nhưng role không đủ quyền.
const { req, signDriverToken, uuid } = require("../helpers");

test("TC-AUTH-05 | Negative | Driver token gọi endpoint chỉ customer → 403", async () => {
  const driverToken = signDriverToken(uuid());

  const { status, json } = await req("POST", "/bookings", {
    token: driverToken,
    body: {
      pickupLocation:  { lat: 10.77, lng: 106.70 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });

  expect(status).toBe(403);
  expect(json.error?.code).toBe("FORBIDDEN");
});
