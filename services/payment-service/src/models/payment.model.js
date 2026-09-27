const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    _id: { type: String },
    tripId: { type: String, required: true, unique: true },
    method: { type: String, enum: ["cash", "e-wallet", "card"], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    providerRef: { type: String, default: null },
    failReason: { type: String, default: null },
  },
  {
    timestamps: true,
    toObject: { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; } },
    toJSON: { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; } },
  }
);

// FareCache dùng chính tripId làm _id, không dùng timestamps tự động
// vì cachedAt cần được ghi đè mỗi lần cache lại (kể cả khi update, không chỉ lúc tạo mới).
const fareCacheSchema = new mongoose.Schema(
  {
    _id: { type: String },
    amount: { type: Number, required: true },
    cachedAt: { type: Date, required: true },
  },
  {
    toObject: { transform: (doc, ret) => { ret.tripId = ret._id; delete ret._id; delete ret.__v; } },
    toJSON: { transform: (doc, ret) => { ret.tripId = ret._id; delete ret._id; delete ret.__v; } },
  }
);

const Payment = mongoose.model("Payment", paymentSchema);
const FareCache = mongoose.model("FareCache", fareCacheSchema);

module.exports = { Payment, FareCache };