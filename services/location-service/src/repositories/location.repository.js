const dao = require("../daos/location.dao");
const { createLocationRecord, distanceKm } = require("../models/location.model");
const AppError = require("../utils/AppError");

// FR-10: ghi nhận vị trí tài xế theo thời gian thực
function reportLocation(driverId, { lat, lng }) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new AppError(400, "INVALID_INPUT", "lat, lng phải là số");
  }
  return dao.upsert(createLocationRecord({ driverId, lat, lng }));
}

function getByDriverId(driverId) {
  const record = dao.findByDriverId(driverId);
  if (!record) throw new AppError(404, "LOCATION_NOT_FOUND", "Chưa có dữ liệu vị trí cho tài xế này");
  return record;
}

// FR-06: tìm tài xế gần 1 tọa độ, lọc theo danh sách driverIds nếu có, sắp xếp theo khoảng cách
function findNearby({ lat, lng, radiusKm = 5, driverIds }) {
  let candidates = dao.findAll();
  if (driverIds && driverIds.length > 0) {
    const idSet = new Set(driverIds);
    candidates = candidates.filter((c) => idSet.has(c.driverId));
  }
  return candidates
    .map((c) => ({ ...c, distanceKm: distanceKm(lat, lng, c.lat, c.lng) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { reportLocation, getByDriverId, findNearby };
