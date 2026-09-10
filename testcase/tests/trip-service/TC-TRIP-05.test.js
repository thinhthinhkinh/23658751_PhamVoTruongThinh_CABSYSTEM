// TC-TRIP-05 | Negative | Tài xế cập nhật trạng thái sai thứ tự
const { req } = require("../helpers");
const { createAssignedTrip } = require("./_setup");

test("TC-TRIP-05 | Negative | Tài xế cập nhật trạng thái sai thứ tự (bỏ qua arrived, picked_up)", async () => {
  const { tripId, driverToken } = await createAssignedTrip(); // status hiện tại: driver_assigned

  const { status, json } = await req("PATCH", `/trips/${tripId}/status`, {
    token: driverToken,
    body: { status: "in_progress" }, // nhảy cóc, không hợp lệ
  });

  expect(status).toBe(409);
  expect(json.error.code).toBe("INVALID_TRANSITION");
});
