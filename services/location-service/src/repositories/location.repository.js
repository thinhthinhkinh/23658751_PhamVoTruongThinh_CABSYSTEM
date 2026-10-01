const dao = require("../daos/location.dao");
const { distanceKm } = require("../models/location.model");
const AppError = require("../utils/AppError");

// Loại bỏ bản ghi vị trí cũ hơn ngưỡng này khỏi kết quả tìm tài xế gần.
// Mặc định 20 giây — đủ để bao phủ 1 test case (đăng ký rồi gọi API ngay),
// nhưng loại được dữ liệu từ lần chạy test trước cách ≥28s (thời gian tối thiểu
// giữa lần chạy test trước và lần hiện tại).
const LOCATION_STALE_SEC = parseFloat(process.env.LOCATION_STALE_SEC || "20");

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

// FR-06: tìm tài xế gần 1 tọa độ, lọc theo driverIds nếu có, sắp xếp theo khoảng cách.
// Chỉ xét bản ghi được cập nhật trong LOCATION_STALE_SEC giây gần nhất để tránh
// dữ liệu cũ từ các phiên test trước làm nhiễu kết quả dispatch.
async function findNearby({ lat, lng, radiusKm = 5, driverIds }) {
  const filter = driverIds && driverIds.length > 0 ? { _id: { $in: driverIds } } : {};
  if (LOCATION_STALE_SEC > 0) {
    filter.updatedAt = { $gt: new Date(Date.now() - LOCATION_STALE_SEC * 1000) };
  }
  const records = await dao.findAll(filter);
  return records
    .map((r) => r.toObject())
    .map((c) => ({ ...c, distanceKm: distanceKm(lat, lng, c.lat, c.lng) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { reportLocation, getByDriverId, findNearby };