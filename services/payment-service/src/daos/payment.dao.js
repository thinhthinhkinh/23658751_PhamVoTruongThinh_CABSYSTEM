const { Payment } = require("../models/payment.model");

function findAll() {
  return Payment.find({});
}

function findById(id) {
  return Payment.findById(id);
}

function findByBookingId(bookingId) {
  return Payment.findOne({ bookingId });
}

function findByCustomerBookingIds(bookingIds) {
  return Payment.find({ bookingId: { $in: bookingIds } });
}

async function insert(paymentData) {
  const payment = new Payment(paymentData);
  await payment.save();
  return payment;
}

function update(id, patch) {
  return Payment.findByIdAndUpdate(id, patch, { new: true });
}

module.exports = { findAll, findById, findByBookingId, findByCustomerBookingIds, insert, update };
