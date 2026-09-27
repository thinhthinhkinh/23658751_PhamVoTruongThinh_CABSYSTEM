const { ResolvedIssue } = require("../models/resolvedIssue.model");

function findByTripId(tripId) {
  return ResolvedIssue.find({ tripId });
}

async function insert(recordData) {
  const record = new ResolvedIssue(recordData);
  await record.save();
  return record;
}

module.exports = { findByTripId, insert };