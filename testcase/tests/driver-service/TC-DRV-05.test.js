// TC-DRV-05 | Negative | Cập nhật trạng thái tài xế với giá trị không hợp lệ
const { req, randEmail } = require("../helpers");

test("TC-DRV-05 | Negative | Cập nhật trạng thái tài xế với giá trị không hợp lệ", async () => {
  const registerRes = await req("POST", "/drivers/register", {
    body: { fullName: "A", email: randEmail(), password: "123456" },
  });
  const token = registerRes.json.data.token;

  const { status, json } = await req("PATCH", "/drivers/me/status", {
    token,
    body: { status: "dang_lam_viec" },
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("INVALID_STATUS");
});
