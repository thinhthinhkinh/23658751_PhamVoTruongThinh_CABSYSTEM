// TC-AUTH-03 | Negative | Token sai chữ ký (ký bằng secret khác) bị từ chối → 401
// Bảng chấm mục 24, 27: gateway phải từ chối token không được ký bằng JWT_SECRET thật.
const jwt = require("jsonwebtoken");
const { req, uuid } = require("../helpers");

test("TC-AUTH-03 | Negative | Token ký sai secret → 401", async () => {
  const fakeToken = jwt.sign(
    { id: uuid(), role: "customer" },
    "mot-secret-gia-mao-khong-dung",
    { expiresIn: "1h" }
  );

  const { status } = await req("GET", "/customers/me", { token: fakeToken });

  expect(status).toBe(401);
});
