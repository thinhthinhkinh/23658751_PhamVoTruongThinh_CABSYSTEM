const dao = require("../daos/dispatch.dao");
const { estimateEtaMinutes } = require("../models/dispatch.model");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || "http://localhost:4002";
const LOCATION_SERVICE_URL = process.env.LOCATION_SERVICE_URL || "http://localhost:4005";
const SEARCH_RADIUS_KM = parseFloat(process.env.DISPATCH_SEARCH_RADIUS_KM || "10");
const OFFER_TIMEOUT_SEC = parseFloat(process.env.DISPATCH_OFFER_TIMEOUT_SEC || "20");

const pendingTimers = new Map();

function clearTimer(tripId) {
  if (pendingTimers.has(tripId)) {
    clearTimeout(pendingTimers.get(tripId));
    pendingTimers.delete(tripId);
  }
}

async function buildCandidates(pickupLocation) {
  const driverRes = await fetch(`${DRIVER_SERVICE_URL}/drivers?status=available`);
  const driverBody = await driverRes.json();
  const availableIds = (driverBody.data || []).map((d) => d.id);
  if (availableIds.length === 0) return [];

  const params = new URLSearchParams({
    lat: String(pickupLocation.lat),
    lng: String(pickupLocation.lng),
    radiusKm: String(SEARCH_RADIUS_KM),
    driverIds: availableIds.join(","),
  });
  const locRes = await fetch(`${LOCATION_SERVICE_URL}/locations/nearby-drivers?${params}`);
  const locBody = await locRes.json();

  return (locBody.data || []).map((d) => ({ driverId: d.driverId, distanceKm: d.distanceKm }));
}

async function handleTripRequested(payload) {
  const { tripId, pickupLocation, vehicleType } = payload;
  const candidates = await buildCandidates(pickupLocation);
  await dao.insert({
    tripId,
    pickupLocation,
    vehicleType,
    candidates: candidates.map((c) => ({ ...c, status: "waiting", offeredAt: null })),
  });

  if (candidates.length === 0) {
    return finishNoDriverFound(tripId);
  }
  return offerToNextCandidate(tripId);
}

async function offerToNextCandidate(tripId) {
  const record = await dao.findByTripId(tripId);
  if (!record || record.status !== "searching") return;

  const next = record.candidates.find((c) => c.status === "waiting");
  if (!next) {
    return finishNoDriverFound(tripId);
  }

  next.status = "offered";
  next.offeredAt = new Date();
  await record.save();

  clearTimer(tripId);
  const handle = setTimeout(() => {
    handleTimeout(tripId, next.driverId).catch((err) => console.error("[dispatch] timeout error:", err));
  }, OFFER_TIMEOUT_SEC * 1000);
  pendingTimers.set(tripId, handle);
}

async function handleTimeout(tripId, driverId) {
  const record = await dao.findByTripId(tripId);
  if (!record || record.status !== "searching") return;
  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) return;

  candidate.status = "timeout";
  await record.save();
  return offerToNextCandidate(tripId);
}

async function finishNoDriverFound(tripId) {
  await dao.update(tripId, { status: "no_driver_found" });
  await eventBus.publish("NoDriverFound", { tripId });
}

async function accept(tripId, driverId) {
  const record = await dao.findByTripId(tripId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho chuyến này");

  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) {
    throw new AppError(409, "NOT_CURRENT_CANDIDATE", "Chuyến này hiện không được đề xuất cho bạn hoặc đã hết hạn");
  }

  clearTimer(tripId);
  candidate.status = "accepted";
  record.status = "assigned";
  record.assignedDriverId = driverId;
  await record.save();

  const eta = estimateEtaMinutes(candidate.distanceKm);
  await eventBus.publish("DriverAssigned", { tripId, driverId, eta });
  return { tripId, driverId, eta };
}

async function decline(tripId, driverId) {
  const record = await dao.findByTripId(tripId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho chuyến này");

  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) {
    throw new AppError(409, "NOT_CURRENT_CANDIDATE", "Chuyến này hiện không được đề xuất cho bạn hoặc đã hết hạn");
  }

  clearTimer(tripId);
  candidate.status = "declined";
  await record.save();
  await offerToNextCandidate(tripId);
  return { tripId, driverId, status: "declined" };
}

async function getCandidates(tripId) {
  const record = await dao.findByTripId(tripId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho chuyến này");
  return record.candidates;
}

async function getPendingOfferForDriver(driverId) {
  return dao.findPendingByDriverId(driverId);
}

module.exports = {
  handleTripRequested,
  accept,
  decline,
  getCandidates,
  getPendingOfferForDriver,
};