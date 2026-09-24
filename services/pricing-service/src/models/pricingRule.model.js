// Model: 1 quy tắc tính giá theo loại xe (FR-14)
// ⚠️ Công thức & mức giá trong data/pricingRules.json chỉ là placeholder —
// công thức tính cước chính thức chưa được khách hàng chốt (xem Mục 9 tài liệu BA).
function createPricingRule({ vehicleType, baseFare, perKmRate, perMinuteRate }) {
  return { vehicleType, baseFare, perKmRate, perMinuteRate };
}

module.exports = { createPricingRule };
