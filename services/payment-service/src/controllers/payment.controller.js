const repo = require("../repositories/payment.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || "http://localhost:4003";

// POST /payments — FR-15
const create = asyncHandler(async (req, res) => {
  const payment = await repo.createAndProcess(req.body);
  return ok(res, payment, 201);
});

// GET /payments/:id — FR-15
const getById = asyncHandler(async (req, res) => {
  const payment = repo.getById(req.params.id);
  return ok(res, payment);
});

// POST /payments/:id/retry — FR-16
const retry = asyncHandler(async (req, res) => {
  const payment = await repo.retry(req.params.id);
  return ok(res, payment);
});

// POST /payments/webhook — callback từ cổng thanh toán ngoài (FR-15, FR-16)
const webhook = asyncHandler(async (req, res) => {
  const payment = repo.handleWebhook(req.body);
  return ok(res, payment);
});

// GET /customers/me/payments — FR-05
// Payment Service không sở hữu dữ liệu chuyến đi, nên gọi sang Trip Service (kèm nguyên
// Authorization header của khách hàng) để lấy danh sách tripId của họ trước.
const getMyPayments = asyncHandler(async (req, res) => {
  const tripRes = await fetch(`${TRIP_SERVICE_URL}/customers/me/trips`, {
    headers: { Authorization: req.headers.authorization },
  });
  const tripBody = await tripRes.json();
  const tripIds = (tripBody?.data || []).map((t) => t.id);
  return okList(res, repo.listByTripIds(tripIds));
});

// POST /events/fare-calculated — webhook nội bộ nhận event "FareCalculated" từ event bus
const onFareCalculated = asyncHandler(async (req, res) => {
  const { payload } = req.body;
  repo.cacheFare(payload.tripId, payload.amount);
  return res.status(200).json({ received: true });
});

// GET /payments — FR-21, dùng cho Admin Service tra cứu giao dịch
const listAll = asyncHandler(async (req, res) => {
  return okList(res, repo.listAll());
});

module.exports = { create, getById, retry, webhook, getMyPayments, onFareCalculated, listAll };
