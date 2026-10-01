// TC-GATE-02 | Negative | JWT bị sửa payload (tampering) không được chấp nhận
// Bảng chấm thực hành, mục 27: attacker lấy 1 token hợp lệ (role customer), tự sửa phần
// payload (đổi role thành ops_admin) rồi gọi 1 API chỉ dành cho ops_admin.
//
// Hai kiểu tamper được test, cùng một lỗ hổng (không kiểm chữ ký) nhưng hai cách khai thác
// khác nhau nên gộp chung 1 file cho gọn:
//   1. Sửa payload, GIỮ NGUYÊN chữ ký cũ (chữ ký không còn khớp nội dung) — kiểu tấn công JWT
//      tampering kinh điển nhất.
//   2. Ký lại bằng một secret bất kỳ mà attacker tự đoán (không phải JWT_SECRET thật).
//
// GIẢ ĐỊNH CẦN ĐỐI CHIẾU: dùng GET /admin/customers làm endpoint chỉ-ops_admin đại diện
// (theo README, mục 5: các endpoint /admin/* cần token ops_admin/ops_staff) — đổi lại nếu
// route thật khác.
const jwt = require("jsonwebtoken");
const { req, signCustomerToken, uuid } = require("../helpers");

function tamperKeepOldSignature(validToken, patch) {
  const [headerB64, payloadB64, signature] = validToken.split(".");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  const tamperedPayload = { ...payload, ...patch };
  const tamperedPayloadB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url");
  return `${headerB64}.${tamperedPayloadB64}.${signature}`; // chữ ký cũ, không khớp payload mới
}

test("TC-GATE-02 | Negative | JWT sửa payload, giữ chữ ký cũ, không được chấp nhận", async () => {
  const validToken = signCustomerToken(uuid());
  const tamperedToken = tamperKeepOldSignature(validToken, { role: "ops_admin", sub: "admin_001" });

  const { status } = await req("GET", "/admin/customers", { token: tamperedToken });

  expect(status).toBe(401);
});

test("TC-GATE-02b | Negative | JWT ký lại bằng secret bị đoán sai không được chấp nhận", async () => {
  const guessedToken = jwt.sign({ id: "admin_001", role: "ops_admin" }, "mot-secret-attacker-doan-bua", {
    expiresIn: "1h",
  });

  const { status } = await req("GET", "/admin/customers", { token: guessedToken });

  expect(status).toBe(401);
});
