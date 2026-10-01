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

async function findByCustomerIdPaged(customerId, limit, page) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Trip.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Trip.countDocuments({ customerId }),
  ]);
  return { items, total, page, limit };
}

function findByDriverId(driverId) {
  return Trip.find({ driverId }).sort({ createdAt: -1 });
}

async function findByDriverIdPaged(driverId, limit, page) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Trip.find({ driverId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Trip.countDocuments({ driverId }),
  ]);
  return { items, total, page, limit };
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

module.exports = { findAll, findById, findByCustomerId, findByCustomerIdPaged, findByDriverId, findByDriverIdPaged, findByStatus, insert, update };