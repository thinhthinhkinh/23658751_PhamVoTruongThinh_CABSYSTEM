// TC-DISP-01 | Positive | Tìm và đề xuất tài xế gần nhất
const { req } = require("../helpers");
const { registerAvailableDriver, createTripRequest, sleep } = require("./_setup");

test("TC-DISP-01 | Positive | Tìm và đề xuất tài xế gần nhất", async () => {
  const pickup = { lat: 10.77, lng: 106.70 };
  const near = await registerAvailableDriver(10.771, 106.70);
  const far = await registerAvailableDriver(10.79, 106.70);

  const { tripId } = await createTripRequest(pickup, { lat: 10.78, lng: 106.69 });
  await sleep(2500);

  const offerNear = await req("GET", "/dispatch/drivers/me/pending", { token: near.driverToken });
  const offerFar = await req("GET", "/dispatch/drivers/me/pending", { token: far.driverToken });

  expect(offerNear.json.data?.tripId).toBe(tripId);
  expect(offerFar.json.data).toBeNull();
}, 15000);