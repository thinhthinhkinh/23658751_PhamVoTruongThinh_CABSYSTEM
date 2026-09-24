const repo = require("../repositories/customer.repository");
const { toPublicJSON } = require("../models/customer.model");
const { signToken } = require("../utils/jwt.util");
const { ok } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// POST /customers/register — FR-01
const register = asyncHandler(async (req, res) => {
  const customer = repo.register(req.body);
  const token = signToken({ id: customer.id, role: "customer" });
  return ok(res, { token, customer: toPublicJSON(customer) }, 201);
});

// POST /customers/login — FR-01
const login = asyncHandler(async (req, res) => {
  const customer = repo.login(req.body);
  const token = signToken({ id: customer.id, role: "customer" });
  return ok(res, { token, customer: toPublicJSON(customer) });
});

// GET /customers/me — FR-01
const getMe = asyncHandler(async (req, res) => {
  const customer = repo.getById(req.user.id);
  return ok(res, toPublicJSON(customer));
});

// PUT /customers/me — FR-01
const updateMe = asyncHandler(async (req, res) => {
  const updated = repo.updateProfile(req.user.id, req.body);
  return ok(res, toPublicJSON(updated));
});

// GET /customers/:id — tra cứu nội bộ (ops_staff, hoặc service-to-service)
const getById = asyncHandler(async (req, res) => {
  const customer = repo.getById(req.params.id);
  return ok(res, toPublicJSON(customer));
});

// GET /customers/all — FR-20 (ops_staff xem danh sách)
const listAll = asyncHandler(async (req, res) => {
  const customers = repo.listAll().map(toPublicJSON);
  return res.status(200).json({ data: customers });
});

// PATCH /customers/:id/disable — FR-22 (ops_admin, thao tác nhạy cảm)
const disable = asyncHandler(async (req, res) => {
  const updated = repo.disable(req.params.id);
  return ok(res, toPublicJSON(updated));
});

module.exports = { register, login, getMe, updateMe, getById, listAll, disable };
