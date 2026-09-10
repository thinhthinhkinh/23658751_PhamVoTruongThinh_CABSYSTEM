// TC-DISP-05 | Negative | Tài xế không phải ứng viên hiện tại cố nhận chuyến
const { req } = require("../helpers");
const { registerAvailableDriver, createTripRequest, sleep } = require("./_setup");

test("TC-DISP-05 | Negative | Tài xế không phải ứng viên hiện tại cố nhận chuyến", async () => {
  const pickup = { lat: 23.77, lng: 106.70 };
  const near = await registerAvailableDriver(23.771, 106.70); // sẽ được offer trước
  const stranger = await registerAvailableDriver(23.85, 106.70); // xa hơn nhưng vẫn trong bán kính -> "waiting", chưa tới lượt offer

  const { tripId } = await createTripRequest(pickup, { lat: 23.78, lng: 106.69 });
  await sleep(1000);

  // stranger không phải candidate đang được offer -> accept phải thất bại
  const { status, json } = await req("POST", `/dispatch/${tripId}/accept`, { token: stranger.driverToken });

  expect(status).toBe(409);
  expect(json.error.code).toBe("NOT_CURRENT_CANDIDATE");
}, 10000);
