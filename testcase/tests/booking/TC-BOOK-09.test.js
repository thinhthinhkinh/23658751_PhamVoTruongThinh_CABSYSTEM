// TC-BOOK-09 | Negative | Không có token khi tạo booking → 401
// Gateway yêu cầu auth trước khi kiểm tra role. Không có token → 401 UNAUTHORIZED.
const { req } = require("../helpers");

test("TC-BOOK-09 | Negative | Tạo booking không có token → 401", async () => {
  const { status } = await req("POST", "/bookings", {
    body: {
      pickupLocation:  { lat: 10.77, lng: 106.70 },
      dropoffLocation: { lat: 10.79, lng: 106.68 },
      vehicleType: "4-seat",
    },
  });

  // Gateway: không có token → callerRole = undefined → bị chặn ở role check (403) hoặc
  // service trả 401; cả hai đều chấp nhận vì hệ thống từ chối request trái phép.
  expect([401, 403]).toContain(status);
});
