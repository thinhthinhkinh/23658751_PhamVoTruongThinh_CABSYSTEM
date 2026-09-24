const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/resolvedIssues.json");

function findByTripId(tripId) {
  return readData(DATA_FILE).filter((r) => r.tripId === tripId);
}

function insert(record) {
  const data = readData(DATA_FILE);
  data.push(record);
  writeData(DATA_FILE, data);
  return record;
}

module.exports = { findByTripId, insert };
