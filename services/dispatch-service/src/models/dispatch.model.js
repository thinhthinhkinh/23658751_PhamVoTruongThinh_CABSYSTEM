// Model: 1 phiên tìm tài xế cho 1 chuyến đi (FR-06..FR-09, FR-12)
// candidate.status: "waiting" | "offered" | "accepted" | "declined" | "timeout"
function createDispatchRecord({ tripId, pickupLocation, vehicleType, candidates }) {
  const now = new Date().toISOString();
  return {
    tripId,
    pickupLocation,
    vehicleType,
    candidates: candidates.map((c) => ({ ...c, status: "waiting", offeredAt: null })),
    status: "searching", // searching | assigned | no_driver_found
    assignedDriverId: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Tốc độ trung bình giả định để ước lượng ETA (phút) — placeholder cho demo
function estimateEtaMinutes(distanceKm, avgSpeedKmH = 30) {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmH) * 60));
}

module.exports = { createDispatchRecord, estimateEtaMinutes };
