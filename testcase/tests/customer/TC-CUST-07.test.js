// TC-CUST-07 | Negative | Gọi API cần xác thực mà không có token
const { req } = require("../helpers");

test("TC-CUST-07 | Negative | Gọi API cần xác thực mà không có token", async () => {
  const { status, json } = await req("GET", "/customers/me"); // không truyền token

  expect(status).toBe(401);
  expect(json.error.code).toBe("UNAUTHORIZED");
});
