// TC-TRIP-07 | Positive | Hoàn thành chuyến, tự động tính cước
const { req } = require("../helpers");
const { createAssignedTrip } = require("./_setup");

test("TC-TRIP-07 | Positive | Hoàn thành chuyến, tự động tính cước (cần Pricing Service)", async () => {
  const { tripId, driverToken } = await createAssignedTrip();

  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "arrived" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "picked_up" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "in_progress" } });

  const { status, json } = await req("PATCH", `/trips/${tripId}/status`, {
    token: driverToken,
    body: { status: "completed", distanceKm: 5, durationMin: 15 },
  });

  expect(status).toBe(200);
  expect(json.data.status).toBe("completed");
  expect(typeof json.data.fareAmount).toBe("number");
  expect(json.data.fareAmount).toBeGreaterThan(0);
});
