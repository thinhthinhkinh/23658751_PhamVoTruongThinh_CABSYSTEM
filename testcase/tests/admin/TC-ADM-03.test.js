// TC-ADM-03 | Negative | Ops_staff (không phải ops_admin) cố khóa tài khoản khách hàng
const { req, signStaffToken, randEmail } = require("../helpers");

test("TC-ADM-03 | Negative | Ops_staff (không phải ops_admin) cố khóa tài khoản khách hàng", async () => {
  const registerRes = await req("POST", "/customers/register", {
    body: { fullName: "A", email: randEmail(), password: "123456" },
  });
  const customerId = registerRes.json.data.customer.id;

  const staffToken = signStaffToken("ops_staff");
  const { status } = await req("DELETE", `/admin/customers/${customerId}`, { token: staffToken });

  expect(status).toBe(403);
});
