const repo = require("../repositories/dispatch.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const accept = asyncHandler(async (req, res) => {
  const result = await repo.accept(req.params.tripId, req.user.id);
  return ok(res, result);
});

const decline = asyncHandler(async (req, res) => {
  const result = await repo.decline(req.params.tripId, req.user.id);
  return ok(res, result);
});

const getCandidates = asyncHandler(async (req, res) => {
  const candidates = await repo.getCandidates(req.params.tripId);
  return okList(res, candidates);
});

const getMyPendingOffer = asyncHandler(async (req, res) => {
  const offer = await repo.getPendingOfferForDriver(req.user.id);
  return ok(res, offer);
});

const onTripRequested = asyncHandler(async (req, res) => {
  res.status(202).json({ received: true });
  repo.handleTripRequested(req.body.payload).catch((err) => console.error("[dispatch] xử lý TripRequested lỗi:", err));
});

module.exports = { accept, decline, getCandidates, getMyPendingOffer, onTripRequested };