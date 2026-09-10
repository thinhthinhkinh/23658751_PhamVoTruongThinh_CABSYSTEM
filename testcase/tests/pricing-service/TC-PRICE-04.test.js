// TC-PRICE-04 | Negative | Xem cấu hình giá khi không đủ quyền
const { req, signStaffToken } = require("../helpers");

test("TC-PRICE-04 | Negative | Xem cấu hình giá khi không đủ quyền (ops_staff, không phải ops_admin)", async () => {
  const staffToken = signStaffToken("ops_staff");
  const { status } = await req("GET", "/pricing/rules", { token: staffToken });

  expect(status).toBe(403);
});
