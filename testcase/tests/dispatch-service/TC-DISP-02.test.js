// TC-DISP-02 | Positive | Không có tài xế nào sẵn sàng
const { req } = require("../helpers");
const { createTripRequest, sleep } = require("./_setup");

test("TC-DISP-02 | Positive | Không có tài xế nào sẵn sàng -> NoDriverFound", async () => {
  // Điểm đón ở giữa đại dương, chắc chắn không có tài xế nào (đăng ký ở test khác) nằm gần đó
  const remotePickup = { lat: -10, lng: -70 };
  const { tripId, customerToken } = await createTripRequest(remotePickup, { lat: -10.1, lng: -70.1 });

  await sleep(1200);

  const { json } = await req("GET", `/trips/${tripId}`, { token: customerToken });
  expect(json.data.status).toBe("no_driver_found");
}, 10000);
