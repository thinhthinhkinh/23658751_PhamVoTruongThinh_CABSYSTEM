const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/driver.dao");
const { hashPassword, verifyPassword } = require("../utils/hash.util");
const AppError = require("../utils/AppError");

const VALID_STATUSES = ["offline", "available", "busy"];

async function register({ fullName, email, password, phone, vehicle }, createdByStaff = false) {
  if (!fullName || !email || !password) {
    throw new AppError(400, "INVALID_INPUT", "fullName, email, password là bắt buộc");
  }
  if (await dao.findByEmail(email)) {
    throw new AppError(409, "EMAIL_TAKEN", "Email đã được đăng ký");
  }
  return dao.insert({
    _id: uuidv4(),
    fullName,
    email,
    passwordHash: hashPassword(password),
    phone: phone || null,
    vehicle: vehicle || null,
    createdByStaff: !!createdByStaff,
    // Tài xế tự đăng ký → chờ duyệt; staff tạo → duyệt thẳng (FR-21/22)
    approvalStatus: createdByStaff ? "approved" : "pending_approval",
  });
}

async function login({ email, password }) {
  const driver = await dao.findByEmail(email);
  if (!driver || !verifyPassword(password, driver.passwordHash)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
  }
  if (driver.active === false) {
    throw new AppError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa");
  }
  return driver;
}

async function getById(id) {
  const driver = await dao.findById(id);
  if (!driver) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return driver;
}

async function updateProfile(id, patch) {
  const allowed = ["fullName", "phone"];
  const safePatch = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }
  const updated = await dao.update(id, safePatch);
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

async function updateVehicle(id, vehicle) {
  if (!vehicle || !vehicle.plate || !vehicle.model || !vehicle.type) {
    throw new AppError(400, "INVALID_INPUT", "vehicle cần có plate, model, type");
  }
  const updated = await dao.update(id, { vehicle });
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

async function updateStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(400, "INVALID_STATUS", `status phải thuộc [${VALID_STATUSES.join(", ")}]`);
  }
  const updated = await dao.update(id, { status });
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

async function listAvailable() {
  return dao.findByStatus("available");
}

async function listAll() {
  return dao.findAll();
}

async function disable(id) {
  const updated = await dao.update(id, { active: false });
  if (!updated) throw new AppError(404, "DRIVER_NOT_FOUND", "Không tìm thấy tài xế");
  return updated;
}

// FR-22: Admin duyệt hoặc từ chối hồ sơ tài xế
async function setApprovalStatus(id, approvalStatus) {
  if (!["approved", "rejected"].includes(approvalStatus)) {
    throw new AppError(400, "INVALID_INPUT", "approvalStatus phải là 'approved' hoặc 'rejected'");
  }
  const updated = await dao.update(id, { approvalStatus });
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
  setApprovalStatus,
};