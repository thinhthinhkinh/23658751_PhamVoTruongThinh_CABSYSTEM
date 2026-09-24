// TC-DISP-03 | Positive | Tài xế không phản hồi quá thời gian quy định -> tự động chuyển tài xế khác
// ⚠️ Cần chạy Dispatch Service với DISPATCH_OFFER_TIMEOUT_SEC nhỏ (vd 3s) để test không phải chờ lâu.
const { req } = require("../helpers");
const { registerAvailableDriver, createTripRequest, sleep } = require("./_setup");

const TIMEOUT_SEC = parseInt(process.env.DISPATCH_OFFER_TIMEOUT_SEC || "3", 10);

test("TC-DISP-03 | Positive | Tài xế không phản hồi quá thời gian quy định", async () => {
  const pickup = { lat: 21.77, lng: 106.70 };
  const near = await registerAvailableDriver(21.771, 106.70);
  const far = await registerAvailableDriver(21.79, 106.70);

  const { tripId } = await createTripRequest(pickup, { lat: 21.78, lng: 106.69 });
  await sleep(1000);

  const offerNear = await req("GET", "/dispatch/drivers/me/pending", { token: near.driverToken });
  expect(offerNear.json.data?.tripId).toBe(tripId); // xác nhận near đang được offer

  // Cố tình KHÔNG accept/decline, chờ quá timeout
  await sleep(TIMEOUT_SEC * 1000 + 1000);

  const offerFar = await req("GET", "/dispatch/drivers/me/pending", { token: far.driverToken });
  expect(offerFar.json.data?.tripId).toBe(tripId); // hệ thống tự chuyển sang far sau timeout
}, (TIMEOUT_SEC + 5) * 1000);
