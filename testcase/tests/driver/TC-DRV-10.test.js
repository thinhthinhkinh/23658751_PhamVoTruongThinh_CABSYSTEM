// TC-DRV-10 | Negative | Tài xế đã bị khóa cố đăng nhập lại
const { req, randEmail, signStaffToken } = require("../helpers");

test("TC-DRV-10 | Negative | Tài xế đã bị khóa cố đăng nhập lại", async () => {
  const email = randEmail();
  const password = "123456";
  const registerRes = await req("POST", "/drivers/register", { body: { fullName: "A", email, password } });
  const driverId = registerRes.json.data.driver.id;

  const adminToken = signStaffToken("ops_admin");
  await req("PATCH", `/drivers/${driverId}/disable`, { token: adminToken });

  const { status, json } = await req("POST", "/drivers/login", { body: { email, password } });

  expect(status).toBe(403);
  expect(json.error.code).toBe("ACCOUNT_DISABLED");
});
