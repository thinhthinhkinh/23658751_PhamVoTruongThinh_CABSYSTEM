const { FareCache } = require("../models/payment.model");

function findByTripId(tripId) {
  return FareCache.findById(tripId);
}

function upsert(tripId, amount) {
  return FareCache.findOneAndUpdate(
    { _id: tripId },
    { amount, cachedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = { findByTripId, upsert };