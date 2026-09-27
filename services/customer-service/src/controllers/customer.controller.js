const repo = require("../repositories/customer.repository");
const { toPublicJSON } = require("../models/customer.model");
const { signToken } = require("../utils/jwt.util");
const { ok } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const register = asyncHandler(async (req, res) => {
  const customer = await repo.register(req.body);
  const token = signToken({ id: customer.id, role: "customer" });
  return ok(res, { token, customer: toPublicJSON(customer) }, 201);
});

const login = asyncHandler(async (req, res) => {
  const customer = await repo.login(req.body);
  const token = signToken({ id: customer.id, role: "customer" });
  return ok(res, { token, customer: toPublicJSON(customer) });
});

const getMe = asyncHandler(async (req, res) => {
  const customer = await repo.getById(req.user.id);
  return ok(res, toPublicJSON(customer));
});

const updateMe = asyncHandler(async (req, res) => {
  const updated = await repo.updateProfile(req.user.id, req.body);
  return ok(res, toPublicJSON(updated));
});

const getById = asyncHandler(async (req, res) => {
  const customer = await repo.getById(req.params.id);
  return ok(res, toPublicJSON(customer));
});

const listAll = asyncHandler(async (req, res) => {
  const customers = await repo.listAll();
  return res.status(200).json({ data: customers.map(toPublicJSON) });
});

const disable = asyncHandler(async (req, res) => {
  const updated = await repo.disable(req.params.id);
  return ok(res, toPublicJSON(updated));
});

module.exports = { register, login, getMe, updateMe, getById, listAll, disable };