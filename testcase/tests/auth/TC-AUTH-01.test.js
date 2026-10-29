// TC-AUTH-01 | Positive | Token hợp lệ được chấp nhận bởi gateway
// Bảng chấm mục 24: JWT middleware ở gateway phải xác thực đúng.
// Chiến lược: đăng ký customer thật → gọi GET /customers/me với token đó → 200.
// Nếu gateway từ chối token hợp lệ → 401, test fail.
const { req, randEmail } = require("../helpers");

test("TC-AUTH-01 | Positive | Token hợp lệ được gateway chấp nhận", async () => {
  const email = randEmail("auth01");
  const reg = await req("POST", "/customers/register", {
    body: { fullName: "Auth Test User", email, password: "pass1234" },
  });
  expect(reg.status).toBe(201);
  const token = reg.json.data.token;

  const { status, json } = await req("GET", "/customers/me", { token });

  expect(status).toBe(200);
  expect(json.data.email).toBe(email);
});
