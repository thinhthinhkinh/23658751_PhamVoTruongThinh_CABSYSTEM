// TC-PAY-03 | Negative | Thanh toán điện tử thất bại
// Mock gateway trả thất bại ~15% ngẫu nhiên -> thử nhiều lần đến khi gặp 1 lần thất bại.
const { req, signCustomerToken, uuid } = require("../helpers");
const { seedFare } = require("./_setup");

test("TC-PAY-03 | Negative | Thanh toán điện tử thất bại", async () => {
  let found = null;
  for (let i = 0; i < 30 && !found; i++) {
    const tripId = await seedFare(70000);
    const { json } = await req("POST", "/payments", {
      token: signCustomerToken(uuid()),
      body: { tripId, method: "e-wallet" },
    });
    if (json.data.status === "failed") found = json.data;
  }

  expect(found).not.toBeNull();
  expect(found.failReason).toBeTruthy();
}, 20000);
