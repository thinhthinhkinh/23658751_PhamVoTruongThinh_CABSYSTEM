const repo = require("../repositories/pricingRule.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const calculate = asyncHandler(async (req, res) => {
  const result = await repo.calculateFare(req.body);
  return ok(res, result);
});

const getRules = asyncHandler(async (req, res) => {
  const rules = await repo.getRules();
  return okList(res, rules);
});

module.exports = { calculate, getRules };