// TC-PAY-02 | Positive | Thanh toán điện tử thành công
// Mock gateway trả success ~85% ngẫu nhiên -> thử nhiều lần (mỗi lần 1 tripId mới)
// đến khi gặp 1 lần thành công, để test không bị "may rủi" (flaky).
const { req, signCustomerToken, uuid } = require("../helpers");
const { seedFare } = require("./_setup");

test("TC-PAY-02 | Positive | Thanh toán điện tử thành công", async () => {
  let found = null;
  for (let i = 0; i < 20 && !found; i++) {
    const tripId = await seedFare(70000);
    const { json } = await req("POST", "/payments", {
      token: signCustomerToken(uuid()),
      body: { tripId, method: "e-wallet" },
    });
    if (json.data.status === "success") found = json.data;
  }

  expect(found).not.toBeNull();
  expect(found.providerRef).toMatch(/^PROV-/);
});
