// TC-PAY-04 | Negative | Tạo thanh toán 2 lần cho cùng 1 chuyến
const { req, signCustomerToken, uuid } = require("../helpers");
const { seedFare } = require("./_setup");

test("TC-PAY-04 | Negative | Tạo thanh toán 2 lần cho cùng 1 chuyến", async () => {
  const tripId = await seedFare(70000);
  await req("POST", "/payments", { token: signCustomerToken(uuid()), body: { tripId, method: "cash" } });

  const { status, json } = await req("POST", "/payments", {
    token: signCustomerToken(uuid()),
    body: { tripId, method: "cash" },
  });

  expect(status).toBe(409);
  expect(json.error.code).toBe("PAYMENT_ALREADY_EXISTS");
});
