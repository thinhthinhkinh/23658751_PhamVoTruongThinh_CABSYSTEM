const { ResolvedIssue } = require("../models/resolvedIssue.model");

function findByBookingId(bookingId) {
  return ResolvedIssue.find({ bookingId });
}

async function insert(recordData) {
  const record = new ResolvedIssue(recordData);
  await record.save();
  return record;
}

module.exports = { findByBookingId, insert };
