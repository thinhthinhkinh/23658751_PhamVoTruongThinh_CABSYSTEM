// TC-CUST-05 | Negative | Đăng nhập sai mật khẩu
const { req, randEmail } = require("../helpers");

test("TC-CUST-05 | Negative | Đăng nhập sai mật khẩu", async () => {
  const email = randEmail();
  await req("POST", "/customers/register", { body: { fullName: "A", email, password: "123456" } });

  const { status, json } = await req("POST", "/customers/login", {
    body: { email, password: "sai-mat-khau" },
  });

  expect(status).toBe(401);
  expect(json.error.code).toBe("INVALID_CREDENTIALS");
});
