// Script tiện ích cho demo: ký JWT cho nhân viên vận hành (ops_staff/ops_admin).
// Lưu ý: dự án hiện CHƯA có "Staff/Ops Service" quản lý tài khoản nhân viên —
// đây là điểm cần bổ sung nếu triển khai thật (đăng ký/đăng nhập nhân viên vận hành
// giống Customer/Driver Service). Script này chỉ để test nhanh các endpoint ops_*.
require("dotenv").config();
const jwt = require("jsonwebtoken");

const role = process.argv[2] || "ops_admin";
const id = process.argv[3] || "staff-demo-1";
const secret = process.env.JWT_SECRET || "dev-secret-change-me";

const token = jwt.sign({ id, role }, secret, { expiresIn: "7d" });
console.log(token);
