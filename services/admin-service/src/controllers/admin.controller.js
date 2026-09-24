const repo = require("../repositories/admin.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// GET /admin/customers — FR-20
const listCustomers = asyncHandler(async (req, res) => {
  return okList(res, await repo.listCustomers(req.headers.authorization));
});

// GET /admin/drivers — FR-20
const listDrivers = asyncHandler(async (req, res) => {
  return okList(res, await repo.listDrivers(req.headers.authorization));
});

// GET /admin/vehicles — FR-20
const listVehicles = asyncHandler(async (req, res) => {
  return okList(res, await repo.listVehicles(req.headers.authorization));
});

// DELETE /admin/customers/:id — FR-22 (thao tác nhạy cảm)
const disableCustomer = asyncHandler(async (req, res) => {
  return ok(res, await repo.disableCustomer(req.headers.authorization, req.params.id));
});

// GET /admin/trips?status= — FR-21
const listTrips = asyncHandler(async (req, res) => {
  return okList(res, await repo.listTrips(req.headers.authorization, req.query.status));
});

// GET /admin/drivers/:id/status — FR-21
const getDriverStatus = asyncHandler(async (req, res) => {
  const driver = await repo.getDriverStatus(req.params.id);
  return ok(res, { driverId: driver.id, status: driver.status });
});

// GET /admin/transactions — FR-21
const listTransactions = asyncHandler(async (req, res) => {
  return okList(res, await repo.listTransactions(req.headers.authorization));
});

// POST /admin/trips/:id/resolve — FR-21
const resolveTrip = asyncHandler(async (req, res) => {
  const record = repo.resolveTripIssue(req.params.id, req.body.resolutionNote, req.user.id);
  return ok(res, record, 201);
});

// ---- FR-23: báo cáo ----
const reportTrips = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportTripCount(req.headers.authorization, req.query.from, req.query.to));
});

const reportRevenue = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportRevenue(req.headers.authorization, req.query.from, req.query.to));
});

const reportCompletionRate = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportCompletionRate(req.headers.authorization, req.query.from, req.query.to));
});

const reportCancellationRate = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportCancellationRate(req.headers.authorization, req.query.from, req.query.to));
});

const reportDriverPerformance = asyncHandler(async (req, res) => {
  return okList(res, await repo.reportDriverPerformance(req.headers.authorization, req.query.from, req.query.to));
});

module.exports = {
  listCustomers,
  listDrivers,
  listVehicles,
  disableCustomer,
  listTrips,
  getDriverStatus,
  listTransactions,
  resolveTrip,
  reportTrips,
  reportRevenue,
  reportCompletionRate,
  reportCancellationRate,
  reportDriverPerformance,
};
