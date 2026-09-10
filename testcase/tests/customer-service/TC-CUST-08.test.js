// TC-CUST-08 | Positive | Cập nhật thông tin cá nhân
const { req, randEmail } = require("../helpers");

test("TC-CUST-08 | Positive | Cập nhật thông tin cá nhân", async () => {
  const email = randEmail();
  const registerRes = await req("POST", "/customers/register", {
    body: { fullName: "Tên cũ", email, password: "123456" },
  });
  const token = registerRes.json.data.token;

  const { status, json } = await req("PUT", "/customers/me", {
    token,
    body: { fullName: "Tên mới", phone: "0900000009" },
  });

  expect(status).toBe(200);
  expect(json.data.fullName).toBe("Tên mới");
  expect(json.data.phone).toBe("0900000009");
});
