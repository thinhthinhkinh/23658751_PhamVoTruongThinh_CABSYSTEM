// Model: 1 bản ghi vị trí tài xế + hàm tính khoảng cách Haversine (FR-10)

function createLocationRecord({ driverId, lat, lng }) {
  return { driverId, lat, lng, updatedAt: new Date().toISOString() };
}

// Khoảng cách giữa 2 tọa độ (km), công thức Haversine
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // bán kính trái đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { createLocationRecord, distanceKm };
