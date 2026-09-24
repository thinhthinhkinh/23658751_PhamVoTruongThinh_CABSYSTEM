const repo = require("../repositories/trip.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// POST /trips — FR-03
const create = asyncHandler(async (req, res) => {
  const trip = await repo.createTripRequest(req.user.id, req.body);
  return ok(res, trip, 201);
});

// GET /trips/:id — FR-04
const getById = asyncHandler(async (req, res) => {
  const trip = repo.getOwnedById(req.params.id, req.user);
  return ok(res, trip);
});

// GET /trips/:id/status — FR-04
const getStatus = asyncHandler(async (req, res) => {
  const trip = repo.getOwnedById(req.params.id, req.user);
  return ok(res, { id: trip.id, status: trip.status });
});

// PATCH /trips/:id/status — FR-13
const updateStatus = asyncHandler(async (req, res) => {
  const { status, distanceKm, durationMin } = req.body;
  const trip = await repo.updateStatusByDriver(req.params.id, req.user.id, status, { distanceKm, durationMin });
  return ok(res, trip);
});

// POST /trips/:id/cancel
const cancel = asyncHandler(async (req, res) => {
  const trip = await repo.cancelTrip(req.params.id, req.user.id);
  return ok(res, trip);
});

// POST /trips/:id/rating — FR-05
const addRating = asyncHandler(async (req, res) => {
  const rating = await repo.addRating(req.params.id, req.user.id, req.body);
  return ok(res, rating, 201);
});

// GET /drivers/:id/ratings — FR-05
const getDriverRatings = asyncHandler(async (req, res) => {
  return ok(res, repo.getDriverRatings(req.params.id));
});

// GET /customers/me/trips — FR-05
const myTripsAsCustomer = asyncHandler(async (req, res) => {
  return okList(res, repo.listByCustomerId(req.user.id));
});

// GET /drivers/me/trips
const myTripsAsDriver = asyncHandler(async (req, res) => {
  return okList(res, repo.listByDriverId(req.user.id));
});

// GET /trips/:id/internal — service-to-service, không auth
const getInternal = asyncHandler(async (req, res) => {
  const trip = repo.getInternal(req.params.id);
  return ok(res, trip);
});

// GET /trips?status= — FR-21, dùng cho Admin Service tổng hợp báo cáo
const listAll = asyncHandler(async (req, res) => {
  return okList(res, repo.listAll(req.query.status));
});

// ---- webhook nhận event từ Dispatch Service (qua event bus) ----
const onDriverAssigned = asyncHandler(async (req, res) => {
  repo.handleDriverAssigned(req.body.payload);
  return res.status(200).json({ received: true });
});

const onNoDriverFound = asyncHandler(async (req, res) => {
  repo.handleNoDriverFound(req.body.payload);
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