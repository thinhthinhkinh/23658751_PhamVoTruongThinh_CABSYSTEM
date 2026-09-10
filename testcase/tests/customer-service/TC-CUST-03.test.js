// TC-CUST-03 | Negative | Đăng ký thiếu trường bắt buộc (thiếu password)
const { req, randEmail } = require("../helpers");

test("TC-CUST-03 | Negative | Đăng ký thiếu trường bắt buộc (thiếu password)", async () => {
  const { status, json } = await req("POST", "/customers/register", {
    body: { fullName: "A", email: randEmail() }, // cố tình thiếu password
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("INVALID_INPUT");
});
