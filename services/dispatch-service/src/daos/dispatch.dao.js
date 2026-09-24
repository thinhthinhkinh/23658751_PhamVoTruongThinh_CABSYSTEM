const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/dispatches.json");

function findByTripId(tripId) {
  return readData(DATA_FILE).find((d) => d.tripId === tripId) || null;
}

function findPendingByDriverId(driverId) {
  return readData(DATA_FILE).find(
    (d) => d.status === "searching" && d.candidates.some((c) => c.driverId === driverId && c.status === "offered")
  ) || null;
}

function insert(record) {
  const data = readData(DATA_FILE);
  data.push(record);
  writeData(DATA_FILE, data);
  return record;
}

function update(tripId, patch) {
  const data = readData(DATA_FILE);
  const idx = data.findIndex((d) => d.tripId === tripId);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...patch, updatedAt: new Date().toISOString() };
  writeData(DATA_FILE, data);
  return data[idx];
}

module.exports = { findByTripId, findPendingByDriverId, insert, update };
