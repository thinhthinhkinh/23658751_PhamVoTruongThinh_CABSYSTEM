// TC-TRIP-10 | Negative | Đánh giá 2 lần cho cùng 1 chuyến
const { req } = require("../helpers");
const { createCompletedTrip } = require("./_setup");

test("TC-TRIP-10 | Negative | Đánh giá 2 lần cho cùng 1 chuyến", async () => {
  const { tripId, customerToken } = await createCompletedTrip();

  await req("POST", `/trips/${tripId}/rating`, { token: customerToken, body: { score: 5 } });
  const { status, json } = await req("POST", `/trips/${tripId}/rating`, { token: customerToken, body: { score: 4 } });

  expect(status).toBe(409);
  expect(json.error.code).toBe("ALREADY_RATED");
});
