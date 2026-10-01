const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    plate: { type: String, required: true },
    model: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const driverSchema = new mongoose.Schema(
  {
    _id: { type: String },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: null },
    vehicle: { type: vehicleSchema, default: null },
    status: { type: String, enum: ["offline", "available", "busy"], default: "offline" },
    approvalStatus: {
      type: String,
      enum: ["pending_approval", "approved", "rejected"],
      default: "pending_approval",
    },
    active: { type: Boolean, default: true },
    createdByStaff: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toObject: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const Driver = mongoose.model("Driver", driverSchema);

function toPublicJSON(driver) {
  const obj = driver.toObject ? driver.toObject() : driver;
  const { passwordHash, ...rest } = obj;
  return rest;
}

module.exports = { Driver, toPublicJSON };