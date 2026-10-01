// TC-TRIP-16 | Negative | Tài xế nhảy cóc trạng thái ở nhiều điểm khác nhau
const { req } = require("../helpers");
const { createAssignedTrip, advanceTripTo } = require("./_setup");

test("TC-TRIP-16 | Negative | Tài xế nhảy cóc trạng thái ở nhiều điểm khác nhau", async () => {
  const cases = [
    { from: "driver_assigned", jumpTo: "picked_up" },
    { from: "driver_assigned", jumpTo: "completed" },
    { from: "arrived", jumpTo: "in_progress" },
    { from: "picked_up", jumpTo: "completed" },
  ];

  for (const { from, jumpTo } of cases) {
    const { tripId, driverToken, customerToken } = await createAssignedTrip();
    await advanceTripTo(tripId, driverToken, from);

    const body = jumpTo === "completed" ? { status: jumpTo, distanceKm: 5, durationMin: 15 } : { status: jumpTo };
    const { status, json } = await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body });

    expect(status).toBe(409);
    expect(json.error.code).toBe("INVALID_TRANSITION");

    // trạng thái chuyến không đổi sau cú nhảy cóc bị từ chối
    const check = await req("GET", `/trips/${tripId}`, { token: customerToken });
    expect(check.json.data.status).toBe(from);
  }
});