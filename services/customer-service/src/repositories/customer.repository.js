const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/customer.dao");
const { createCustomer } = require("../models/customer.model");
const { hashPassword, verifyPassword } = require("../utils/hash.util");
const AppError = require("../utils/AppError");

function register({ fullName, email, password, phone }) {
  if (!fullName || !email || !password) {
    throw new AppError(400, "INVALID_INPUT", "fullName, email, password là bắt buộc");
  }
  if (dao.findByEmail(email)) {
    throw new AppError(409, "EMAIL_TAKEN", "Email đã được đăng ký");
  }
  const customer = createCustomer({
    id: uuidv4(),
    fullName,
    email,
    passwordHash: hashPassword(password),
    phone,
  });
  return dao.insert(customer);
}

function login({ email, password }) {
  const customer = dao.findByEmail(email);
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
  }
  if (customer.active === false) {
    throw new AppError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa");
  }
  return customer;
}

function getById(id) {
  const customer = dao.findById(id);
  if (!customer) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng");
  return customer;
}

function updateProfile(id, patch) {
  const allowed = ["fullName", "phone"];
  const safePatch = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }
  const updated = dao.update(id, safePatch);
  if (!updated) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng");
  return updated;
}

// FR-20: quản trị — danh sách toàn bộ khách hàng
function listAll() {
  return dao.findAll();
}

// FR-22: thao tác nhạy cảm — khóa tài khoản khách hàng, chỉ ops_admin
function disable(id) {
  const updated = dao.update(id, { active: false });
  if (!updated) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng");
  return updated;
}

module.exports = { register, login, getById, updateProfile, listAll, disable };
