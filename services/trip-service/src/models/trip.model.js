const mongoose = require("mongoose");

const geoPointSchema = new mongoose.Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const STATUSES = [
  "requested",
  "finding_driver",
  "no_driver_found",
  "driver_assigned",
  "arrived",
  "picked_up",
  "in_progress",
  "completed",
  "cancelled",
];

const DRIVER_TRANSITIONS = {
  driver_assigned: ["arrived"],
  arrived: ["picked_up"],
  picked_up: ["in_progress"],
  in_progress: ["completed"],
};

const CANCELLABLE_STATUSES = ["requested", "finding_driver", "driver_assigned"];

const tripSchema = new mongoose.Schema(
  {
    _id: { type: String },
    customerId: { type: String, required: true },
    driverId: { type: String, default: null },
    pickupLocation: { type: geoPointSchema, required: true },
    dropoffLocation: { type: geoPointSchema, required: true },
    vehicleType: { type: String, required: true },
    status: { type: String, enum: STATUSES, default: "requested" },
    distanceKm: { type: Number, default: null },
    durationMin: { type: Number, default: null },
    fareAmount: { type: Number, default: null },
  },
  {
    timestamps: true,
    toObject: { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; } },
    toJSON: { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; } },
  }
);

// Rating dùng chính tripId làm _id — đúng bất biến nghiệp vụ "mỗi chuyến chỉ 1 đánh giá"
const ratingSchema = new mongoose.Schema(
  {
    _id: { type: String },
    driverId: { type: String, required: true },
    customerId: { type: String, required: true },
    score: { type: Number, required: true },
    comment: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toObject: { transform: (doc, ret) => { ret.tripId = ret._id; delete ret._id; delete ret.__v; } },
    toJSON: { transform: (doc, ret) => { ret.tripId = ret._id; delete ret._id; delete ret.__v; } },
  }
);

const Trip = mongoose.model("Trip", tripSchema);
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

module.exports = {
  Trip,
  Rating,
  STATUSES,
  DRIVER_TRANSITIONS,
  CANCELLABLE_STATUSES,
  straightLineDistanceKm,
};