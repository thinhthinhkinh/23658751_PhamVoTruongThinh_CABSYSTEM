// TC-LOC-04 | Positive | Lọc tài xế theo bán kính tìm kiếm
const { req, signDriverToken, uuid } = require("../helpers");

test("TC-LOC-04 | Positive | Lọc tài xế theo bán kính tìm kiếm", async () => {
  const nearId = uuid();
  const farId = uuid();
  const center = { lat: 10.77, lng: 106.70 };

  // ~0.5km từ tâm
  await req("POST", "/locations", { token: signDriverToken(nearId), body: { lat: 10.7745, lng: 106.70 } });
  // ~5km từ tâm
  await req("POST", "/locations", { token: signDriverToken(farId), body: { lat: 10.815, lng: 106.70 } });

  const { status, json } = await req(
    "GET",
    `/locations/nearby-drivers?lat=${center.lat}&lng=${center.lng}&radiusKm=1&driverIds=${nearId},${farId}`
  );

  expect(status).toBe(200);
  const ids = json.data.map((d) => d.driverId);
  expect(ids).toContain(nearId);
  expect(ids).not.toContain(farId);
});
