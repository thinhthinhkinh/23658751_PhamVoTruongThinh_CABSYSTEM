// TC-PAY-05 | Negative | Thử lại giao dịch đã thành công
const { req, signCustomerToken, uuid } = require("../helpers");
const { seedFare } = require("./_setup");

test("TC-PAY-05 | Negative | Thử lại giao dịch đã thành công (cash luôn success)", async () => {
  const tripId = await seedFare(70000);
  const payRes = await req("POST", "/payments", { token: signCustomerToken(uuid()), body: { tripId, method: "cash" } });
  const paymentId = payRes.json.data.id;

  const { status, json } = await req("POST", `/payments/${paymentId}/retry`, { token: signCustomerToken(uuid()) });

  expect(status).toBe(409);
  expect(json.error.code).toBe("NOT_RETRYABLE");
});
