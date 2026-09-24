const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/trip.dao");
const ratingDao = require("../daos/rating.dao");
const {
  createTrip,
  createRating,
  DRIVER_TRANSITIONS,
  CANCELLABLE_STATUSES,
  straightLineDistanceKm,
} = require("../models/trip.model");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");

const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || "http://localhost:4006";

// FR-03: khách hàng tạo yêu cầu đặt xe
async function createTripRequest(customerId, { pickupLocation, dropoffLocation, vehicleType }) {
  if (!pickupLocation || !dropoffLocation || !vehicleType) {
    throw new AppError(400, "INVALID_INPUT", "pickupLocation, dropoffLocation, vehicleType là bắt buộc");
  }
  const trip = dao.insert(createTrip({ id: uuidv4(), customerId, pickupLocation, dropoffLocation, vehicleType }));
  dao.update(trip.id, { status: "finding_driver" });

  // Không gọi trực tiếp Dispatch Service — chỉ publish event, Dispatch Service
  // tự xử lý toàn bộ logic tìm & retry tài xế (choreography-based Saga).
  await eventBus.publish("TripRequested", {
    tripId: trip.id,
    customerId,
    pickupLocation,
    dropoffLocation,
    vehicleType,
  });

  return dao.findById(trip.id);
}

function getOwnedById(id, requester) {
  const trip = dao.findById(id);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  const isOwner = trip.customerId === requester.id || trip.driverId === requester.id;
  const isStaff = ["ops_staff", "ops_admin"].includes(requester.role);
  if (!isOwner && !isStaff) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem chuyến đi này");
  }
  return trip;
}

// Dùng cho service-to-service (Payment/Notification Service gọi), không auth
function getInternal(id) {
  const trip = dao.findById(id);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  return trip;
}

function listByCustomerId(customerId) {
  return dao.findByCustomerId(customerId);
}

function listByDriverId(driverId) {
  return dao.findByDriverId(driverId);
}

// FR-21: quản trị — xem toàn bộ chuyến, lọc theo trạng thái (VD status=in_progress cho "đang diễn ra")
function listAll(status) {
  return status ? dao.findByStatus(status) : dao.findAll();
}

// FR-13: tài xế cập nhật trạng thái chuyến (arrived -> picked_up -> in_progress -> completed)
async function updateStatusByDriver(tripId, driverId, targetStatus, extra = {}) {
  const trip = dao.findById(tripId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  if (trip.driverId !== driverId) {
    throw new AppError(403, "FORBIDDEN", "Bạn không phải tài xế của chuyến này");
  }
  const allowedNext = DRIVER_TRANSITIONS[trip.status] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new AppError(
      409,
      "INVALID_TRANSITION",
      `Không thể chuyển từ trạng thái "${trip.status}" sang "${targetStatus}"`
    );
  }

  if (targetStatus === "completed") {
    return completeTrip(trip, extra);
  }

  const updated = dao.update(tripId, { status: targetStatus });
  await eventBus.publish("TripStatusChanged", { tripId, status: targetStatus, timestamp: updated.updatedAt });
  return updated;
}

// Hoàn thành chuyến: tính quãng đường/thời gian, gọi Pricing Service tính cước,
// lưu lại, rồi publish TripCompleted + FareCalculated để Payment/Notification/Reporting xử lý.
async function completeTrip(trip, { distanceKm, durationMin } = {}) {
  const finalDistance = typeof distanceKm === "number" ? distanceKm : straightLineDistanceKm(trip.pickupLocation, trip.dropoffLocation);
  // ⚠️ Không có GPS tracking thật trong demo — nếu tài xế không gửi durationMin,
  // ước lượng tạm bằng khoảng cách (placeholder, chờ chốt yêu cầu thật).
  const finalDuration = typeof durationMin === "number" ? durationMin : Math.max(5, Math.round(finalDistance * 2));

  const fareRes = await fetch(`${PRICING_SERVICE_URL}/pricing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleType: trip.vehicleType, distanceKm: finalDistance, durationMin: finalDuration }),
  });
  if (!fareRes.ok) throw new AppError(502, "PRICING_UNAVAILABLE", "Không tính được cước cho chuyến này");
  const fareBody = await fareRes.json();
  const fareAmount = fareBody.data.amount;

  const updated = dao.update(trip.id, {
    status: "completed",
    distanceKm: finalDistance,
    durationMin: finalDuration,
    fareAmount,
  });

  await eventBus.publish("TripCompleted", { tripId: trip.id, distance: finalDistance, duration: finalDuration });
  await eventBus.publish("FareCalculated", { tripId: trip.id, amount: fareAmount });

  return updated;
}

// FR-09 / chính sách hủy — ⚠️ chưa chốt, đây là default tạm thời
async function cancelTrip(tripId, requesterId) {
  const trip = dao.findById(tripId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  if (trip.customerId !== requesterId && trip.driverId !== requesterId) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền hủy chuyến này");
  }
  if (!CANCELLABLE_STATUSES.includes(trip.status)) {
    throw new AppError(409, "NOT_CANCELLABLE", `Chuyến ở trạng thái "${trip.status}" không thể hủy`);
  }
  const updated = dao.update(tripId, { status: "cancelled" });
  await eventBus.publish("TripStatusChanged", { tripId, status: "cancelled", timestamp: updated.updatedAt });
  return updated;
}

// ---- Rating (phần cuối FR-05) ----
async function addRating(tripId, customerId, { score, comment }) {
  const trip = dao.findById(tripId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  if (trip.customerId !== customerId) throw new AppError(403, "FORBIDDEN", "Bạn không phải khách hàng của chuyến này");
  if (trip.status !== "completed") throw new AppError(409, "TRIP_NOT_COMPLETED", "Chuyến chưa hoàn thành, chưa thể đánh giá");
  if (ratingDao.findByTripId(tripId)) throw new AppError(409, "ALREADY_RATED", "Chuyến này đã được đánh giá");
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new AppError(400, "INVALID_INPUT", "score phải là số nguyên từ 1 đến 5");
  }

  const rating = ratingDao.insert(createRating({ tripId, driverId: trip.driverId, customerId, score, comment }));
  await eventBus.publish("TripRated", { tripId, driverId: trip.driverId, score });
  return rating;
}

function getDriverRatings(driverId) {
  const ratings = ratingDao.findByDriverId(driverId);
  const averageScore = ratings.length ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : null;
  return { averageScore, ratings };
}

// ---- Subscriber cho event từ Dispatch Service ----
function handleDriverAssigned({ tripId, driverId }) {
  return dao.update(tripId, { driverId, status: "driver_assigned" });
}

function handleNoDriverFound({ tripId }) {
  return dao.update(tripId, { status: "no_driver_found" });
}

module.exports = {
  createTripRequest,
  getOwnedById,
  getInternal,
  listByCustomerId,
  listByDriverId,
  listAll,
  updateStatusByDriver,
  cancelTrip,
  addRating,
  getDriverRatings,
  handleDriverAssigned,
  handleNoDriverFound,
};
