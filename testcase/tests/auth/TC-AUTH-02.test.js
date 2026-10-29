// TC-AUTH-02 | Negative | Không có token bị từ chối với 401
// Bảng chấm mục 24: endpoint cần xác thực phải trả 401 khi thiếu Authorization header.
const { req } = require("../helpers");

test("TC-AUTH-02 | Negative | Không có token → 401 Unauthorized", async () => {
  // GET /customers/me không có token
  const { status, json } = await req("GET", "/customers/me");

  expect(status).toBe(401);
  expect(json.error?.code).toBeDefined();
});
