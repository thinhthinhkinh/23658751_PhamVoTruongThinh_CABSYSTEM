// TC-DISP-06 | Positive | Tài xế chấp nhận chuyến thành công
const { req } = require("../helpers");
const { registerAvailableDriver, createTripRequest, sleep } = require("./_setup");

test("TC-DISP-06 | Positive | Tài xế chấp nhận chuyến thành công", async () => {
  const pickup = { lat: 24.77, lng: 106.70 };
  const driver = await registerAvailableDriver(24.771, 106.70);

  const { tripId, customerToken } = await createTripRequest(pickup, { lat: 24.78, lng: 106.69 });
  await sleep(1000);

  const acceptRes = await req("POST", `/dispatch/${tripId}/accept`, { token: driver.driverToken });
  expect(acceptRes.status).toBe(200);
  expect(acceptRes.json.data.driverId).toBe(driver.driverId);
  expect(typeof acceptRes.json.data.eta).toBe("number");

  await sleep(500);
  const tripRes = await req("GET", `/trips/${tripId}`, { token: customerToken });
  expect(tripRes.json.data.status).toBe("driver_assigned");
  expect(tripRes.json.data.driverId).toBe(driver.driverId);
}, 10000);
