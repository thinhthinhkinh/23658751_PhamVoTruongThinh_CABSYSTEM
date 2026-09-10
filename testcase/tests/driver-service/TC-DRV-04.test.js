// TC-DRV-04 | Negative | Khách hàng cố tạo tài khoản tài xế
const { req, randEmail, signCustomerToken, uuid } = require("../helpers");

test("TC-DRV-04 | Negative | Khách hàng cố tạo tài khoản tài xế", async () => {
  const customerToken = signCustomerToken(uuid());
  const { status } = await req("POST", "/drivers", {
    token: customerToken,
    body: { fullName: "X", email: randEmail(), password: "123456" },
  });

  expect(status).toBe(403);
});
