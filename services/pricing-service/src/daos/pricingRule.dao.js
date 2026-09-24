const path = require("path");
const { readData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/pricingRules.json");

function findAll() {
  return readData(DATA_FILE);
}

function findByVehicleType(vehicleType) {
  return readData(DATA_FILE).find((r) => r.vehicleType === vehicleType) || null;
}

module.exports = { findAll, findByVehicleType };
