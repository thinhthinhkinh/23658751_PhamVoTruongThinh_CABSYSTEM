const { v4: uuidv4 } = require("uuid");
const dao = require("../daos/payment.dao");
const fareCacheDao = require("../daos/fareCache.dao");
const { createPayment } = require("../models/payment.model");
const gateway = require("../utils/mockGateway");
const eventBus = require("../utils/eventBusClient");
const AppError = require("../utils/AppError");

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || "http://localhost:4003";
const VALID_METHODS = ["cash", "e-wallet", "card"];

// Lấy số tiền cần thanh toán: ưu tiên cache từ event FareCalculated,
// nếu chưa có thì fallback gọi trực tiếp sang Trip Service (đồng bộ).
async function resolveAmount(tripId) {
  const cached = fareCacheDao.findByTripId(tripId);
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

// FR-15: khởi tạo thanh toán (tiền mặt hoặc điện tử)
async function createAndProcess({ tripId, method }) {
  if (!tripId || !VALID_METHODS.includes(method)) {
    throw new AppError(400, "INVALID_INPUT", `method phải thuộc [${VALID_METHODS.join(", ")}]`);
  }
  if (dao.findByTripId(tripId)) {
    throw new AppError(409, "PAYMENT_ALREADY_EXISTS", "Chuyến này đã có giao dịch thanh toán");
  }

  const amount = await resolveAmount(tripId);
  const payment = dao.insert(createPayment({ id: uuidv4(), tripId, method, amount }));

  return settle(payment);
}

// Gọi cổng thanh toán (mock) và cập nhật kết quả + phát event tương ứng
async function settle(payment) {
  const result = await gateway.charge({ method: payment.method, amount: payment.amount });

  if (result.success) {
    const updated = dao.update(payment.id, { status: "success", providerRef: result.providerRef, failReason: null });
    await eventBus.publish("PaymentCompleted", { tripId: updated.tripId, paymentId: updated.id, method: updated.method });
    return updated;
  }

  const updated = dao.update(payment.id, { status: "failed", failReason: result.reason });
  await eventBus.publish("PaymentFailed", { tripId: updated.tripId, paymentId: updated.id, reason: result.reason });
  return updated;
}

function getById(id) {
  const payment = dao.findById(id);
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch");
  return payment;
}

// FR-16: xử lý lại khi giao dịch điện tử thất bại
async function retry(id) {
  const payment = getById(id);
  if (payment.status !== "failed") {
    throw new AppError(409, "NOT_RETRYABLE", "Chỉ có thể thử lại giao dịch đang ở trạng thái failed");
  }
  return settle(payment);
}

// Xử lý callback thật từ cổng thanh toán ngoài (nếu tích hợp gateway thật thay cho mock)
function handleWebhook({ paymentId, status, providerRef }) {
  const payment = getById(paymentId);
  const patch = status === "success" ? { status: "success", providerRef } : { status: "failed", failReason: "Cổng thanh toán báo thất bại" };
  const updated = dao.update(payment.id, patch);
  const eventName = status === "success" ? "PaymentCompleted" : "PaymentFailed";
  eventBus.publish(eventName, { tripId: updated.tripId, paymentId: updated.id, method: updated.method });
  return updated;
}

function listByTripIds(tripIds) {
  return dao.findByCustomerTripIds(tripIds);
}

// FR-21: quản trị — tra cứu toàn bộ lịch sử giao dịch
function listAll() {
  return dao.findAll();
}

// Subscriber nội bộ cho event "FareCalculated" — cache số tiền để dùng khi tạo payment
function cacheFare(tripId, amount) {
  return fareCacheDao.upsert(tripId, amount);
}

module.exports = { createAndProcess, getById, retry, handleWebhook, listByTripIds, listAll, cacheFare };
