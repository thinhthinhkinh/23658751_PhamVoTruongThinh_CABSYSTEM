const { LocationRecord } = require("../models/location.model");

function findAll(filter = {}) {
  return LocationRecord.find(filter);
}

function findByDriverId(driverId) {
  return LocationRecord.findById(driverId);
}

// Upsert: mỗi tài xế chỉ giữ 1 bản ghi vị trí mới nhất
function upsert({ driverId, lat, lng }) {
  return LocationRecord.findOneAndUpdate(
    { _id: driverId },
    { lat, lng },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = { findAll, findByDriverId, upsert };