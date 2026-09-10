// TC-DISP-04 | Positive | Tài xế từ chối, hệ thống tự chuyển tài xế khác
const { req } = require("../helpers");
const { registerAvailableDriver, createTripRequest, sleep } = require("./_setup");

test("TC-DISP-04 | Positive | Tài xế từ chối, hệ thống tự chuyển tài xế khác", async () => {
  const pickup = { lat: 22.77, lng: 106.70 };
  const driverA = await registerAvailableDriver(22.771, 106.70);
  const driverB = await registerAvailableDriver(22.79, 106.70);

  const { tripId } = await createTripRequest(pickup, { lat: 22.78, lng: 106.69 });
  await sleep(1000);

  const declineRes = await req("POST", `/dispatch/${tripId}/decline`, { token: driverA.driverToken });
  expect(declineRes.status).toBe(200);

  await sleep(800);
  const offerB = await req("GET", "/dispatch/drivers/me/pending", { token: driverB.driverToken });
  expect(offerB.json.data?.tripId).toBe(tripId); // KHÔNG cần khách hàng tạo lại yêu cầu
}, 10000);
