// TC-DRV-02 | Negative | Đăng ký tài xế trùng email
const { req, randEmail } = require("../helpers");

test("TC-DRV-02 | Negative | Đăng ký tài xế trùng email", async () => {
  const email = randEmail();
  await req("POST", "/drivers/register", { body: { fullName: "A", email, password: "123456" } });

  const { status, json } = await req("POST", "/drivers/register", { body: { fullName: "B", email, password: "654321" } });

  expect(status).toBe(409);
  expect(json.error.code).toBe("EMAIL_TAKEN");
});
