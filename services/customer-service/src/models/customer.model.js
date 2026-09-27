const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    _id: { type: String },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: null },
    active: { type: Boolean, default: true },
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

const Customer = mongoose.model("Customer", customerSchema);

// Loại bỏ passwordHash trước khi trả về client
function toPublicJSON(customer) {
  const obj = customer.toObject ? customer.toObject() : customer;
  const { passwordHash, ...rest } = obj;
  return rest;
}

module.exports = { Customer, toPublicJSON };