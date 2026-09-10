// TC-ADM-04 | Positive | Ops_admin khóa tài khoản khách hàng thành công
const { req, signStaffToken, randEmail } = require("../helpers");

test("TC-ADM-04 | Positive | Ops_admin khóa tài khoản khách hàng thành công", async () => {
  const email = randEmail();
  const password = "123456";
  const registerRes = await req("POST", "/customers/register", { body: { fullName: "A", email, password } });
  const customerId = registerRes.json.data.customer.id;

  const adminToken = signStaffToken("ops_admin");
  const disableRes = await req("DELETE", `/admin/customers/${customerId}`, { token: adminToken });
  expect(disableRes.status).toBe(200);

  // Xác nhận qua Customer Service: khách hàng không đăng nhập lại được nữa
  const loginRes = await req("POST", "/customers/login", { body: { email, password } });
  expect(loginRes.status).toBe(403);
  expect(loginRes.json.error.code).toBe("ACCOUNT_DISABLED");
});
