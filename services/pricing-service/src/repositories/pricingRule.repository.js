const dao = require("../daos/pricingRule.dao");
const AppError = require("../utils/AppError");

// FR-14: tính số tiền khách hàng phải trả dựa trên loại dịch vụ & thông tin chuyến.
// Công thức: baseFare + distanceKm * perKmRate + durationMin * perMinuteRate
async function calculateFare({ vehicleType, distanceKm, durationMin }) {
  const rule = await dao.findByVehicleType(vehicleType);
  if (!rule) {
    throw new AppError(400, "UNKNOWN_VEHICLE_TYPE", `Không có quy tắc giá cho loại xe "${vehicleType}"`);
  }
  if (typeof distanceKm !== "number" || typeof durationMin !== "number") {
    throw new AppError(400, "INVALID_INPUT", "distanceKm, durationMin phải là số");
  }

  const distancePart = distanceKm * rule.perKmRate;
  const durationPart = durationMin * rule.perMinuteRate;
  const amount = Math.round(rule.baseFare + distancePart + durationPart);

  return {
    amount,
    currency: "VND",
    breakdown: {
      baseFare: rule.baseFare,
      perKm: rule.perKmRate,
      perMinute: rule.perMinuteRate,
    },
  };
}

async function getRules() {
  return dao.findAll();
}

module.exports = { calculateFare, getRules };