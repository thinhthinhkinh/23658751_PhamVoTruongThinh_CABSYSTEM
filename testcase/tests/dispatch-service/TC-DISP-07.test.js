// TC-DISP-07 | Negative | Khách hàng cố xem danh sách candidate (chỉ ops)
const { req } = require("../helpers");
const { createTripRequest, sleep } = require("./_setup");

test("TC-DISP-07 | Negative | Khách hàng cố xem danh sách candidate (chỉ ops)", async () => {
  const { tripId, customerToken } = await createTripRequest({ lat: 10.77, lng: 106.70 }, { lat: 10.78, lng: 106.69 });
  await sleep(500);

  const { status } = await req("GET", `/dispatch/${tripId}/candidates`, { token: customerToken });

  expect(status).toBe(403);
}, 10000);
