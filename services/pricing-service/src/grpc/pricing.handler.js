const repo = require("../repositories/pricingRule.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

const AppError = require("../utils/AppError");

module.exports = {
  async Calculate(call, cb) {
    try {
      const { vehicleType, distanceKm, durationMin } = call.request;
      const d = parseFloat(distanceKm);
      const m = parseFloat(durationMin);
      if (isNaN(d) || d < 0 || isNaN(m) || m < 0) {
        return cb(null, fail(new AppError(400, "INVALID_INPUT", "distanceKm và durationMin phải là số không âm")));
      }
      const result = await repo.calculateFare({ vehicleType, distanceKm: d, durationMin: m });
      cb(null, ok({ data: result }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetRules(call, cb) {
    try {
      const { callerRole } = call.request;
      if (callerRole !== "ops_admin") {
        return cb(null, fail(new AppError(403, "FORBIDDEN", "Chỉ ops_admin mới được xem cấu hình giá")));
      }
      const rules = await repo.getRules();
      cb(null, ok({ data: rules }));
    } catch (e) { cb(null, fail(e)); }
  },
};
