const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/drivers.json");

function findAll() {
  return readData(DATA_FILE);
}

function findById(id) {
  return readData(DATA_FILE).find((d) => d.id === id) || null;
}

function findByEmail(email) {
  return readData(DATA_FILE).find((d) => d.email === email) || null;
}

function findByStatus(status) {
  return readData(DATA_FILE).filter((d) => d.status === status);
}

function insert(driver) {
  const data = readData(DATA_FILE);
  data.push(driver);
  writeData(DATA_FILE, data);
  return driver;
}

function update(id, patch) {
  const data = readData(DATA_FILE);
  const idx = data.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...patch, updatedAt: new Date().toISOString() };
  writeData(DATA_FILE, data);
  return data[idx];
}

module.exports = { findAll, findById, findByEmail, findByStatus, insert, update };
