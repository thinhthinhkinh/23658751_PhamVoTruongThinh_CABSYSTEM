// TC-NOTI-03 | Positive | Thông báo khi thanh toán thất bại kèm lý do
const { req, signCustomerToken } = require("../helpers");
const { createRealTrip } = require("./_setup");

test("TC-NOTI-03 | Positive | Thông báo khi thanh toán thất bại kèm lý do", async () => {
  const { tripId, customerId } = await createRealTrip();
  const reason = "Ngân hàng từ chối giao dịch (mô phỏng)";

  await req("POST", "/notifications/events/payment-failed", {
    body: { event: "PaymentFailed", payload: { tripId, paymentId: "pay-x", reason } },
  });

  const { json } = await req("GET", "/notifications/me", { token: signCustomerToken(customerId) });

  const noti = json.data.find((n) => n.title === "Thanh toán thất bại");
  expect(noti).toBeDefined();
  expect(noti.body).toContain(reason);
});
