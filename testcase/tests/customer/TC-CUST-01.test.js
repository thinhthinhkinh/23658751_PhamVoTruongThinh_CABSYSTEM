// TC-CUST-01 | Positive | Đăng ký tài khoản khách hàng thành công
const { req, randEmail } = require("../helpers");

test("TC-CUST-01 | Positive | Đăng ký tài khoản khách hàng thành công", async () => {
  const email = randEmail();
  const { status, json } = await req("POST", "/customers/register", {
    body: { fullName: "Nguyễn Văn A", email, password: "123456" },
  });

  expect(status).toBe(201);
  expect(json.data.token).toBeDefined();
  expect(json.data.customer.email).toBe(email);
  expect(json.data.customer.fullName).toBe("Nguyễn Văn A");
  expect(json.data.customer.passwordHash).toBeUndefined();
});
