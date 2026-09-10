// TC-DISP-01 | Positive | Tìm và đề xuất tài xế gần nhất
const { req } = require("../helpers");
const { registerAvailableDriver, createTripRequest, sleep } = require("./_setup");

test("TC-DISP-01 | Positive | Tìm và đề xuất tài xế gần nhất", async () => {
  const pickup = { lat: 10.77, lng: 106.70 };
  const near = await registerAvailableDriver(10.771, 106.70); // ~0.1km
  const far = await registerAvailableDriver(10.79, 106.70); // ~2.2km

  const { tripId } = await createTripRequest(pickup, { lat: 10.78, lng: 106.69 });
  await sleep(1200);

  const offerNear = await req("GET", "/dispatch/drivers/me/pending", { token: near.driverToken });
  const offerFar = await req("GET", "/dispatch/drivers/me/pending", { token: far.driverToken });

  expect(offerNear.json.data?.tripId).toBe(tripId); // tài xế gần được đề xuất
  expect(offerFar.json.data).toBeNull(); // tài xế xa CHƯA được đề xuất (đang xếp hàng chờ)
}, 10000);
