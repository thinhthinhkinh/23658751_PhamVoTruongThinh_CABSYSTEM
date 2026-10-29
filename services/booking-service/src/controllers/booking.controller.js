const repo = require("../repositories/booking.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const create = asyncHandler(async (req, res) => {
  const booking = await repo.createBookingRequest(req.user.id, req.body);
  return ok(res, booking, 201);
});

const getById = asyncHandler(async (req, res) => {
  const booking = await repo.getOwnedById(req.params.id, req.user);
  return ok(res, booking);
});

const getStatus = asyncHandler(async (req, res) => {
  const booking = await repo.getOwnedById(req.params.id, req.user);
  return ok(res, { bookingId: booking.bookingId, status: booking.status });
});

const cancel = asyncHandler(async (req, res) => {
  const booking = await repo.cancelBooking(req.params.id, req.user.id);
  return ok(res, booking);
});

const myBookingsAsCustomer = asyncHandler(async (req, res) => {
  const { limit, page } = req.query;
  const result = await repo.listByCustomerId(req.user.id, { limit, page });
  if (limit && page) {
    return okList(res, result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) });
  }
  return okList(res, result);
});

const getInternal = asyncHandler(async (req, res) => {
  const booking = await repo.getInternal(req.params.id);
  return ok(res, booking);
});

const listAll = asyncHandler(async (req, res) => {
  const bookings = await repo.listAll(req.query.status);
  return okList(res, bookings);
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
  cancel,
  myBookingsAsCustomer,
  getInternal,
  listAll,
  onDriverAssigned,
  onNoDriverFound,
};
