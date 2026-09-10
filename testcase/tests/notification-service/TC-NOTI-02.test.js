// TC-NOTI-02 | Positive | Cả khách hàng và tài xế nhận thông báo khi hoàn thành chuyến
const { req, signCustomerToken, signDriverToken, uuid } = require("../helpers");
const { createRealTrip } = require("./_setup");

test("TC-NOTI-02 | Positive | Cả khách hàng và tài xế nhận thông báo khi hoàn thành chuyến", async () => {
  const { tripId, customerId } = await createRealTrip();
  const driverId = uuid();

  // Gán tài xế cho trip bên Trip Service để trip.driverId khác null khi Notification Service tra cứu
  await req("POST", "/trips/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId, driverId, eta: 5 } },
  });

  await req("POST", "/notifications/events/trip-completed", {
    body: { event: "TripCompleted", payload: { tripId, distance: 5, duration: 15 } },
  });

  const custNoti = await req("GET", "/notifications/me", { token: signCustomerToken(customerId) });
  const driverNoti = await req("GET", "/notifications/me", { token: signDriverToken(driverId) });

  expect(custNoti.json.data.some((n) => n.title === "Chuyến đi hoàn thành")).toBe(true);
  expect(driverNoti.json.data.some((n) => n.title === "Chuyến đi hoàn thành")).toBe(true);
});
