const repo = require("../repositories/driver.repository");
const { toPublicJSON } = require("../models/driver.model");
const { signToken } = require("../utils/jwt.util");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// POST /drivers/register — tài xế tự đăng ký (FR-02)
const registerSelf = asyncHandler(async (req, res) => {
  const driver = repo.register(req.body, false);
  const token = signToken({ id: driver.id, role: "driver" });
  return ok(res, { token, driver: toPublicJSON(driver) }, 201);
});

// POST /drivers — nhân viên vận hành tạo tài khoản tài xế (FR-02)
const createByStaff = asyncHandler(async (req, res) => {
  const driver = repo.register(req.body, true);
  return ok(res, toPublicJSON(driver), 201);
});

// POST /drivers/login — FR-02
const login = asyncHandler(async (req, res) => {
  const driver = repo.login(req.body);
  const token = signToken({ id: driver.id, role: "driver" });
  return ok(res, { token, driver: toPublicJSON(driver) });
});

// GET /drivers/me — FR-02
const getMe = asyncHandler(async (req, res) => {
  const driver = repo.getById(req.user.id);
  return ok(res, toPublicJSON(driver));
});

// PUT /drivers/me — FR-02
const updateMe = asyncHandler(async (req, res) => {
  const updated = repo.updateProfile(req.user.id, req.body);
  return ok(res, toPublicJSON(updated));
});

// PUT /drivers/me/vehicle — FR-02
const updateVehicle = asyncHandler(async (req, res) => {
  const updated = repo.updateVehicle(req.user.id, req.body);
  return ok(res, toPublicJSON(updated));
});

// PATCH /drivers/me/status — FR-11
const updateStatus = asyncHandler(async (req, res) => {
  const updated = repo.updateStatus(req.user.id, req.body.status);
  return ok(res, toPublicJSON(updated));
});

// GET /drivers/:id — tra cứu nội bộ
const getById = asyncHandler(async (req, res) => {
  const driver = repo.getById(req.params.id);
  return ok(res, toPublicJSON(driver));
});

// GET /drivers?status=available — service-to-service (Dispatch/Location dùng)
const listByStatus = asyncHandler(async (req, res) => {
  const drivers = req.query.status === "available" ? repo.listAvailable() : [];
  return okList(res, drivers.map(toPublicJSON));
});

// GET /drivers/all — FR-20 (ops_staff xem toàn bộ danh sách, kể cả /admin/vehicles dùng)
const listAll = asyncHandler(async (req, res) => {
  return okList(res, repo.listAll().map(toPublicJSON));
});

// PATCH /drivers/:id/disable — FR-22 (ops_admin, thao tác nhạy cảm)
const disable = asyncHandler(async (req, res) => {
  const updated = repo.disable(req.params.id);
  return ok(res, toPublicJSON(updated));
});

module.exports = {
  registerSelf,
  createByStaff,
  login,
  getMe,
  updateMe,
  updateVehicle,
  updateStatus,
  getById,
  listByStatus,
  listAll,
  disable,
};
