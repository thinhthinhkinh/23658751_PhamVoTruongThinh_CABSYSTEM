const { Driver } = require("../models/driver.model");

function findAll() {
  return Driver.find({});
}

function findById(id) {
  return Driver.findById(id);
}

function findByEmail(email) {
  return Driver.findOne({ email });
}

function findByStatus(status) {
  return Driver.find({ status });
}

async function insert(driverData) {
  const driver = new Driver(driverData);
  await driver.save();
  return driver;
}

function update(id, patch) {
  return Driver.findByIdAndUpdate(id, patch, { new: true });
}

module.exports = { findAll, findById, findByEmail, findByStatus, insert, update };