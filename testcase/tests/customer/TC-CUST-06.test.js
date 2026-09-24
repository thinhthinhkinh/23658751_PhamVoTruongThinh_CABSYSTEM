// TC-CUST-06 | Negative | Đăng nhập tài khoản đã bị khóa (ACCOUNT_DISABLED)
const { req, randEmail, signStaffToken } = require("../helpers");

test("TC-CUST-06 | Negative | Đăng nhập tài khoản đã bị khóa (ACCOUNT_DISABLED)", async () => {
  const email = randEmail();
  const password = "123456";
  const registerRes = await req("POST", "/customers/register", { body: { fullName: "A", email, password } });
  const customerId = registerRes.json.data.customer.id;

  // Khóa tài khoản bằng quyền ops_admin (FR-22)
  const adminToken = signStaffToken("ops_admin");
  const disableRes = await req("PATCH", `/customers/${customerId}/disable`, { token: adminToken });
  expect(disableRes.status).toBe(200);

  // Thử đăng nhập lại sau khi đã bị khóa
  const { status, json } = await req("POST", "/customers/login", { body: { email, password } });
  expect(status).toBe(403);
  expect(json.error.code).toBe("ACCOUNT_DISABLED");
});
