const mongoose = require("mongoose");

const pricingRuleSchema = new mongoose.Schema(
  {
    _id: { type: String }, // vehicleType là khóa chính
    baseFare: { type: Number, required: true },
    perKmRate: { type: Number, required: true },
    perMinuteRate: { type: Number, required: true },
  },
  {
    toObject: {
      transform: (doc, ret) => {
        ret.vehicleType = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
    toJSON: {
      transform: (doc, ret) => {
        ret.vehicleType = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const PricingRule = mongoose.model("PricingRule", pricingRuleSchema);

module.exports = { PricingRule };