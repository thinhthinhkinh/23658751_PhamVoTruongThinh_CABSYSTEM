// TC-AUTH-06 | Positive | Logout thu hồi token thành công
// POST /auth/logout với token hợp lệ → auth-service thu hồi session.
//
// LƯU Ý THIẾT KẾ: Token từ /register không có sessionId (customer-service ký trực tiếp
// bằng JWT không qua session), nên không thể revoke. Chỉ token từ /login có sessionId →
// mới bị blacklist sau logout. Test dùng login token để kiểm tra đúng luồng này.
const { req, randEmail } = require("../helpers");

test("TC-AUTH-06 | Positive | Logout (login token) → token bị thu hồi, gọi lại → 401", async () => {
  const email = randEmail("auth06");

  // 1. Đăng ký
  const reg = await req("POST", "/customers/register", {
    body: { fullName: "Logout Test", email, password: "pass123" },
  });
  expect(reg.status).toBe(201);

  // 2. Đăng nhập → token có sessionId
  const login = await req("POST", "/customers/login", {
    body: { email, password: "pass123" },
  });
  expect(login.status).toBe(200);
  const token = login.json.data.token;

  // 3. Verify token còn hiệu lực
  const before = await req("GET", "/customers/me", { token });
  expect(before.status).toBe(200);

  // 4. Logout
  const logout = await req("POST", "/auth/logout", { token });
  expect(logout.status).toBe(200);
  expect(logout.json.data?.revoked).toBe(true);

  // 5. Gọi lại sau logout → 401 (session đã bị revoke)
  const after = await req("GET", "/customers/me", { token });
  expect(after.status).toBe(401);
});
