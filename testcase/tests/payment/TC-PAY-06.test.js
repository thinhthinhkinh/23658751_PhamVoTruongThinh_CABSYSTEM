// TC-PAY-06 | Positive | Thử lại giao dịch thất bại
const { req, signCustomerToken, uuid } = require("../helpers");
const { seedFare } = require("./_setup");

test("TC-PAY-06 | Positive | Thử lại giao dịch thất bại", async () => {
  // Tạo 1 giao dịch e-wallet, thử nhiều lần đến khi gặp trạng thái failed
  let failedPayment = null;
  for (let i = 0; i < 30 && !failedPayment; i++) {
    const tripId = await seedFare(70000);
    const { json } = await req("POST", "/payments", { token: signCustomerToken(uuid()), body: { tripId, method: "e-wallet" } });
    if (json.data.status === "failed") failedPayment = json.data;
  }
  expect(failedPayment).not.toBeNull();

  const { status, json } = await req("POST", `/payments/${failedPayment.id}/retry`, { token: signCustomerToken(uuid()) });

  expect(status).toBe(200);
  expect(["success", "failed"]).toContain(json.data.status); // thử lại xong, kết quả mới có thể success hoặc failed tiếp
}, 20000);
