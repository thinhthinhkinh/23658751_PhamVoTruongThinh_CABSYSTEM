// TC-TRIP-06 | Negative | Tài xế không thuộc chuyến cố cập nhật trạng thái
const { req, signDriverToken, uuid } = require("../helpers");
const { createAssignedTrip } = require("./_setup");

test("TC-TRIP-06 | Negative | Tài xế không thuộc chuyến cố cập nhật trạng thái", async () => {
  const { bookingId } = await createAssignedTrip();
  const strangerDriverToken = signDriverToken(uuid()); // tài xế khác, không phải người được gán

  const { status } = await req("PATCH", `/trips/${bookingId}/status`, {
    token: strangerDriverToken,
    body: { status: "arrived" },
  });

  expect(status).toBe(403);
});
