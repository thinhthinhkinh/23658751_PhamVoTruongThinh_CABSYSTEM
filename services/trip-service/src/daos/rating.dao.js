const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/ratings.json");

function findByTripId(tripId) {
  return readData(DATA_FILE).find((r) => r.tripId === tripId) || null;
}

function findByDriverId(driverId) {
  return readData(DATA_FILE).filter((r) => r.driverId === driverId);
}

function insert(rating) {
  const data = readData(DATA_FILE);
  data.push(rating);
  writeData(DATA_FILE, data);
  return rating;
}

module.exports = { findByTripId, findByDriverId, insert };
