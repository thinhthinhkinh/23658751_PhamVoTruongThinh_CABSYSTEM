const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/locations.json");

function findAll() {
  return readData(DATA_FILE);
}

function findByDriverId(driverId) {
  return readData(DATA_FILE).find((l) => l.driverId === driverId) || null;
}

// Upsert: mỗi tài xế chỉ giữ 1 bản ghi vị trí mới nhất
function upsert(record) {
  const data = readData(DATA_FILE);
  const idx = data.findIndex((l) => l.driverId === record.driverId);
  if (idx === -1) {
    data.push(record);
  } else {
    data[idx] = record;
  }
  writeData(DATA_FILE, data);
  return record;
}

module.exports = { findAll, findByDriverId, upsert };
