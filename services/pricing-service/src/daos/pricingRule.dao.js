const { PricingRule } = require("../models/pricingRule.model");

function findAll() {
  return PricingRule.find({});
}

function findByVehicleType(vehicleType) {
  return PricingRule.findById(vehicleType);
}

module.exports = { findAll, findByVehicleType };