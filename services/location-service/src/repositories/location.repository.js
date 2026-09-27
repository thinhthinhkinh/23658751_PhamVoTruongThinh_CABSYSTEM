const dao = require("../daos/location.dao");
const { distanceKm } = require("../models/location.model");
const AppError = require("../utils/AppError");

async function reportLocation(driverId, { lat, lng }) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new AppError(400, "INVALID_INPUT", "lat, lng phải là số");
  }
  return dao.upsert({ driverId, lat, lng });
}

async function getByDriverId(driverId) {
  const record = await dao.findByDriverId(driverId);
  if (!record) throw new AppError(404, "LOCATION_NOT_FOUND", "Chưa có dữ liệu vị trí cho tài xế này");
  return record;
}

// FR-06: tìm tài xế gần 1 tọa độ, lọc theo driverIds nếu có, sắp xếp theo khoảng cách
async function findNearby({ lat, lng, radiusKm = 5, driverIds }) {
  const filter = driverIds && driverIds.length > 0 ? { _id: { $in: driverIds } } : {};
  const records = await dao.findAll(filter);
  return records
    .map((r) => r.toObject())
    .map((c) => ({ ...c, distanceKm: distanceKm(lat, lng, c.lat, c.lng) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { reportLocation, getByDriverId, findNearby };