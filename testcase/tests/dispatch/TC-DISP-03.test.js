// TC-DISP-03 | Positive | Tài xế không phản hồi quá thời gian quy định
const { req } = require("../helpers");
const { registerAvailableDriver, createTripRequest, sleep } = require("./_setup");

const TIMEOUT_SEC = parseInt(process.env.DISPATCH_OFFER_TIMEOUT_SEC || "3", 10);

test("TC-DISP-03 | Positive | Tài xế không phản hồi quá thời gian quy định", async () => {
  const pickup = { lat: 21.77, lng: 106.70 };
  const near = await registerAvailableDriver(21.771, 106.70);
  const far = await registerAvailableDriver(21.79, 106.70);

  const { bookingId } = await createTripRequest(pickup, { lat: 21.78, lng: 106.69 });
  await sleep(1200); // PHẢI ngắn hơn TIMEOUT_SEC*1000 (3000ms), chỉ đủ để offer đầu tiên được tạo

  const offerNear = await req("GET", "/dispatch/drivers/me/pending", { token: near.driverToken });
  expect(offerNear.json.data?.bookingId).toBe(bookingId);

  await sleep(TIMEOUT_SEC * 1000 + 1500);

  const offerFar = await req("GET", "/dispatch/drivers/me/pending", { token: far.driverToken });
  expect(offerFar.json.data?.bookingId).toBe(bookingId);
}, (TIMEOUT_SEC + 15) * 1000);