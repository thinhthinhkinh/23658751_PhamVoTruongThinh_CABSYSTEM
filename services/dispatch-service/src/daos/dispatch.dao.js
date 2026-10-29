const { DispatchRecord } = require("../models/dispatch.model");

function findByBookingId(bookingId) {
  return DispatchRecord.findById(bookingId);
}

function findPendingByDriverId(driverId) {
  return DispatchRecord.findOne({
    status: "searching",
    candidates: { $elemMatch: { driverId, status: "offered" } },
  });
}

async function insert({ bookingId, pickupLocation, vehicleType, candidates }) {
  const record = new DispatchRecord({ _id: bookingId, pickupLocation, vehicleType, candidates });
  await record.save();
  return record;
}

function update(bookingId, patch) {
  return DispatchRecord.findByIdAndUpdate(bookingId, patch, { new: true });
}

module.exports = { findByBookingId, findPendingByDriverId, insert, update };
