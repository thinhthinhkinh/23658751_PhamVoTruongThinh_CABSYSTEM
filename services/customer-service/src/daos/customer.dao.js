const { Customer } = require("../models/customer.model");

function findAll() {
  return Customer.find({});
}

function findById(id) {
  return Customer.findById(id);
}

function findByEmail(email) {
  return Customer.findOne({ email });
}

async function insert(customerData) {
  const customer = new Customer(customerData);
  await customer.save();
  return customer;
}

function update(id, patch) {
  return Customer.findByIdAndUpdate(id, patch, { new: true });
}

module.exports = { findAll, findById, findByEmail, insert, update };