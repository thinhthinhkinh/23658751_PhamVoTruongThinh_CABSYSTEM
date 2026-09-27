const { Trip } = require("../models/trip.model");

function findAll() {
  return Trip.find({});
}

function findById(id) {
  return Trip.findById(id);
}

function findByCustomerId(customerId) {
  return Trip.find({ customerId }).sort({ createdAt: -1 });
}

function findByDriverId(driverId) {
  return Trip.find({ driverId }).sort({ createdAt: -1 });
}

function findByStatus(status) {
  return Trip.find({ status });
}

async function insert(tripData) {
  const trip = new Trip(tripData);
  await trip.save();
  return trip;
}

function update(id, patch) {
  return Trip.findByIdAndUpdate(id, patch, { new: true });
}

module.exports = { findAll, findById, findByCustomerId, findByDriverId, findByStatus, insert, update };