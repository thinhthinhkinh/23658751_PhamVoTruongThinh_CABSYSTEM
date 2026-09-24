// TC-PRICE-03 | Negative | Dữ liệu quãng đường/thời gian không hợp lệ
const { req } = require("../helpers");

test("TC-PRICE-03 | Negative | Dữ liệu quãng đường/thời gian không hợp lệ", async () => {
  const { status, json } = await req("POST", "/pricing/calculate", {
    body: { vehicleType: "4-seat", distanceKm: "xa lắm", durationMin: 15 },
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("INVALID_INPUT");
});
