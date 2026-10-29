// TC-AUTH-04 | Negative | Token dạng rác (không phải JWT) bị từ chối → 401
// Kiểm tra gateway không bị crash hay bỏ qua khi nhận Authorization header hoàn toàn vô nghĩa.
const { req } = require("../helpers");

test("TC-AUTH-04 | Negative | Token dạng rác → 401", async () => {
  const { status } = await req("GET", "/customers/me", {
    token: "naytokensainhung.khongphaijwt.cacat",
  });

  expect(status).toBe(401);
});
