// TC-TRIP-13 | Positive | Lịch sử chuyến chỉ hiển thị chuyến của chính mình
// Giả định: GET /customers/me/trips và GET /drivers/me/trips tồn tại và trả {data: [...]}
// sắp xếp mới đến cũ (chưa thấy trong các file mẫu đã gửi — cần xác nhận nếu path khác).
const { req, signCustomerToken, signDriverToken, uuid } = require("../helpers");

async function createTrip(customerToken) {
  const res = await req("POST", "/trips", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  return res.json.data.id;
}

test("TC-TRIP-13 | Positive | Lịch sử chuyến chỉ hiển thị chuyến của chính mình", async () => {
  const customerA = signCustomerToken(uuid());
  const customerB = signCustomerToken(uuid());
  const driverId = uuid();
  const driverToken = signDriverToken(driverId);

  // A có 2 chuyến, B có 2 chuyến — không liên quan gì đến A
  const tripA1 = await createTrip(customerA);
  const tripA2 = await createTrip(customerA);
  await createTrip(customerB);
  await createTrip(customerB);

  // 1 chuyến của A (tripA1, tạo trước) được gán cho driver ở trên
  await req("POST", "/trips/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId: tripA1, driverId, eta: 5 } },
  });

  const histA = await req("GET", "/customers/me/trips", { token: customerA });
  const histB = await req("GET", "/customers/me/trips", { token: customerB });
  const histDriver = await req("GET", "/drivers/me/trips", { token: driverToken });

  expect(histA.status).toBe(200);
  expect(histA.json.data.length).toBe(2);
  expect(histA.json.data.map((t) => t.id).sort()).toEqual([tripA1, tripA2].sort());
  // mới đến cũ: tripA2 tạo sau tripA1 nên phải đứng trước trong danh sách
  expect(histA.json.data[0].id).toBe(tripA2);

  expect(histB.status).toBe(200);
  expect(histB.json.data.length).toBe(2);
  expect(histB.json.data.some((t) => t.id === tripA1)).toBe(false);

  expect(histDriver.status).toBe(200);
  expect(histDriver.json.data.length).toBe(1);
  expect(histDriver.json.data[0].id).toBe(tripA1);
});