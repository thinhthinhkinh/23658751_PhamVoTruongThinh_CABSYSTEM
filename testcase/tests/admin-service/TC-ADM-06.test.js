// TC-ADM-06 | Positive | Báo cáo hiệu quả tài xế tính đúng completionRate & averageRating
const { req, signStaffToken } = require("../helpers");
const { createCompletedTripWithRating } = require("./_setup");

test("TC-ADM-06 | Positive | Báo cáo hiệu quả tài xế tính đúng completionRate & averageRating", async () => {
  const { driverId } = await createCompletedTripWithRating(5);
  const adminToken = signStaffToken("ops_admin");

  const { status, json } = await req("GET", "/admin/reports/driver-performance", { token: adminToken });

  expect(status).toBe(200);
  const perf = json.data.find((d) => d.driverId === driverId);
  expect(perf).toBeDefined();
  expect(perf.totalTrips).toBe(1);
  expect(perf.completionRate).toBe(1);
  expect(perf.averageRating).toBe(5);
});
