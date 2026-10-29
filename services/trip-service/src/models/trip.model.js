const mongoose = require("mongoose");

const geoPointSchema = new mongoose.Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const TRIP_STATUSES = [
  "driver_assigned",
  "arrived",
  "picked_up",
  "in_progress",
  "completed",
];

const DRIVER_TRANSITIONS = {
  driver_assigned: ["arrived"],
  arrived:         ["picked_up"],
  picked_up:       ["in_progress"],
  in_progress:     ["completed"],
};

const tripSchema = new mongoose.Schema(
  {
    _id:             { type: String },
    bookingId:       { type: String, required: true, unique: true },
    driverId:        { type: String, required: true },
    customerId:      { type: String, required: true },
    vehicleType:     { type: String, required: true },
    pickupLocation:  { type: geoPointSchema, required: true },
    dropoffLocation: { type: geoPointSchema, required: true },
    status:          { type: String, enum: TRIP_STATUSES, default: "driver_assigned" },
    estimatedFare:   { type: Number, default: null },
    distanceKm:      { type: Number, default: null },
    durationMin:     { type: Number, default: null },
    actualFare:      { type: Number, default: null },
    startedAt:       { type: Date, default: null },
    completedAt:     { type: Date, default: null },
  },
  {
    timestamps: true,
    toObject: { transform: (doc, ret) => { ret.tripId = ret._id; delete ret._id; delete ret.__v; } },
    toJSON:   { transform: (doc, ret) => { ret.tripId = ret._id; delete ret._id; delete ret.__v; } },
  }
);

const ratingSchema = new mongoose.Schema(
  {
    _id:       { type: String },
    tripId:    { type: String, required: true },
    bookingId: { type: String, required: true, unique: true },
    driverId:  { type: String, required: true },
    customerId:{ type: String, required: true },
    score:     { type: Number, required: true },
    comment:   { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toObject: { transform: (doc, ret) => { ret.ratingId = ret._id; delete ret._id; delete ret.__v; } },
    toJSON:   { transform: (doc, ret) => { ret.ratingId = ret._id; delete ret._id; delete ret.__v; } },
  }
);

const Trip   = mongoose.model("Trip",   tripSchema);
const Rating = mongoose.model("Rating", ratingSchema);

function straightLineDistanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

module.exports = { Trip, Rating, TRIP_STATUSES, DRIVER_TRANSITIONS, straightLineDistanceKm };
