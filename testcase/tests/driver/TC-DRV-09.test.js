// TC-DRV-09 | Positive | Ops_admin khóa tài khoản tài xế
const { req, randEmail, signStaffToken } = require("../helpers");

test("TC-DRV-09 | Positive | Ops_admin khóa tài khoản tài xế", async () => {
  const registerRes = await req("POST", "/drivers/register", {
    body: { fullName: "A", email: randEmail(), password: "123456" },
  });
  const driverId = registerRes.json.data.driver.id;

  const adminToken = signStaffToken("ops_admin");
  const { status, json } = await req("PATCH", `/drivers/${driverId}/disable`, { token: adminToken });

  expect(status).toBe(200);
  expect(json.data.active).toBe(false);
});
