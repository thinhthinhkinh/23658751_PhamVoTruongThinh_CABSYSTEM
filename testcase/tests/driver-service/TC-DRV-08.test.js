// TC-DRV-08 | Positive | Lấy danh sách tài xế đang available (service-to-service)
const { req, randEmail } = require("../helpers");

test("TC-DRV-08 | Positive | Lấy danh sách tài xế đang available (không cần token)", async () => {
  const registerRes = await req("POST", "/drivers/register", {
    body: { fullName: "A", email: randEmail(), password: "123456" },
  });
  const { token, driver } = registerRes.json.data;
  await req("PATCH", "/drivers/me/status", { token, body: { status: "available" } });

  const { status, json } = await req("GET", "/drivers?status=available"); // không cần token

  expect(status).toBe(200);
  expect(Array.isArray(json.data)).toBe(true);
  expect(json.data.some((d) => d.id === driver.id)).toBe(true);
  expect(json.data.every((d) => d.status === "available")).toBe(true);
  expect(json.data[0].passwordHash).toBeUndefined();
});
