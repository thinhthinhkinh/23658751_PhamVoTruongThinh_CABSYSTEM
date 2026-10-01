const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/trip.dao");
const ratingDao = require("../daos/rating.dao");
const {
  DRIVER_TRANSITIONS,
  CANCELLABLE_STATUSES,
  straightLineDistanceKm,
} = require("../models/trip.model");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");

const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || "http://localhost:4006";

async function createTripRequest(customerId, { pickupLocation, dropoffLocation, vehicleType }) {
  if (!pickupLocation || !dropoffLocation || !vehicleType) {
    throw new AppError(400, "INVALID_INPUT", "pickupLocation, dropoffLocation, vehicleType là bắt buộc");
  }
  const trip = await dao.insert({
    _id: uuidv4(),
    customerId,
    pickupLocation,
    dropoffLocation,
    vehicleType,
  });
  await dao.update(trip.id, { status: "finding_driver" });

  await eventBus.publish("TripRequested", {
    tripId: trip.id,
    customerId,
    pickupLocation,
    dropoffLocation,
    vehicleType,
  });

  return dao.findById(trip.id);
}

async function getOwnedById(id, requester) {
  const trip = await dao.findById(id);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  const isOwner = trip.customerId === requester.id || trip.driverId === requester.id;
  const isStaff = ["ops_staff", "ops_admin"].includes(requester.role);
  if (!isOwner && !isStaff) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem chuyến đi này");
  }
  return trip;
}

async function getInternal(id) {
  const trip = await dao.findById(id);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  return trip;
}

async function listByCustomerId(customerId, { limit, page } = {}) {
  if (limit && page) {
    return dao.findByCustomerIdPaged(customerId, Math.max(1, parseInt(limit, 10)), Math.max(1, parseInt(page, 10)));
  }
  return dao.findByCustomerId(customerId);
}

async function listByDriverId(driverId, { limit, page } = {}) {
  if (limit && page) {
    return dao.findByDriverIdPaged(driverId, Math.max(1, parseInt(limit, 10)), Math.max(1, parseInt(page, 10)));
  }
  return dao.findByDriverId(driverId);
}

async function listAll(status) {
  return status ? dao.findByStatus(status) : dao.findAll();
}

async function updateStatusByDriver(tripId, driverId, targetStatus, extra = {}) {
  const trip = await dao.findById(tripId);
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

  const updated = await dao.update(tripId, { status: targetStatus });
  await eventBus.publish("TripStatusChanged", { tripId, status: targetStatus, timestamp: updated.updatedAt });
  return updated;
}

async function completeTrip(trip, { distanceKm, durationMin } = {}) {
  const finalDistance = typeof distanceKm === "number" ? distanceKm : straightLineDistanceKm(trip.pickupLocation, trip.dropoffLocation);
  const finalDuration = typeof durationMin === "number" ? durationMin : Math.max(5, Math.round(finalDistance * 2));

  const fareRes = await fetch(`${PRICING_SERVICE_URL}/pricing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleType: trip.vehicleType, distanceKm: finalDistance, durationMin: finalDuration }),
  });
  if (!fareRes.ok) throw new AppError(502, "PRICING_UNAVAILABLE", "Không tính được cước cho chuyến này");
  const fareBody = await fareRes.json();
  const fareAmount = fareBody.data.amount;

  const updated = await dao.update(trip.id, {
    status: "completed",
    distanceKm: finalDistance,
    durationMin: finalDuration,
    fareAmount,
  });

  await eventBus.publish("TripCompleted", { tripId: trip.id, distance: finalDistance, duration: finalDuration });
  await eventBus.publish("FareCalculated", { tripId: trip.id, amount: fareAmount });

  return updated;
}

async function cancelTrip(tripId, requesterId) {
  const trip = await dao.findById(tripId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  if (trip.customerId !== requesterId && trip.driverId !== requesterId) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền hủy chuyến này");
  }
  if (!CANCELLABLE_STATUSES.includes(trip.status)) {
    throw new AppError(409, "NOT_CANCELLABLE", `Chuyến ở trạng thái "${trip.status}" không thể hủy`);
  }
  const updated = await dao.update(tripId, { status: "cancelled" });
  await eventBus.publish("TripStatusChanged", { tripId, status: "cancelled", timestamp: updated.updatedAt });
  return updated;
}

// Escape HTML để chống Stored XSS (STT 26)
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function addRating(tripId, customerId, { score, comment }) {
  const trip = await dao.findById(tripId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  if (trip.customerId !== customerId) throw new AppError(403, "FORBIDDEN", "Bạn không phải khách hàng của chuyến này");
  if (trip.status !== "completed") throw new AppError(409, "TRIP_NOT_COMPLETED", "Chuyến chưa hoàn thành, chưa thể đánh giá");
  if (await ratingDao.findByTripId(tripId)) throw new AppError(409, "ALREADY_RATED", "Chuyến này đã được đánh giá");
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new AppError(400, "INVALID_INPUT", "score phải là số nguyên từ 1 đến 5");
  }

  const rating = await ratingDao.insert({
    _id: tripId,
    driverId: trip.driverId,
    customerId,
    score,
    comment: comment ? escapeHtml(comment) : null,
  });
  await eventBus.publish("TripRated", { tripId, driverId: trip.driverId, score });
  return rating;
}

async function getDriverRatings(driverId) {
  const ratings = await ratingDao.findByDriverId(driverId);
  const averageScore = ratings.length ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : null;
  return { averageScore, ratings };
}

// Idempotent: chỉ áp dụng nếu chuyến chưa có tài xế — "finding_driver" hoặc
// "no_driver_found" (dispatch có thể đã xử lý trước khi webhook tới, ví dụ trong test).
// Bỏ qua nếu chuyến đã ở trạng thái khác (driver_assigned, arrived, completed, ...).
async function handleDriverAssigned({ tripId, driverId }) {
  const trip = await dao.findById(tripId);
  if (!trip) return null;
  if (!["finding_driver", "no_driver_found"].includes(trip.status)) return trip;
  return dao.update(tripId, { driverId, status: "driver_assigned" });
}

async function handleNoDriverFound({ tripId }) {
  const trip = await dao.findById(tripId);
  if (!trip || trip.status !== "finding_driver") return trip;
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