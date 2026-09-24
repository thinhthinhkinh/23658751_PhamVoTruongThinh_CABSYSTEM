// TC-ADM-02 | Negative | Khách hàng/tài xế cố truy cập trang quản trị
const { req, signCustomerToken, signDriverToken, uuid } = require("../helpers");

test("TC-ADM-02 | Negative | Khách hàng/tài xế cố truy cập trang quản trị", async () => {
  const customerRes = await req("GET", "/admin/trips", { token: signCustomerToken(uuid()) });
  const driverRes = await req("GET", "/admin/trips", { token: signDriverToken(uuid()) });

  expect(customerRes.status).toBe(403);
  expect(driverRes.status).toBe(403);
});
