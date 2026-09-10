// TC-CUST-04 | Positive | Đăng nhập đúng thông tin
const { req, randEmail } = require("../helpers");

test("TC-CUST-04 | Positive | Đăng nhập đúng thông tin", async () => {
  const email = randEmail();
  const password = "123456";
  await req("POST", "/customers/register", { body: { fullName: "A", email, password } });

  const { status, json } = await req("POST", "/customers/login", { body: { email, password } });

  expect(status).toBe(200);
  expect(json.data.token).toBeDefined();
  expect(json.data.customer.email).toBe(email);
});
