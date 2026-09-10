// TC-CUST-02 | Negative | Đăng ký với email đã tồn tại
const { req, randEmail } = require("../helpers");

test("TC-CUST-02 | Negative | Đăng ký với email đã tồn tại", async () => {
  const email = randEmail();
  await req("POST", "/customers/register", { body: { fullName: "A", email, password: "123456" } });

  const { status, json } = await req("POST", "/customers/register", {
    body: { fullName: "B", email, password: "654321" },
  });

  expect(status).toBe(409);
  expect(json.error.code).toBe("EMAIL_TAKEN");
});
