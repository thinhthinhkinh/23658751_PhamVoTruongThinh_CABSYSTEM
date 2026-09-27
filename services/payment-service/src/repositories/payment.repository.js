const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/payment.dao");
const fareCacheDao = require("../daos/fareCache.dao");
const gateway = require("../utils/mockGateway");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || "http://localhost:4003";
const VALID_METHODS = ["cash", "e-wallet", "card"];

async function resolveAmount(tripId) {
  const cached = await fareCacheDao.findByTripId(tripId);
  if (cached) return cached.amount;

  const res = await fetch(`${TRIP_SERVICE_URL}/trips/${tripId}/internal`);
  if (!res.ok) {
    throw new AppError(400, "FARE_NOT_AVAILABLE", "Chưa xác định được số tiền cần thanh toán cho chuyến này");
  }
  const body = await res.json();
  const amount = body?.data?.fareAmount;
  if (typeof amount !== "number") {
    throw new AppError(400, "FARE_NOT_AVAILABLE", "Chuyến chưa được tính cước");
  }
  return amount;
}

async function createAndProcess({ tripId, method }) {
  if (!tripId || !VALID_METHODS.includes(method)) {
    throw new AppError(400, "INVALID_INPUT", `method phải thuộc [${VALID_METHODS.join(", ")}]`);
  }
  if (await dao.findByTripId(tripId)) {
    throw new AppError(409, "PAYMENT_ALREADY_EXISTS", "Chuyến này đã có giao dịch thanh toán");
  }

  const amount = await resolveAmount(tripId);
  const payment = await dao.insert({ _id: uuidv4(), tripId, method, amount });

  return settle(payment);
}

async function settle(payment) {
  const result = await gateway.charge({ method: payment.method, amount: payment.amount });

  if (result.success) {
    const updated = await dao.update(payment.id, { status: "success", providerRef: result.providerRef, failReason: null });
    await eventBus.publish("PaymentCompleted", { tripId: updated.tripId, paymentId: updated.id, method: updated.method });
    return updated;
  }

  const updated = await dao.update(payment.id, { status: "failed", failReason: result.reason });
  await eventBus.publish("PaymentFailed", { tripId: updated.tripId, paymentId: updated.id, reason: result.reason });
  return updated;
}

async function getById(id) {
  const payment = await dao.findById(id);
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch");
  return payment;
}

async function retry(id) {
  const payment = await getById(id);
  if (payment.status !== "failed") {
    throw new AppError(409, "NOT_RETRYABLE", "Chỉ có thể thử lại giao dịch đang ở trạng thái failed");
  }
  return settle(payment);
}

async function handleWebhook({ paymentId, status, providerRef }) {
  const payment = await getById(paymentId);
  const patch = status === "success" ? { status: "success", providerRef } : { status: "failed", failReason: "Cổng thanh toán báo thất bại" };
  const updated = await dao.update(payment.id, patch);
  const eventName = status === "success" ? "PaymentCompleted" : "PaymentFailed";
  await eventBus.publish(eventName, { tripId: updated.tripId, paymentId: updated.id, method: updated.method });
  return updated;
}

async function listByTripIds(tripIds) {
  return dao.findByCustomerTripIds(tripIds);
}

async function listAll() {
  return dao.findAll();
}

async function cacheFare(tripId, amount) {
  return fareCacheDao.upsert(tripId, amount);
}

module.exports = { createAndProcess, getById, retry, handleWebhook, listByTripIds, listAll, cacheFare };