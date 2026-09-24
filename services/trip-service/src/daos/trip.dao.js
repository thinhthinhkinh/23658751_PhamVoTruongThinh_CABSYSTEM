const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/trips.json");

function findAll() {
  return readData(DATA_FILE);
}

function findById(id) {
  return readData(DATA_FILE).find((t) => t.id === id) || null;
}

function findByCustomerId(customerId) {
  return readData(DATA_FILE)
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findByDriverId(driverId) {
  return readData(DATA_FILE)
    .filter((t) => t.driverId === driverId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findByStatus(status) {
  return readData(DATA_FILE).filter((t) => t.status === status);
}

function insert(trip) {
  const data = readData(DATA_FILE);
  data.push(trip);
  writeData(DATA_FILE, data);
  return trip;
}

function update(id, patch) {
  const data = readData(DATA_FILE);
  const idx = data.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...patch, updatedAt: new Date().toISOString() };
  writeData(DATA_FILE, data);
  return data[idx];
}

module.exports = { findAll, findById, findByCustomerId, findByDriverId, findByStatus, insert, update };
