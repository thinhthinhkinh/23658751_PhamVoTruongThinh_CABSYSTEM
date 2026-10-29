const { v4: uuidv4 } = require("uuid");
const tripDao   = require("../daos/trip.dao");
const ratingDao = require("../daos/rating.dao");
const { DRIVER_TRANSITIONS, straightLineDistanceKm } = require("../models/trip.model");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");
const { grpcCall, pricingClient, bookingClient } = require("../utils/grpcClient");

async function createTripFromEvent({ bookingId, driverId }) {
  const existing = await tripDao.findByBookingId(bookingId);
  if (existing) return existing;

  const bookingData = await grpcCall(bookingClient, "GetBookingInternal", { bookingId }).catch(() => null);
  if (!bookingData) {
    console.error(`[trip-service] GetBookingInternal failed for bookingId=${bookingId}`);
    return null;
  }
  const booking = bookingData.data;

  return tripDao.insert({
    _id:             uuidv4(),
    bookingId,
    driverId:        driverId || booking.driverId,
    customerId:      booking.customerId,
    vehicleType:     booking.vehicleType,
    pickupLocation:  booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    estimatedFare:   booking.estimatedFare || null,
    status:          "driver_assigned",
  });
}

async function getByBookingId(bookingId, requester) {
  const trip = await tripDao.findByBookingId(bookingId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  const isOwner = trip.customerId === requester.id || trip.driverId === requester.id;
  const isStaff = ["ops_staff", "ops_admin"].includes(requester.role);
  if (!isOwner && !isStaff) throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem chuyến này");
  return trip;
}

async function getInternalByBookingId(bookingId) {
  const trip = await tripDao.findByBookingId(bookingId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  return trip;
}

async function updateStatus(bookingId, driverId, targetStatus, extra = {}) {
  const trip = await tripDao.findByBookingId(bookingId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  if (trip.driverId !== driverId) throw new AppError(403, "FORBIDDEN", "Bạn không phải tài xế của chuyến này");

  const allowedNext = DRIVER_TRANSITIONS[trip.status] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new AppError(409, "INVALID_TRANSITION",
      `Không thể chuyển từ "${trip.status}" sang "${targetStatus}"`);
  }

  if (targetStatus === "completed") {
    return completeTrip(trip, extra);
  }

  const patch = { status: targetStatus };
  if (targetStatus === "in_progress") patch.startedAt = new Date();

  const updated = await tripDao.updateByBookingId(bookingId, patch);
  await eventBus.publish("TripStatusChanged", { bookingId, tripId: trip._id, status: targetStatus });
  return updated;
}

async function completeTrip(trip, { distanceKm, durationMin } = {}) {
  const finalDistance = typeof distanceKm === "number"
    ? distanceKm
    : straightLineDistanceKm(trip.pickupLocation, trip.dropoffLocation);
  const finalDuration = typeof durationMin === "number"
    ? durationMin
    : Math.max(5, Math.round(finalDistance * 2));

  const fareData = await grpcCall(pricingClient, "Calculate", {
    vehicleType: trip.vehicleType,
    distanceKm:  finalDistance,
    durationMin: finalDuration,
  }).catch(() => { throw new AppError(502, "PRICING_UNAVAILABLE", "Không tính được cước cho chuyến này"); });

  const actualFare    = fareData.data.amount;
  const estimatedFare = trip.estimatedFare || actualFare;
  const chargeAmount  = Math.max(actualFare, estimatedFare);

  const updated = await tripDao.updateByBookingId(trip.bookingId, {
    status:      "completed",
    distanceKm:  finalDistance,
    durationMin: finalDuration,
    actualFare,
    completedAt: new Date(),
  });

  await eventBus.publish("TripCompleted",  { bookingId: trip.bookingId, tripId: trip._id, distance: finalDistance, duration: finalDuration });
  await eventBus.publish("FareCalculated", { bookingId: trip.bookingId, tripId: trip._id, actualFare, estimatedFare, amount: chargeAmount });

  return updated;
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function addRating(bookingId, customerId, { score, comment }) {
  const trip = await tripDao.findByBookingId(bookingId);
  if (!trip) throw new AppError(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi");
  if (trip.customerId !== customerId) throw new AppError(403, "FORBIDDEN", "Bạn không phải khách hàng của chuyến này");
  if (trip.status !== "completed") throw new AppError(409, "TRIP_NOT_COMPLETED", "Chuyến chưa hoàn thành, chưa thể đánh giá");
  if (await ratingDao.findByBookingId(bookingId)) throw new AppError(409, "ALREADY_RATED", "Chuyến này đã được đánh giá");
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new AppError(400, "INVALID_INPUT", "score phải là số nguyên từ 1 đến 5");
  }

  const rating = await ratingDao.insert({
    _id:       uuidv4(),
    tripId:    trip._id,
    bookingId,
    driverId:  trip.driverId,
    customerId,
    score,
    comment: comment ? escapeHtml(comment) : null,
  });
  await eventBus.publish("TripRated", { bookingId, tripId: trip._id, driverId: trip.driverId, score });
  return rating;
}

async function getDriverRatings(driverId) {
  const ratings = await ratingDao.findByDriverId(driverId);
  const averageScore = ratings.length
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : null;
  return { averageScore, ratings };
}

async function listByDriverId(driverId, { limit, page } = {}) {
  if (limit && page) {
    return tripDao.findByDriverIdPaged(driverId, Math.max(1, parseInt(limit, 10)), Math.max(1, parseInt(page, 10)));
  }
  return tripDao.findByDriverId(driverId);
}

async function listByCustomerId(customerId, { limit, page } = {}) {
  if (limit && page) {
    return tripDao.findByCustomerIdPaged(customerId, Math.max(1, parseInt(limit, 10)), Math.max(1, parseInt(page, 10)));
  }
  return tripDao.findByCustomerId(customerId);
}

module.exports = {
  createTripFromEvent,
  getByBookingId,
  getInternalByBookingId,
  updateStatus,
  addRating,
  getDriverRatings,
  listByDriverId,
  listByCustomerId,
};
