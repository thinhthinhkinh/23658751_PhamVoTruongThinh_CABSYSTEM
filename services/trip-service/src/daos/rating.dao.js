const { Rating } = require("../models/trip.model");

function findByTripId(tripId) {
  return Rating.findById(tripId);
}

function findByDriverId(driverId) {
  return Rating.find({ driverId });
}

async function insert(ratingData) {
  const rating = new Rating(ratingData);
  await rating.save();
  return rating;
}

module.exports = { findByTripId, findByDriverId, insert };