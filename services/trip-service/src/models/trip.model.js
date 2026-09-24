// Model: vòng đời 1 chuyến đi (FR-03, FR-04, FR-05, FR-13)
const STATUSES = [
  "requested",
  "finding_driver",
  "no_driver_found",
  "driver_assigned",
  "arrived",
  "picked_up",
  "in_progress",
  "completed",
  "cancelled",
];

// Chuỗi trạng thái hợp lệ mà TÀI XẾ được phép chuyển tiếp (FR-13)
const DRIVER_TRANSITIONS = {
  driver_assigned: ["arrived"],
  arrived: ["picked_up"],
  picked_up: ["in_progress"],
  in_progress: ["completed"],
};

// Trạng thái còn được phép hủy chuyến — ⚠️ chính sách hủy chuyến chưa được khách hàng
// chốt (xem Mục 9 tài liệu BA), đây là mặc định tạm thời để demo chạy được.
const CANCELLABLE_STATUSES = ["requested", "finding_driver", "driver_assigned"];

function createTrip({ id, customerId, pickupLocation, dropoffLocation, vehicleType }) {
  const now = new Date().toISOString();
  return {
    id,
    customerId,
    driverId: null,
    pickupLocation,
    dropoffLocation,
    vehicleType,
    status: "requested",
    distanceKm: null,
    durationMin: null,
    fareAmount: null,
    createdAt: now,
    updatedAt: now,
  };
}

function createRating({ tripId, driverId, customerId, score, comment }) {
  return { tripId, driverId, customerId, score, comment: comment || null, createdAt: new Date().toISOString() };
}

// Khoảng cách đường chim bay (km) — dùng làm ước lượng khi tài xế không gửi số liệu
// GPS thực tế lúc hoàn thành chuyến (⚠️ chỉ là placeholder cho demo).
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

module.exports = {
  STATUSES,
  DRIVER_TRANSITIONS,
  CANCELLABLE_STATUSES,
  createTrip,
  createRating,
  straightLineDistanceKm,
};
