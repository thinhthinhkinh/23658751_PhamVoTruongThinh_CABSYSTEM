// TC-DRV-06 | Positive | Tài xế chuyển sang sẵn sàng nhận chuyến
const { req, randEmail } = require("../helpers");

test("TC-DRV-06 | Positive | Tài xế chuyển sang sẵn sàng nhận chuyến", async () => {
  const registerRes = await req("POST", "/drivers/register", {
    body: { fullName: "A", email: randEmail(), password: "123456" },
  });
  const token = registerRes.json.data.token;

  const { status, json } = await req("PATCH", "/drivers/me/status", { token, body: { status: "available" } });

  expect(status).toBe(200);
  expect(json.data.status).toBe("available");
});
