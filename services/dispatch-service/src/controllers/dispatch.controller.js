const repo = require("../repositories/dispatch.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// POST /dispatch/:tripId/accept — FR-12
const accept = asyncHandler(async (req, res) => {
  const result = await repo.accept(req.params.tripId, req.user.id);
  return ok(res, result);
});

// POST /dispatch/:tripId/decline — FR-08, FR-12
const decline = asyncHandler(async (req, res) => {
  const result = await repo.decline(req.params.tripId, req.user.id);
  return ok(res, result);
});

// GET /dispatch/:tripId/candidates — FR-06, FR-07
const getCandidates = asyncHandler(async (req, res) => {
  return okList(res, repo.getCandidates(req.params.tripId));
});

// GET /dispatch/drivers/me/pending — tiện ích demo, tài xế poll xem có đang được đề xuất chuyến không
const getMyPendingOffer = asyncHandler(async (req, res) => {
  const offer = repo.getPendingOfferForDriver(req.user.id);
  return ok(res, offer);
});

// ---- webhook nhận event "TripRequested" từ Trip Service (qua event bus) ----
const onTripRequested = asyncHandler(async (req, res) => {
  // Trả response ngay, xử lý matching ở background để không block publisher (event bus)
  res.status(202).json({ received: true });
  repo.handleTripRequested(req.body.payload).catch((err) => console.error("[dispatch] xử lý TripRequested lỗi:", err));
});

module.exports = { accept, decline, getCandidates, getMyPendingOffer, onTripRequested };
