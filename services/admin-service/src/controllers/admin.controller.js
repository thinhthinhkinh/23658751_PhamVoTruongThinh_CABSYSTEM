const repo = require("../repositories/admin.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const listCustomers = asyncHandler(async (req, res) => {
  return okList(res, await repo.listCustomers(req.user.id, req.user.role));
});

const listDrivers = asyncHandler(async (req, res) => {
  return okList(res, await repo.listDrivers(req.user.id, req.user.role));
});

const listVehicles = asyncHandler(async (req, res) => {
  return okList(res, await repo.listVehicles(req.user.id, req.user.role));
});

const disableCustomer = asyncHandler(async (req, res) => {
  return ok(res, await repo.disableCustomer(req.user.id, req.user.role, req.params.id));
});

const listBookings = asyncHandler(async (req, res) => {
  return okList(res, await repo.listBookings(req.user.id, req.user.role, req.query.status));
});

const getDriverStatus = asyncHandler(async (req, res) => {
  const driver = await repo.getDriverStatus(req.params.id);
  return ok(res, { driverId: driver.id, status: driver.status });
});

const listTransactions = asyncHandler(async (req, res) => {
  return okList(res, await repo.listTransactions(req.user.id, req.user.role));
});

const resolveBooking = asyncHandler(async (req, res) => {
  const record = await repo.resolveBookingIssue(req.params.id, req.body.resolutionNote, req.user.id);
  return ok(res, record, 201);
});

const reportBookings = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportBookingCount(req.user.id, req.user.role, req.query.from, req.query.to));
});

const reportRevenue = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportRevenue(req.user.id, req.user.role, req.query.from, req.query.to));
});

const reportCompletionRate = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportCompletionRate(req.user.id, req.user.role, req.query.from, req.query.to));
});

const reportCancellationRate = asyncHandler(async (req, res) => {
  return ok(res, await repo.reportCancellationRate(req.user.id, req.user.role, req.query.from, req.query.to));
});

const reportDriverPerformance = asyncHandler(async (req, res) => {
  return okList(res, await repo.reportDriverPerformance(req.user.id, req.user.role, req.query.from, req.query.to));
});

module.exports = {
  listCustomers,
  listDrivers,
  listVehicles,
  disableCustomer,
  listBookings,
  getDriverStatus,
  listTransactions,
  resolveBooking,
  reportBookings,
  reportRevenue,
  reportCompletionRate,
  reportCancellationRate,
  reportDriverPerformance,
};
