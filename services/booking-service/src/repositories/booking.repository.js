const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/booking.dao");
const { CANCELLABLE_STATUSES } = require("../models/booking.model");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");
const { grpcCall, pricingClient } = require("../utils/grpcClient");

function straightLineDistanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function createBookingRequest(customerId, { pickupLocation, dropoffLocation, vehicleType }) {
  if (!pickupLocation || !dropoffLocation || !vehicleType) {
    throw new AppError(400, "INVALID_INPUT", "pickupLocation, dropoffLocation, vehicleType là bắt buộc");
  }

  const estDistKm  = straightLineDistanceKm(pickupLocation, dropoffLocation);
  const estDurMin  = Math.max(5, Math.round(estDistKm * 2));
  const estimateData = await grpcCall(pricingClient, "Calculate", {
    vehicleType, distanceKm: estDistKm, durationMin: estDurMin,
  }).catch(() => null);
  const estimatedFare = estimateData?.data?.amount ?? null;

  const booking = await dao.insert({
    _id: uuidv4(),
    customerId,
    pickupLocation,
    dropoffLocation,
    vehicleType,
    estimatedFare,
  });
  await dao.update(booking._id, { status: "finding_driver" });

  await eventBus.publish("BookingRequested", {
    bookingId: booking._id,
    customerId,
    pickupLocation,
    dropoffLocation,
    vehicleType,
    estimatedFare,
  });

  return dao.findById(booking._id);
}

async function getOwnedById(id, requester) {
  const booking = await dao.findById(id);
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Không tìm thấy booking");
  const isOwner = booking.customerId === requester.id || booking.driverId === requester.id;
  const isStaff = ["ops_staff", "ops_admin"].includes(requester.role);
  if (!isOwner && !isStaff) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem booking này");
  }
  return booking;
}

async function getInternal(id) {
  const booking = await dao.findById(id);
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Không tìm thấy booking");
  return booking;
}

async function listByCustomerId(customerId, { limit, page } = {}) {
  if (limit && page) {
    return dao.findByCustomerIdPaged(customerId, Math.max(1, parseInt(limit, 10)), Math.max(1, parseInt(page, 10)));
  }
  return dao.findByCustomerId(customerId);
}

async function listAll(status) {
  return status ? dao.findByStatus(status) : dao.findAll();
}

async function cancelBooking(bookingId, requesterId) {
  const booking = await dao.findById(bookingId);
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Không tìm thấy booking");
  if (booking.customerId !== requesterId && booking.driverId !== requesterId) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền hủy booking này");
  }
  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    throw new AppError(409, "NOT_CANCELLABLE", `Booking ở trạng thái "${booking.status}" không thể hủy`);
  }
  const updated = await dao.update(bookingId, { status: "cancelled" });
  await eventBus.publish("BookingCancelled", { bookingId, cancelReason: "customer_request", timestamp: updated.updatedAt });
  return updated;
}

async function handleDriverAssigned({ bookingId, driverId }) {
  const result = await dao.updateIfStatus(
    bookingId,
    ["finding_driver", "no_driver_found"],
    { driverId, status: "driver_assigned" }
  );
  return result || dao.findById(bookingId);
}

async function handleNoDriverFound({ bookingId }) {
  const result = await dao.updateIfStatus(bookingId, "finding_driver", { status: "no_driver_found" });
  return result || dao.findById(bookingId);
}

module.exports = {
  createBookingRequest,
  getOwnedById,
  getInternal,
  listByCustomerId,
  listAll,
  cancelBooking,
  handleDriverAssigned,
  handleNoDriverFound,
};
