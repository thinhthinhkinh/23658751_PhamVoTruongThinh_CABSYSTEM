const dao = require("../daos/dispatch.dao");
const { createDispatchRecord, estimateEtaMinutes } = require("../models/dispatch.model");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || "http://localhost:4002";
const LOCATION_SERVICE_URL = process.env.LOCATION_SERVICE_URL || "http://localhost:4005";
const SEARCH_RADIUS_KM = parseFloat(process.env.DISPATCH_SEARCH_RADIUS_KM || "10");
// ⚠️ FR-08: thời gian tài xế phải phản hồi chưa được khách hàng chốt (Mục 9 tài liệu BA).
// Giá trị dưới đây chỉ là mặc định tạm thời để demo chạy được, nên để cấu hình được qua .env.
const OFFER_TIMEOUT_SEC = parseFloat(process.env.DISPATCH_OFFER_TIMEOUT_SEC || "20");

// Giữ các setTimeout đang chờ trong bộ nhớ — không cần bền vững qua restart vì đây
// chỉ là trạng thái điều phối tạm thời trong lúc tìm tài xế cho 1 chuyến.
const pendingTimers = new Map(); // tripId -> Timeout handle

function clearTimer(tripId) {
  if (pendingTimers.has(tripId)) {
    clearTimeout(pendingTimers.get(tripId));
    pendingTimers.delete(tripId);
  }
}

// FR-06, FR-07: lấy tài xế đang sẵn sàng + gần điểm đón, sắp xếp theo khoảng cách
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

// FR-03 -> FR-06: nhận event TripRequested từ Trip Service, bắt đầu quá trình tìm tài xế
async function handleTripRequested(payload) {
  const { tripId, pickupLocation, vehicleType } = payload;
  const candidates = await buildCandidates(pickupLocation);
  dao.insert(createDispatchRecord({ tripId, pickupLocation, vehicleType, candidates }));

  if (candidates.length === 0) {
    return finishNoDriverFound(tripId);
  }
  return offerToNextCandidate(tripId);
}

// Đề xuất chuyến cho ứng viên tiếp theo trong danh sách (theo thứ tự đã sắp xếp gần nhất)
async function offerToNextCandidate(tripId) {
  const record = dao.findByTripId(tripId);
  if (!record || record.status !== "searching") return;

  const next = record.candidates.find((c) => c.status === "waiting");
  if (!next) {
    return finishNoDriverFound(tripId);
  }

  next.status = "offered";
  next.offeredAt = new Date().toISOString();
  dao.update(tripId, { candidates: record.candidates });

  clearTimer(tripId);
  const handle = setTimeout(() => {
    handleTimeout(tripId, next.driverId).catch((err) => console.error("[dispatch] timeout error:", err));
  }, OFFER_TIMEOUT_SEC * 1000);
  pendingTimers.set(tripId, handle);
}

// FR-08: tài xế không phản hồi trong thời gian quy định -> tự động chuyển tài xế khác
async function handleTimeout(tripId, driverId) {
  const record = dao.findByTripId(tripId);
  if (!record || record.status !== "searching") return;
  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) return;

  candidate.status = "timeout";
  dao.update(tripId, { candidates: record.candidates });
  return offerToNextCandidate(tripId);
}

// FR-09: hết ứng viên mà không ai nhận -> thông báo khách hàng qua event
async function finishNoDriverFound(tripId) {
  dao.update(tripId, { status: "no_driver_found" });
  await eventBus.publish("NoDriverFound", { tripId });
}

// FR-12: tài xế chấp nhận chuyến
async function accept(tripId, driverId) {
  const record = dao.findByTripId(tripId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho chuyến này");

  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) {
    throw new AppError(409, "NOT_CURRENT_CANDIDATE", "Chuyến này hiện không được đề xuất cho bạn hoặc đã hết hạn");
  }

  clearTimer(tripId);
  candidate.status = "accepted";
  dao.update(tripId, { candidates: record.candidates, status: "assigned", assignedDriverId: driverId });

  const eta = estimateEtaMinutes(candidate.distanceKm);
  await eventBus.publish("DriverAssigned", { tripId, driverId, eta });
  return { tripId, driverId, eta };
}

// FR-08, FR-12: tài xế từ chối -> tự động tìm tài xế khác, không cần khách hàng tạo lại yêu cầu
async function decline(tripId, driverId) {
  const record = dao.findByTripId(tripId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho chuyến này");

  const candidate = record.candidates.find((c) => c.driverId === driverId && c.status === "offered");
  if (!candidate) {
    throw new AppError(409, "NOT_CURRENT_CANDIDATE", "Chuyến này hiện không được đề xuất cho bạn hoặc đã hết hạn");
  }

  clearTimer(tripId);
  candidate.status = "declined";
  dao.update(tripId, { candidates: record.candidates });
  await offerToNextCandidate(tripId);
  return { tripId, driverId, status: "declined" };
}

// FR-06, FR-07: audit/debug — xem toàn bộ danh sách ứng viên đã xét cho 1 chuyến
function getCandidates(tripId) {
  const record = dao.findByTripId(tripId);
  if (!record) throw new AppError(404, "DISPATCH_NOT_FOUND", "Không tìm thấy phiên điều phối cho chuyến này");
  return record.candidates;
}

// Tiện ích cho demo: tài xế poll xem hiện có đang được đề xuất chuyến nào không
// (thay thế cho cơ chế push notification thật chưa có trong phạm vi demo)
function getPendingOfferForDriver(driverId) {
  return dao.findPendingByDriverId(driverId);
}

module.exports = {
  handleTripRequested,
  accept,
  decline,
  getCandidates,
  getPendingOfferForDriver,
};
