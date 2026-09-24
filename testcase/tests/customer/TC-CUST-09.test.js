// TC-CUST-09 | Negative | Khách hàng cố tra cứu hồ sơ khách hàng khác
const { req, randEmail } = require("../helpers");

test("TC-CUST-09 | Negative | Khách hàng cố tra cứu hồ sơ khách hàng khác", async () => {
  const customerA = await req("POST", "/customers/register", {
    body: { fullName: "A", email: randEmail(), password: "123456" },
  });
  const customerB = await req("POST", "/customers/register", {
    body: { fullName: "B", email: randEmail(), password: "123456" },
  });
  const tokenA = customerA.json.data.token;
  const idB = customerB.json.data.customer.id;

  // Token của A (role=customer) không đủ quyền tra cứu theo id — endpoint này chỉ dành ops_staff/ops_admin
  const { status } = await req("GET", `/customers/${idB}`, { token: tokenA });

  expect(status).toBe(403);
});
