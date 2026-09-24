const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/driver.dao");
const { createDriver } = require("../models/driver.model");
const { hashPassword, verifyPassword } = require("../utils/hash.util");
const AppError = require("../utils/AppError");

const VALID_STATUSES = ["offline", "available", "busy"];

function register({ fullName, email, password, phone, vehicle }, createdByStaff = false) {
  if (!fullName || !email || !password) {
    throw new AppError(400, "INVALID_INPUT", "fullName, email, password là bắt buộc");
  }
  if (dao.findByEmail(email)) {
    throw new AppError(409, "EMAIL_TAKEN", "Email đã được đăng ký");
  }
  const driver = createDriver({
    id: uuidv4(),
    fullName,
    email,
    passwordHash: hashPassword(password),
    phone,
    vehicle,
    createdByStaff,
  });
  return dao.insert(driver);
}

function login({ email, password }) {
  const driver = dao.findByEmail(email);
  if (!driver || !verifyPassword(password, driver.passwordHash)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
  }
  if (driver.active === false) {
    throw new AppError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa");
  }
  return driver;
}

function getById(id) {
  const driver = dao.findById(id);
  if (!driver) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return driver;
}

function updateProfile(id, patch) {
  const allowed = ["fullName", "phone"];
  const safePatch = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }
  const updated = dao.update(id, safePatch);
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

function updateVehicle(id, vehicle) {
  if (!vehicle || !vehicle.plate || !vehicle.model || !vehicle.type) {
    throw new AppError(400, "INVALID_INPUT", "vehicle cần có plate, model, type");
  }
  const updated = dao.update(id, { vehicle });
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

// FR-11: tài xế chuyển trạng thái sẵn sàng nhận chuyến khi đang làm việc
function updateStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(400, "INVALID_STATUS", `status phải thuộc [${VALID_STATUSES.join(", ")}]`);
  }
  const updated = dao.update(id, { status });
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

function listAvailable() {
  return dao.findByStatus("available");
}

// FR-20: quản trị — danh sách toàn bộ tài xế
function listAll() {
  return dao.findAll();
}

// FR-22: thao tác nhạy cảm — khóa tài khoản tài xế, chỉ ops_admin
function disable(id) {
  const updated = dao.update(id, { active: false });
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

module.exports = {
  register,
  login,
  getById,
  updateProfile,
  updateVehicle,
  updateStatus,
  listAvailable,
  listAll,
  disable,
};
