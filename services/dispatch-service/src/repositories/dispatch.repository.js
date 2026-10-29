const dao = require("../daos/dispatch.dao");
const { estimateEtaMinutes } = require("../models/dispatch.model");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");
const { grpcCall, driverClient, locationClient } = require("../utils/grpcClient");

const SEARCH_RADIUS_KM = parseFloat(process.env.DISPATCH_SEARCH_RADIUS_KM || "10");
const OFFER_TIMEOUT_SEC = parseFloat(process.env.DISPATCH_OFFER_TIMEOUT_SEC || "20");

const pendingTimers = new Map();

function clearTimer(bookingId) {
  if (pendingTimers.has(bookingId)) {
    clearTimeout(pendingTimers.get(bookingId));
    pendingTimers.delete(bookingId);
  }
}

async function buildCandidates(pickupLocation) {
  const driverBody = await grpcCall(driverClient, "ListByStatus", { status: "available" }).catch(() => ({ data: [] }));
  const availableIds = (driverBody.data || []).map((d) => d.id);
  if (availableIds.length === 0) return [];

  const locBody = await grpcCall(locationClient, "FindNearbyDrivers", {
    lat: pickupLocation.lat,
    lng: pickupLocation.lng,
    radiusKm: SEARCH_RADIUS_KM,
    driverIds: availableIds.join(","),
  }).catch(() => ({ data: [] }));

  return (locBody.data || []).map((d) => ({ driverId: d.driverId, distanceKm: d.distanceKm }));
}

async function handleBookingRequested(payload) {
  const { bookingId, pickupLocation, vehicleType } = payload;
  const candidates = await buildCandidates(pickupLocation);
  await dao.insert({
    bookingId,
    pickupLocation,
    vehicleType,
    candidates: candidates.map((c) => ({ ...c, status: "waiting", offeredAt: null })),
  });

  if (candidates.length === 0) {
    return finishNoDriverFound(bookingId);
  }
  return offerToNextCandidate(bookingId);
}

async function offerToNextCandidate(bookingId) {
  const record = await dao.findByBookingId(bookingId);
  if (!record || record.status !== "searching") return;

  const next = record.candidates.find((c) => c.status === "waiting");
  if (!next) {
    return finishNoDriverFound(bookingId);
  }

  next.status = "offered";
  next.offeredAt = new Date();
  await record.save();

  clearTimer(bookingId);
  const handle = setTimeout(() => {
    handleTimeout(bookingId, next.driverId).catch((err) => console.error("[dispatch] timeout error:", err));
  }, OFFER_TIMEOUT_SEC * 1000);
  pendingTimers.set(bookingId, handle);
}

async function handleTimeout(bookingId, driverId) {
  const record = await dao.findByBookingId(bookingId);
  if (!record || record.status !== "searching") return;
  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) return;

  candidate.status = "timeout";
  await record.save();
  return offerToNextCandidate(bookingId);
}

async function finishNoDriverFound(bookingId) {
  await dao.update(bookingId, { status: "no_driver_found" });
  await eventBus.publish("NoDriverFound", { bookingId });
}

async function accept(bookingId, driverId) {
  const record = await dao.findByBookingId(bookingId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho booking này");

  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) {
    throw new AppError(409, "NOT_CURRENT_CANDIDATE", "Booking này hiện không được đề xuất cho bạn hoặc đã hết hạn");
  }

  clearTimer(bookingId);
  candidate.status = "accepted";
  record.status = "assigned";
  record.assignedDriverId = driverId;
  await record.save();

  const eta = estimateEtaMinutes(candidate.distanceKm);
  await eventBus.publish("DriverAssigned", { bookingId, driverId, eta });
  return { bookingId, driverId, eta };
}

async function decline(bookingId, driverId) {
  const record = await dao.findByBookingId(bookingId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho booking này");

  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) {
    throw new AppError(409, "NOT_CURRENT_CANDIDATE", "Booking này hiện không được đề xuất cho bạn hoặc đã hết hạn");
  }

  clearTimer(bookingId);
  candidate.status = "declined";
  await record.save();
  await offerToNextCandidate(bookingId);
  return { bookingId, driverId, status: "declined" };
}

async function getCandidates(bookingId) {
  const record = await dao.findByBookingId(bookingId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho booking này");
  return record.candidates;
}

async function getPendingOfferForDriver(driverId) {
  return dao.findPendingByDriverId(driverId);
}

module.exports = {
  handleBookingRequested,
  accept,
  decline,
  getCandidates,
  getPendingOfferForDriver,
};
