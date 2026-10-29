const Credential = require("../models/credential.model");

module.exports = {
  create: (data) => Credential.create(data),
  findByEmail: (email) => Credential.findOne({ email }),
  findByEmailAndRole: (email, role) => Credential.findOne({ email, role }),
  findByUserId: (userId) => Credential.findOne({ userId }),
  deleteByUserId: (userId) => Credential.deleteOne({ userId }),
};
