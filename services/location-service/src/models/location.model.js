const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    _id: { type: String }, // driverId là khóa chính
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toObject: {
      transform: (doc, ret) => {
        ret.driverId = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
    toJSON: {
      transform: (doc, ret) => {
        ret.driverId = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const LocationRecord = mongoose.model("LocationRecord", locationSchema);

// Khoảng cách giữa 2 tọa độ (km), công thức Haversine — vẫn là hàm thuần túy, không đổi
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { LocationRecord, distanceKm };