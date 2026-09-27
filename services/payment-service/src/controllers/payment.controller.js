const repo = require("../repositories/payment.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || "http://localhost:4003";

const create = asyncHandler(async (req, res) => {
  const payment = await repo.createAndProcess(req.body);
  return ok(res, payment, 201);
});

const getById = asyncHandler(async (req, res) => {
  const payment = await repo.getById(req.params.id);
  return ok(res, payment);
});

const retry = asyncHandler(async (req, res) => {
  const payment = await repo.retry(req.params.id);
  return ok(res, payment);
});

const webhook = asyncHandler(async (req, res) => {
  const payment = await repo.handleWebhook(req.body);
  return ok(res, payment);
});

const getMyPayments = asyncHandler(async (req, res) => {
  const tripRes = await fetch(`${TRIP_SERVICE_URL}/customers/me/trips`, {
    headers: { Authorization: req.headers.authorization },
  });
  const tripBody = await tripRes.json();
  const tripIds = (tripBody?.data || []).map((t) => t.id);
  const payments = await repo.listByTripIds(tripIds);
  return okList(res, payments);
});

const onFareCalculated = asyncHandler(async (req, res) => {
  const { payload } = req.body;
  await repo.cacheFare(payload.tripId, payload.amount);
  return res.status(200).json({ received: true });
});

const listAll = asyncHandler(async (req, res) => {
  const payments = await repo.listAll();
  return okList(res, payments);
});

module.exports = { create, getById, retry, webhook, getMyPayments, onFareCalculated, listAll };