// TC-PAY-01 | Positive | Thanh toán tiền mặt luôn thành công
const { req, signCustomerToken, uuid } = require("../helpers");
const { seedFare } = require("./_setup");

test("TC-PAY-01 | Positive | Thanh toán tiền mặt luôn thành công", async () => {
  const tripId = await seedFare(70000);
  const { status, json } = await req("POST", "/payments", {
    token: signCustomerToken(uuid()),
    body: { tripId, method: "cash" },
  });

  expect(status).toBe(201);
  expect(json.data.status).toBe("success");
  expect(json.data.providerRef).toBeNull();
  expect(json.data.amount).toBe(70000);
});
