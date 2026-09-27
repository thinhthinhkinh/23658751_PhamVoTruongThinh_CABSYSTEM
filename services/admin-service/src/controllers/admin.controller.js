const repo = require("../repositories/admin.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const listCustomers = asyncHandler(async (req, res) => {
  return okList(res, await repo.listCustomers(req.headers.authorization));
});

const listDrivers = asyncHandler(async (req, res) => {
  return okList(res, await repo.listDrivers(req.headers.authorization));
});

const listVehicles = asyncHandler(async (req, res) => {
  return okList(res, await repo.listVehicles(req.headers.authorization));
});

const disableCustomer = asyncHandler(async (req, res) => {
  return ok(res, await repo.disableCustomer(req.headers.authorization, req.params.id));
});

const listTrips = asyncHandler(async (req, res) => {
  return okList(res, await repo.listTrips(req.headers.authorization, req.query.status));
});

const getDriverStatus = asyncHandler(async (req, res) => {
  const driver = await repo.getDriverStatus(req.params.id);
  return ok(res, { driverId: driver.id, status: driver.status });
});

const listTransactions = asyncHandler(async (req, res) => {
  return okList(res, await repo.listTransactions(req.headers.authorization));
});

const resolveTrip = asyncHandler(async (req, res) => {
  const record = await repo.resolveTripIssue(req.params.id, req.body.resolutionNote, req.user.id);
  return ok(res, record, 201);
});

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