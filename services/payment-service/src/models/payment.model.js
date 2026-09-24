// Model: 1 giao dịch thanh toán (FR-15, FR-16)
// Lưu ý BR-06: KHÔNG lưu số thẻ/tài khoản thanh toán nhạy cảm — chỉ lưu providerRef
// (mã tham chiếu phía cổng thanh toán ngoài).
function createPayment({ id, tripId, method, amount }) {
  const now = new Date().toISOString();
  return {
    id,
    tripId,
    method, // "cash" | "e-wallet" | "card"
    amount,
    status: "pending", // pending | success | failed
    providerRef: null,
    failReason: null,
    createdAt: now,
    updatedAt: now,
  };
}

module.exports = { createPayment };
