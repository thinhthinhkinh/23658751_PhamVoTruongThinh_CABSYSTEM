// TC-DRV-07 | Negative | Cập nhật phương tiện thiếu trường bắt buộc
const { req, randEmail } = require("../helpers");

test("TC-DRV-07 | Negative | Cập nhật phương tiện thiếu trường bắt buộc (thiếu type)", async () => {
  const registerRes = await req("POST", "/drivers/register", {
    body: { fullName: "A", email: randEmail(), password: "123456" },
  });
  const token = registerRes.json.data.token;

  const { status, json } = await req("PUT", "/drivers/me/vehicle", {
    token,
    body: { plate: "51H-1.11", model: "Vios" }, // thiếu type
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("INVALID_INPUT");
});
