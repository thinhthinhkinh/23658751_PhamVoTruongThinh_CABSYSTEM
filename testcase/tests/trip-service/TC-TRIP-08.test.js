// TC-TRIP-08 | Negative | Hủy chuyến khi đang thực hiện giữa đường
const { req } = require("../helpers");
const { createAssignedTrip } = require("./_setup");

test("TC-TRIP-08 | Negative | Hủy chuyến khi đang thực hiện giữa đường (in_progress)", async () => {
  const { tripId, customerToken, driverToken } = await createAssignedTrip();

  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "arrived" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "picked_up" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "in_progress" } });

  const { status, json } = await req("POST", `/trips/${tripId}/cancel`, { token: customerToken });

  expect(status).toBe(409);
  expect(json.error.code).toBe("NOT_CANCELLABLE");
});
