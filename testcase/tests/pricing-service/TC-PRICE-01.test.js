// TC-PRICE-01 | Positive | Tính cước đúng công thức cho loại xe hợp lệ
const { req } = require("../helpers");

test("TC-PRICE-01 | Positive | Tính cước đúng công thức cho loại xe hợp lệ", async () => {
  const { status, json } = await req("POST", "/pricing/calculate", {
    body: { vehicleType: "4-seat", distanceKm: 5, durationMin: 15 },
  });

  expect(status).toBe(200);
  // baseFare=15000, perKmRate=9500, perMinuteRate=500 (xem data/pricingRules.json)
  // amount = 15000 + 5*9500 + 15*500 = 69500
  expect(json.data.amount).toBe(15000 + 5 * 9500 + 15 * 500);
  expect(json.data.currency).toBe("VND");
});
