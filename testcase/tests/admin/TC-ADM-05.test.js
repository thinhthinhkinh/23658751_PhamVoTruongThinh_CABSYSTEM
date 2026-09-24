// TC-ADM-05 | Positive | Báo cáo doanh thu tính đúng trong khoảng thời gian
const { req, signStaffToken } = require("../helpers");
const { createCompletedTripWithRating } = require("./_setup");

test("TC-ADM-05 | Positive | Báo cáo doanh thu tính đúng trong khoảng thời gian", async () => {
  const { fareAmount } = await createCompletedTripWithRating();
  const adminToken = signStaffToken("ops_admin");

  // Khoảng bao trọn "bây giờ" -> phải tính cả chuyến vừa tạo
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const inRange = await req("GET", `/admin/reports/revenue?from=${yesterday}&to=${tomorrow}`, { token: adminToken });
  expect(inRange.status).toBe(200);
  expect(inRange.json.data.value).toBeGreaterThanOrEqual(fareAmount);

  // Khoảng hoàn toàn trong quá khứ (năm 2000) -> không được tính chuyến vừa tạo
  const outOfRange = await req("GET", "/admin/reports/revenue?from=2000-01-01&to=2000-01-02", { token: adminToken });
  expect(outOfRange.json.data.value).toBe(0);
});
