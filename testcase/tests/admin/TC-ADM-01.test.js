// TC-ADM-01 | Positive | Ops_staff xem danh sách toàn bộ chuyến
const { req, signStaffToken } = require("../helpers");
const { createCompletedTripWithRating } = require("./_setup");

test("TC-ADM-01 | Positive | Ops_staff xem danh sách toàn bộ chuyến", async () => {
  const { tripId } = await createCompletedTripWithRating();
  const staffToken = signStaffToken("ops_staff");

  const { status, json } = await req("GET", "/admin/trips", { token: staffToken });

  expect(status).toBe(200);
  expect(json.data.some((t) => t.id === tripId)).toBe(true);
});
