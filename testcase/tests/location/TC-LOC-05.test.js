// TC-LOC-05 | Positive | Kết quả sắp xếp theo khoảng cách tăng dần
const { req, signDriverToken, uuid } = require("../helpers");

test("TC-LOC-05 | Positive | Kết quả sắp xếp theo khoảng cách tăng dần", async () => {
  const idA = uuid(); // gần nhất
  const idB = uuid(); // trung bình
  const idC = uuid(); // xa nhất (trong bán kính 10km)
  const center = { lat: 10.77, lng: 106.70 };

  await req("POST", "/locations", { token: signDriverToken(idA), body: { lat: 10.771, lng: 106.70 } });
  await req("POST", "/locations", { token: signDriverToken(idB), body: { lat: 10.775, lng: 106.70 } });
  await req("POST", "/locations", { token: signDriverToken(idC), body: { lat: 10.78, lng: 106.70 } });

  const { status, json } = await req(
    "GET",
    `/locations/nearby-drivers?lat=${center.lat}&lng=${center.lng}&radiusKm=10&driverIds=${idC},${idA},${idB}`
  );

  expect(status).toBe(200);
  const ordered = json.data.map((d) => d.driverId);
  expect(ordered).toEqual([idA, idB, idC]); // phải sắp lại đúng thứ tự gần -> xa, bất kể thứ tự truyền vào
  for (let i = 1; i < json.data.length; i++) {
    expect(json.data[i].distanceKm).toBeGreaterThanOrEqual(json.data[i - 1].distanceKm);
  }
});
