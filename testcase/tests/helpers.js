require("dotenv").config();
const jwt = require("jsonwebtoken");

const BASE = process.env.BASE_URL || "http://localhost:3000/api/v1";
const JWT_SECRET = process.env.JWT_SECRET || "cab-system-super-secret-key-change-me";

// Gọi API qua Gateway, giống cách 1 client thật sẽ gọi.
async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

// Sinh email ngẫu nhiên để mỗi lần chạy test không bị đụng dữ liệu cũ (data.json không tự reset).
function randEmail(prefix = "test") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`;
}

// Sinh JWT cho nhân viên vận hành để test các endpoint ops_staff/ops_admin
// (dự án hiện chưa có Staff Service riêng — xem README của cab-system).
function signStaffToken(role = "ops_admin", id = "staff-test-1") {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "1h" });
}

// Sinh JWT giả lập customer/driver khi test 1 service KHÔNG trực tiếp kiểm tra luồng
// đăng ký/đăng nhập (vd Trip, Payment, Notification, Location) — các service này chỉ
// verify chữ ký JWT + role, không xác minh id có thật trong Customer/Driver Service hay
// không, nên có thể test độc lập mà không cần bật toàn bộ cụm service.
function signCustomerToken(id) {
  return jwt.sign({ id, role: "customer" }, JWT_SECRET, { expiresIn: "1h" });
}
function signDriverToken(id) {
  return jwt.sign({ id, role: "driver" }, JWT_SECRET, { expiresIn: "1h" });
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

module.exports = { req, randEmail, signStaffToken, signCustomerToken, signDriverToken, uuid, BASE };
