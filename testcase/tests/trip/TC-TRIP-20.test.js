// TC-TRIP-20 | Negative | Sự kiện trùng lặp hoặc đến trễ không làm lùi trạng thái chuyến
// Dùng webhook nội bộ như hiện tại; khi endpoint được bảo vệ (TC-TRIP-14) đổi sang token dịch vụ.
// Giả định: path webhook NoDriverFound là /trips/events/no-driver-found, theo đúng quy ước
// đặt tên của /trips/events/driver-assigned — CHƯA thấy trong file mẫu đã gửi, cần xác nhận.
const { req, uuid } = require("../helpers");
const { createAssignedTrip, advanceTripTo } = require("./_setup");

test("TC-TRIP-20 | Negative | Sự kiện trùng lặp hoặc đến trễ không làm lùi trạng thái chuyến", async () => {
  const { tripId, driverId, driverToken, customerToken } = await createAssignedTrip();
  await advanceTripTo(tripId, driverToken, "arrived");

  // sự kiện trùng: gửi lại DriverAssigned 2 lần liên tiếp với đúng tài xế đã gán
  await req("POST", "/trips/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId, driverId, eta: 5 } },
  });
  await req("POST", "/trips/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId, driverId, eta: 5 } },
  });

  // sự kiện đến trễ/giả: DriverAssigned với TÀI XẾ KHÁC khi chuyến đã sang arrived
  const otherDriverId = uuid();
  const lateAssigned = await req("POST", "/trips/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId, driverId: otherDriverId, eta: 5 } },
  });
  expect(lateAssigned.status).toBe(200); // webhook nhận, nhưng phải bỏ qua nội dung

  // NoDriverFound đến trễ dù chuyến đã có tài xế
  const lateNoDriver = await req("POST", "/trips/events/no-driver-found", {
    body: { event: "NoDriverFound", payload: { tripId } },
  });
  expect(lateNoDriver.status).toBe(200);

  const check = await req("GET", `/trips/${tripId}`, { token: customerToken });
  expect(check.json.data.status).toBe("arrived");
  expect(check.json.data.driverId).toBe(driverId);
});