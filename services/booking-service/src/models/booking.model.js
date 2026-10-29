const mongoose = require("mongoose");

const geoPointSchema = new mongoose.Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const BOOKING_STATUSES = [
  "requested",
  "finding_driver",
  "no_driver_found",
  "driver_assigned",
  "cancelled",
];

const CANCELLABLE_STATUSES = ["requested", "finding_driver", "no_driver_found"];

const bookingSchema = new mongoose.Schema(
  {
    _id:             { type: String },
    customerId:      { type: String, required: true },
    driverId:        { type: String, default: null },
    pickupLocation:  { type: geoPointSchema, required: true },
    dropoffLocation: { type: geoPointSchema, required: true },
    vehicleType:     { type: String, required: true },
    status:          { type: String, enum: BOOKING_STATUSES, default: "requested" },
    estimatedFare:   { type: Number, default: null },
  },
  {
    timestamps: true,
    toObject: { transform: (doc, ret) => { ret.bookingId = ret._id; delete ret._id; delete ret.__v; } },
    toJSON:   { transform: (doc, ret) => { ret.bookingId = ret._id; delete ret._id; delete ret.__v; } },
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Booking, BOOKING_STATUSES, CANCELLABLE_STATUSES };
