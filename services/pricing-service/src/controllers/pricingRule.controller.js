const repo = require("../repositories/pricingRule.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// POST /pricing/calculate — FR-14 (service-to-service, Trip/Pricing flow gọi)
const calculate = asyncHandler(async (req, res) => {
  const result = repo.calculateFare(req.body);
  return ok(res, result);
});

// GET /pricing/rules — FR-14 (ops_admin xem cấu hình)
const getRules = asyncHandler(async (req, res) => {
  return okList(res, repo.getRules());
});

module.exports = { calculate, getRules };
