const mongoose = require("mongoose");

const resolvedIssueSchema = new mongoose.Schema(
  {
    _id: { type: String },
    tripId: { type: String, required: true },
    resolutionNote: { type: String, required: true },
    resolvedBy: { type: String, required: true },
    resolvedAt: { type: Date, default: Date.now },
  },
  {
    toObject: { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; } },
    toJSON: { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; } },
  }
);

const ResolvedIssue = mongoose.model("ResolvedIssue", resolvedIssueSchema);

module.exports = { ResolvedIssue };