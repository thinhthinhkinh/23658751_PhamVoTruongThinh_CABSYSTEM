const repo = require("../repositories/driver.repository");
const { toPublicJSON } = require("../models/driver.model");
const { signToken } = require("../utils/jwt.util");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const registerSelf = asyncHandler(async (req, res) => {
  const driver = await repo.register(req.body, false);
  const token = signToken({ id: driver.id, role: "driver" });
  return ok(res, { token, driver: toPublicJSON(driver) }, 201);
});

const createByStaff = asyncHandler(async (req, res) => {
  const driver = await repo.register(req.body, true);
  return ok(res, toPublicJSON(driver), 201);
});

const login = asyncHandler(async (req, res) => {
  const driver = await repo.login(req.body);
  const token = signToken({ id: driver.id, role: "driver" });
  return ok(res, { token, driver: toPublicJSON(driver) });
});

const getMe = asyncHandler(async (req, res) => {
  const driver = await repo.getById(req.user.id);
  return ok(res, toPublicJSON(driver));
});

const updateMe = asyncHandler(async (req, res) => {
  const updated = await repo.updateProfile(req.user.id, req.body);
  return ok(res, toPublicJSON(updated));
});

const updateVehicle = asyncHandler(async (req, res) => {
  const updated = await repo.updateVehicle(req.user.id, req.body);
  return ok(res, toPublicJSON(updated));
});

const updateStatus = asyncHandler(async (req, res) => {
  const updated = await repo.updateStatus(req.user.id, req.body.status);
  return ok(res, toPublicJSON(updated));
});

const getById = asyncHandler(async (req, res) => {
  const driver = await repo.getById(req.params.id);
  return ok(res, toPublicJSON(driver));
});

const listByStatus = asyncHandler(async (req, res) => {
  const drivers = req.query.status === "available" ? await repo.listAvailable() : [];
  return okList(res, drivers.map(toPublicJSON));
});

const listAll = asyncHandler(async (req, res) => {
  const drivers = await repo.listAll();
  return okList(res, drivers.map(toPublicJSON));
});

const disable = asyncHandler(async (req, res) => {
  const updated = await repo.disable(req.params.id);
  return ok(res, toPublicJSON(updated));
});

const onDriverAssigned = asyncHandler(async (req, res) => {
  const { driverId } = req.body.payload || {};
  if (driverId) await repo.updateStatus(driverId, "busy");
  return res.status(200).json({ received: true });
});

// FR-22: Admin duyệt / từ chối hồ sơ tài xế
const approveDriver = asyncHandler(async (req, res) => {
  const updated = await repo.setApprovalStatus(req.params.id, "approved");
  return ok(res, toPublicJSON(updated));
});

const rejectDriver = asyncHandler(async (req, res) => {
  const updated = await repo.setApprovalStatus(req.params.id, "rejected");
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
  approveDriver,
  rejectDriver,
  onDriverAssigned,
};