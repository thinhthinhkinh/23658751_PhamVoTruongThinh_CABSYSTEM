const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/fareCache.json");

// Cache số tiền đã tính từ event "FareCalculated" (Pricing Service phát ra),
// giúp Payment Service không cần gọi đồng bộ sang Trip/Pricing Service khi tạo thanh toán.
function findByTripId(tripId) {
  return readData(DATA_FILE).find((f) => f.tripId === tripId) || null;
}

function upsert(tripId, amount) {
  const data = readData(DATA_FILE);
  const idx = data.findIndex((f) => f.tripId === tripId);
  const record = { tripId, amount, cachedAt: new Date().toISOString() };
  if (idx === -1) data.push(record);
  else data[idx] = record;
  writeData(DATA_FILE, data);
  return record;
}

module.exports = { findByTripId, upsert };
