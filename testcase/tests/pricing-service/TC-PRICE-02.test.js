// TC-PRICE-02 | Negative | Loại xe không tồn tại
const { req } = require("../helpers");

test("TC-PRICE-02 | Negative | Loại xe không tồn tại", async () => {
  const { status, json } = await req("POST", "/pricing/calculate", {
    body: { vehicleType: "helicopter", distanceKm: 5, durationMin: 15 },
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("UNKNOWN_VEHICLE_TYPE");
});
