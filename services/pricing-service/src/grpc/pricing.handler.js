const repo = require("../repositories/pricingRule.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 }; }

module.exports = {
  async Calculate(call, cb) {
    try {
      const { vehicleType, distanceKm, durationMin } = call.request;
      const result = await repo.calculateFare({
        vehicleType,
        distanceKm: parseFloat(distanceKm),
        durationMin: parseFloat(durationMin),
      });
      cb(null, ok({ data: result }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetRules(call, cb) {
    try {
      const rules = await repo.getRules();
      cb(null, ok({ data: rules }));
    } catch (e) { cb(null, fail(e)); }
  },
};
