const { Payment } = require("../models/payment.model");

function findAll() {
  return Payment.find({});
}

function findById(id) {
  return Payment.findById(id);
}

function findByTripId(tripId) {
  return Payment.findOne({ tripId });
}

function findByCustomerTripIds(tripIds) {
  return Payment.find({ tripId: { $in: tripIds } });
}

async function insert(paymentData) {
  const payment = new Payment(paymentData);
  await payment.save();
  return payment;
}

function update(id, patch) {
  return Payment.findByIdAndUpdate(id, patch, { new: true });
}

module.exports = { findAll, findById, findByTripId, findByCustomerTripIds, insert, update };