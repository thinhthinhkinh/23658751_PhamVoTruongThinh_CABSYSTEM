const { DispatchRecord } = require("../models/dispatch.model");

function findByTripId(tripId) {
  return DispatchRecord.findById(tripId);
}

function findPendingByDriverId(driverId) {
  return DispatchRecord.findOne({
    status: "searching",
    candidates: { $elemMatch: { driverId, status: "offered" } },
  });
}

async function insert({ tripId, pickupLocation, vehicleType, candidates }) {
  const record = new DispatchRecord({ _id: tripId, pickupLocation, vehicleType, candidates });
  await record.save();
  return record;
}

function update(tripId, patch) {
  return DispatchRecord.findByIdAndUpdate(tripId, patch, { new: true });
}

module.exports = { findByTripId, findPendingByDriverId, insert, update };