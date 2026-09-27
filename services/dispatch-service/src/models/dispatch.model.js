const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    driverId: { type: String, required: true },
    distanceKm: { type: Number, required: true },
    status: { type: String, enum: ["waiting", "offered", "accepted", "declined", "timeout"], default: "waiting" },
    offeredAt: { type: Date, default: null },
  },
  { _id: false }
);

const geoPointSchema = new mongoose.Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const dispatchSchema = new mongoose.Schema(
  {
    _id: { type: String }, // tripId là khóa chính
    pickupLocation: { type: geoPointSchema, required: true },
    vehicleType: { type: String, required: true },
    candidates: { type: [candidateSchema], default: [] },
    status: { type: String, enum: ["searching", "assigned", "no_driver_found"], default: "searching" },
    assignedDriverId: { type: String, default: null },
  },
  {
    timestamps: true,
    toObject: {
      transform: (doc, ret) => {
        ret.tripId = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
    toJSON: {
      transform: (doc, ret) => {
        ret.tripId = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const DispatchRecord = mongoose.model("DispatchRecord", dispatchSchema);

function estimateEtaMinutes(distanceKm, avgSpeedKmH = 30) {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmH) * 60));
}

module.exports = { DispatchRecord, estimateEtaMinutes };