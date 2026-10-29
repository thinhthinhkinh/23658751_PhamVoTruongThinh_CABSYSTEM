const repo = require("../repositories/trip.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const getByBookingId = asyncHandler(async (req, res) => {
  const trip = await repo.getByBookingId(req.params.id, req.user);
  return ok(res, trip);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, distanceKm, durationMin } = req.body;
  const trip = await repo.updateStatus(req.params.id, req.user.id, status, { distanceKm, durationMin });
  return ok(res, trip);
});

const addRating = asyncHandler(async (req, res) => {
  const rating = await repo.addRating(req.params.id, req.user.id, req.body);
  return ok(res, rating, 201);
});

const getDriverRatings = asyncHandler(async (req, res) => {
  const result = await repo.getDriverRatings(req.params.id);
  return ok(res, result);
});

const myTripsAsDriver = asyncHandler(async (req, res) => {
  const { limit, page } = req.query;
  const result = await repo.listByDriverId(req.user.id, { limit, page });
  if (limit && page) {
    return okList(res, result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) });
  }
  return okList(res, result);
});

const myTripsAsCustomer = asyncHandler(async (req, res) => {
  const { limit, page } = req.query;
  const result = await repo.listByCustomerId(req.user.id, { limit, page });
  if (limit && page) {
    return okList(res, result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) });
  }
  return okList(res, result);
});

const getInternal = asyncHandler(async (req, res) => {
  const trip = await repo.getInternalByBookingId(req.params.id);
  return ok(res, trip);
});

const onDriverAssigned = asyncHandler(async (req, res) => {
  await repo.createTripFromEvent(req.body.payload);
  return res.status(200).json({ received: true });
});

module.exports = { getByBookingId, updateStatus, addRating, getDriverRatings, myTripsAsDriver, myTripsAsCustomer, getInternal, onDriverAssigned };
