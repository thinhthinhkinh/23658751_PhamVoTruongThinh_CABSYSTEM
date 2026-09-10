// TC-CUST-10 | Positive | Ops_staff xem danh sách toàn bộ khách hàng
const { req, randEmail, signStaffToken } = require("../helpers");

test("TC-CUST-10 | Positive | Ops_staff xem danh sách toàn bộ khách hàng", async () => {
  // đảm bảo có ít nhất 1 khách hàng tồn tại
  await req("POST", "/customers/register", { body: { fullName: "A", email: randEmail(), password: "123456" } });

  const staffToken = signStaffToken("ops_staff");
  const { status, json } = await req("GET", "/customers/all", { token: staffToken });

  expect(status).toBe(200);
  expect(Array.isArray(json.data)).toBe(true);
  expect(json.data.length).toBeGreaterThan(0);
  expect(json.data[0].passwordHash).toBeUndefined();
});
