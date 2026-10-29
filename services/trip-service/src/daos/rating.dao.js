const { Rating } = require("../models/trip.model");

function findByBookingId(bookingId) {
  return Rating.findOne({ bookingId });
}

function findByDriverId(driverId) {
  return Rating.find({ driverId });
}

async function insert(ratingData) {
  const rating = new Rating(ratingData);
  await rating.save();
  return rating;
}

module.exports = { findByBookingId, findByDriverId, insert };
