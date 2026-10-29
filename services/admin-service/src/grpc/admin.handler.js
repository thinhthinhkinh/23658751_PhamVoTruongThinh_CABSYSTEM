const repo = require("../repositories/admin.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

module.exports = {
  async ListCustomers(call, cb) {
    try {
      const { callerId, callerRole } = call.request;
      const data = await repo.listCustomers(callerId, callerRole);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListDrivers(call, cb) {
    try {
      const { callerId, callerRole } = call.request;
      const data = await repo.listDrivers(callerId, callerRole);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListVehicles(call, cb) {
    try {
      const { callerId, callerRole } = call.request;
      const data = await repo.listVehicles(callerId, callerRole);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async DisableCustomer(call, cb) {
    try {
      const { callerId, callerRole, id } = call.request;
      const data = await repo.disableCustomer(callerId, callerRole, id);
      cb(null, ok(data));
    } catch (e) { cb(null, fail(e)); }
  },
  async DisableDriver(call, cb) {
    try {
      const data = await repo.getDriverStatus(call.request.id);
      cb(null, ok(data));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListBookings(call, cb) {
    try {
      const { callerId, callerRole } = call.request;
      const data = await repo.listBookings(callerId, callerRole, call.request.status || undefined);
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
      const { callerId, callerRole } = call.request;
      const data = await repo.listTransactions(callerId, callerRole);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ResolveBooking(call, cb) {
    try {
      const { bookingId, resolutionNote, callerId } = call.request;
      const data = await repo.resolveBookingIssue(bookingId, resolutionNote, callerId);
      cb(null, ok({ data }, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportBookings(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportBookingCount(callerId, callerRole, from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportRevenue(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportRevenue(callerId, callerRole, from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportCompletionRate(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportCompletionRate(callerId, callerRole, from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportCancellationRate(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportCancellationRate(callerId, callerRole, from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ReportDriverPerf(call, cb) {
    try {
      const { callerId, callerRole, from, to } = call.request;
      const data = await repo.reportDriverPerformance(callerId, callerRole, from || undefined, to || undefined);
      cb(null, ok({ data }));
    } catch (e) { cb(null, fail(e)); }
  },
};
