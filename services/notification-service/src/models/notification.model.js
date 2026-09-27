const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userRole: { type: String, enum: ["customer", "driver"], required: true },
    channel: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  {
    toObject: { transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; } },
    toJSON: { transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; } },
  }
);

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  {
    toObject: { transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; } },
    toJSON: { transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; } },
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
const Channel = mongoose.model("Channel", channelSchema);

module.exports = { Notification, Channel };