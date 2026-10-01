const repo = require("../repositories/admin.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 }; }

// admin-service still uses HTTP internally to call other services (via repo)
// The authHeader is reconstructed so existing repo calls work unchanged
function makeAuthHeader(callerId, callerRole) {
  const payload = Buffer.from(JSON.stringify({ id: callerId, role: callerRole })).toString("base64");
  return `Bearer eyJhbGciOiJub25lIn0.${payload}.`;
}

module.exports = {
  async ListCustomers(call, cb) {
    try {
      const data = await repo.listCustomers(makeAuthHeader(call.request.callerId, call.request.callerRole));
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListDrivers(call, cb) {
    try {
      const data = await repo.listDrivers(makeAuthHeader(call.request.callerId, call.request.callerRole));
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListVehicles(call, cb) {
    try {
      const data = await repo.listVehicles(makeAuthHeader(call.request.callerId, call.request.callerRole));
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async DisableCustomer(call, cb) {
    try {
      const data = await repo.disableCustomer(makeAuthHeader(call.request.callerId, call.request.callerRole), call.request.id);
      cb(null, ok(data));
    } catch (e) { cb(null, fail(e)); }
  },
  async DisableDriver(call, cb) {
    try {
      const data = await repo.getDriverStatus(call.request.id);
      cb(null, ok(data));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListTrips(call, cb) {
    try {
      const data = await repo.listTrips(makeAuthHeader(call.request.callerId, call.request.callerRole), call.request.status || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetDriverStatus(call, cb) {
    try {
      const data = await repo.getDriverStatus(call.request.driverId);
      cb(null, ok(data));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListTransactions(call, cb) {
    try {
      const data = await repo.listTransactions(makeAuthHeader(call.request.callerId, call.request.callerRole));
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ResolveTripIssue(call, cb) {
    try {
      const { tripId, resolutionNote, callerId } = call.request;
      const data = await repo.resolveTripIssue(tripId, resolutionNote, callerId);
      cb(null, ok(data, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportTripCount(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportTripCount(makeAuthHeader(callerId, callerRole), from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportRevenue(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportRevenue(makeAuthHeader(callerId, callerRole), from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportCompletionRate(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportCompletionRate(makeAuthHeader(callerId, callerRole), from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportDriverPerformance(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportDriverPerformance(makeAuthHeader(callerId, callerRole), from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
};
