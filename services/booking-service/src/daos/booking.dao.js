const { Booking } = require("../models/booking.model");

function findAll() {
  return Booking.find({});
}

function findById(id) {
  return Booking.findById(id);
}

function findByCustomerId(customerId) {
  return Booking.find({ customerId }).sort({ createdAt: -1 });
}

async function findByCustomerIdPaged(customerId, limit, page) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Booking.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments({ customerId }),
  ]);
  return { items, total, page, limit };
}

function findByStatus(status) {
  return Booking.find({ status });
}

async function insert(bookingData) {
  const booking = new Booking(bookingData);
  await booking.save();
  return booking;
}

function update(id, patch) {
  return Booking.findByIdAndUpdate(id, patch, { new: true });
}

function updateIfStatus(id, statusCondition, patch) {
  const query = Array.isArray(statusCondition)
    ? { _id: id, status: { $in: statusCondition } }
    : { _id: id, status: statusCondition };
  return Booking.findOneAndUpdate(query, { $set: patch }, { new: true });
}

module.exports = {
  findAll,
  findById,
  findByCustomerId,
  findByCustomerIdPaged,
  findByStatus,
  insert,
  update,
  updateIfStatus,
};
