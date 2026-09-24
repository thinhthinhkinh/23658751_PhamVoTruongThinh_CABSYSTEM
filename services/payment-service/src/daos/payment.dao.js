const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/payments.json");

function findAll() {
  return readData(DATA_FILE);
}

function findById(id) {
  return readData(DATA_FILE).find((p) => p.id === id) || null;
}

function findByTripId(tripId) {
  return readData(DATA_FILE).find((p) => p.tripId === tripId) || null;
}

function findByCustomerTripIds(tripIds) {
  const idSet = new Set(tripIds);
  return readData(DATA_FILE).filter((p) => idSet.has(p.tripId));
}

function insert(payment) {
  const data = readData(DATA_FILE);
  data.push(payment);
  writeData(DATA_FILE, data);
  return payment;
}

function update(id, patch) {
  const data = readData(DATA_FILE);
  const idx = data.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...patch, updatedAt: new Date().toISOString() };
  writeData(DATA_FILE, data);
  return data[idx];
}

module.exports = { findAll, findById, findByTripId, findByCustomerTripIds, insert, update };
