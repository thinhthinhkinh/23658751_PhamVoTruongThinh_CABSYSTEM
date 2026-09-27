const repo = require("../repositories/trip.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const create = asyncHandler(async (req, res) => {
  const trip = await repo.createTripRequest(req.user.id, req.body);
  return ok(res, trip, 201);
});

const getById = asyncHandler(async (req, res) => {
  const trip = await repo.getOwnedById(req.params.id, req.user);
  return ok(res, trip);
});

const getStatus = asyncHandler(async (req, res) => {
  const trip = await repo.getOwnedById(req.params.id, req.user);
  return ok(res, { id: trip.id, status: trip.status });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, distanceKm, durationMin } = req.body;
  const trip = await repo.updateStatusByDriver(req.params.id, req.user.id, status, { distanceKm, durationMin });
  return ok(res, trip);
});

const cancel = asyncHandler(async (req, res) => {
  const trip = await repo.cancelTrip(req.params.id, req.user.id);
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

const myTripsAsCustomer = asyncHandler(async (req, res) => {
  const trips = await repo.listByCustomerId(req.user.id);
  return okList(res, trips);
});

const myTripsAsDriver = asyncHandler(async (req, res) => {
  const trips = await repo.listByDriverId(req.user.id);
  return okList(res, trips);
});

const getInternal = asyncHandler(async (req, res) => {
  const trip = await repo.getInternal(req.params.id);
  return ok(res, trip);
});

const listAll = asyncHandler(async (req, res) => {
  const trips = await repo.listAll(req.query.status);
  return okList(res, trips);
});

const onDriverAssigned = asyncHandler(async (req, res) => {
  await repo.handleDriverAssigned(req.body.payload);
  return res.status(200).json({ received: true });
});

const onNoDriverFound = asyncHandler(async (req, res) => {
  await repo.handleNoDriverFound(req.body.payload);
  return res.status(200).json({ received: true });
});

module.exports = {
  create,
  getById,
  getStatus,
  updateStatus,
  cancel,
  addRating,
  getDriverRatings,
  myTripsAsCustomer,
  myTripsAsDriver,
  getInternal,
  listAll,
  onDriverAssigned,
  onNoDriverFound,
};