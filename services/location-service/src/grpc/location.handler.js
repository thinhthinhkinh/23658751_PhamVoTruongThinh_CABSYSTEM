const repo = require("../repositories/location.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

module.exports = {
  // ReportLocationRequest { driverId, lat, lng }
  async ReportLocation(call, cb) {
    try {
      const { driverId, lat, lng } = call.request;
      const record = await repo.reportLocation(driverId, { lat, lng });
      cb(null, ok({ data: record }));
    } catch (e) { cb(null, fail(e)); }
  },
  // NearbyRequest { lat, lng, radiusKm, limit, page, driverIds }
  async FindNearbyDrivers(call, cb) {
    try {
      const { lat, lng, radiusKm, limit, page, driverIds } = call.request;
      const driverIdList = driverIds ? driverIds.split(",").filter(Boolean) : null;
      const drivers = await repo.findNearby({ lat, lng, radiusKm: radiusKm || 5, limit: limit || 20, page: page || 1, driverIds: driverIdList });
      cb(null, ok({ data: drivers }));
    } catch (e) { cb(null, fail(e)); }
  },
  // DriverIdRequest { driverId }
  async GetDriverLocation(call, cb) {
    try {
      const record = await repo.getByDriverId(call.request.driverId);
      cb(null, ok({ data: record }));
    } catch (e) { cb(null, fail(e)); }
  },
};
