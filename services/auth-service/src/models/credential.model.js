const mongoose = require("mongoose");

const credentialSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  email:        { type: String, required: true, index: true },
  role:         { type: String, required: true, enum: ["customer", "driver", "ops_staff", "ops_admin"] },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

credentialSchema.index({ email: 1, role: 1 }, { unique: true });

const Credential = mongoose.model("Credential", credentialSchema);
module.exports = Credential;
