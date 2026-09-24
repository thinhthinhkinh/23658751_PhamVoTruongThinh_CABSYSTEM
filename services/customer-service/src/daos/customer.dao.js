const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/customers.json");

function findAll() {
  return readData(DATA_FILE);
}

function findById(id) {
  return readData(DATA_FILE).find((c) => c.id === id) || null;
}

function findByEmail(email) {
  return readData(DATA_FILE).find((c) => c.email === email) || null;
}

function insert(customer) {
  const data = readData(DATA_FILE);
  data.push(customer);
  writeData(DATA_FILE, data);
  return customer;
}

function update(id, patch) {
  const data = readData(DATA_FILE);
  const idx = data.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...patch, updatedAt: new Date().toISOString() };
  writeData(DATA_FILE, data);
  return data[idx];
}

module.exports = { findAll, findById, findByEmail, insert, update };
