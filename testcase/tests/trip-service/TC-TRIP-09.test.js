// TC-TRIP-09 | Negative | Đánh giá tài xế khi chuyến chưa hoàn thành
const { req } = require("../helpers");
const { createAssignedTrip } = require("./_setup");

test("TC-TRIP-09 | Negative | Đánh giá tài xế khi chuyến chưa hoàn thành", async () => {
  const { tripId, customerToken } = await createAssignedTrip(); // vẫn ở driver_assigned, chưa completed

  const { status, json } = await req("POST", `/trips/${tripId}/rating`, {
    token: customerToken,
    body: { score: 5 },
  });

  expect(status).toBe(409);
  expect(json.error.code).toBe("TRIP_NOT_COMPLETED");
});
