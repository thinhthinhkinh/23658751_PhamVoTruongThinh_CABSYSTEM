// TC-ADM-07 | Positive | Ghi nhận xử lý sự cố cho 1 chuyến
const { req, signStaffToken } = require("../helpers");
const { createCompletedTripWithRating } = require("./_setup");

test("TC-ADM-07 | Positive | Ghi nhận xử lý sự cố cho 1 chuyến, không đổi trực tiếp status Trip", async () => {
  const { tripId } = await createCompletedTripWithRating();
  const staffToken = signStaffToken("ops_staff");

  const beforeTrip = await req("GET", `/trips/${tripId}/internal`);

  const { status, json } = await req("POST", `/admin/trips/${tripId}/resolve`, {
    token: staffToken,
    body: { resolutionNote: "Đã liên hệ tài xế, chuyến tiếp tục bình thường" },
  });

  expect(status).toBe(201);
  expect(json.data.tripId).toBe(tripId);
  expect(json.data.resolutionNote).toBe("Đã liên hệ tài xế, chuyến tiếp tục bình thường");

  const afterTrip = await req("GET", `/trips/${tripId}/internal`);
  expect(afterTrip.json.data.status).toBe(beforeTrip.json.data.status); // Admin không sửa trực tiếp Trip
});
