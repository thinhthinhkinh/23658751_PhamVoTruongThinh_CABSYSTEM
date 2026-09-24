// TC-TRIP-11 | Negative | Đánh giá với điểm ngoài khoảng cho phép
const { req } = require("../helpers");
const { createCompletedTrip } = require("./_setup");

test("TC-TRIP-11 | Negative | Đánh giá với điểm ngoài khoảng cho phép (score=7)", async () => {
  const { tripId, customerToken } = await createCompletedTrip();

  const { status, json } = await req("POST", `/trips/${tripId}/rating`, {
    token: customerToken,
    body: { score: 7 },
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("INVALID_INPUT");
});
