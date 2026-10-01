// Helper riêng cho Trip Service test: tạo 1 chuyến rồi "giả lập" Dispatch Service
// đã gán tài xế, bằng cách gọi thẳng webhook nội bộ /trips/events/driver-assigned
// — tránh phải bật cả Dispatch + Location + Event Bus chỉ để test Trip Service.
const { req, signCustomerToken, signDriverToken, randEmail, uuid } = require("../helpers");

async function createAssignedTrip() {
  const customerId = uuid();
  const driverId = uuid();
  const customerToken = signCustomerToken(customerId);
  const driverToken = signDriverToken(driverId);

  const tripRes = await req("POST", "/trips", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.7769, lng: 106.7009 },
      dropoffLocation: { lat: 10.7829, lng: 106.6934 },
      vehicleType: "4-seat",
    },
  });
  const tripId = tripRes.json.data.id;

  await req("POST", "/trips/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { tripId, driverId, eta: 5 } },
  });

  return { tripId, customerId, driverId, customerToken, driverToken };
}

// MỚI: đưa 1 chuyến đã gán tài xế đi qua các bước trạng thái hợp lệ cho tới đúng
// targetStatus mong muốn (driver_assigned/arrived/picked_up/in_progress/completed).
// Dùng cho test cần chuyến dừng lại giữa chừng (TC-TRIP-16, TC-TRIP-20) thay vì phải
// lặp lại tay từng bước PATCH như createCompletedTrip().
const STATUS_SEQUENCE = ["driver_assigned", "arrived", "picked_up", "in_progress", "completed"];

async function advanceTripTo(tripId, driverToken, targetStatus) {
  const targetIndex = STATUS_SEQUENCE.indexOf(targetStatus);
  if (targetIndex < 0) throw new Error(`advanceTripTo: targetStatus không hợp lệ: ${targetStatus}`);

  for (let i = 1; i <= targetIndex; i++) {
    const status = STATUS_SEQUENCE[i];
    const body = status === "completed" ? { status, distanceKm: 5, durationMin: 15 } : { status };
    const res = await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body });
    if (res.status !== 200) {
      throw new Error(`advanceTripTo: PATCH sang ${status} thất bại (status ${res.status}): ${JSON.stringify(res.json)}`);
    }
  }
}

async function createCompletedTrip() {
  const assigned = await createAssignedTrip();
  const { tripId, driverToken } = assigned;
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "arrived" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "picked_up" } });
  await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: "in_progress" } });
  await req("PATCH", `/trips/${tripId}/status`, {
    token: driverToken,
    body: { status: "completed", distanceKm: 5, durationMin: 15 },
  });
  return assigned;
}

// MỚI: dùng cho test cần Dispatch thật gán offer cho MỘT TÀI XẾ THẬT (TC-TRIP-15, TC-TRIP-19)
// — không dùng signDriverToken(uuid()) với id bịa được vì id đó không tồn tại ở
// Driver/Location Service nên Dispatch sẽ không bao giờ tìm thấy để mời.
// CÁC ENDPOINT DƯỚI ĐÂY SUY RA TỪ ĐẶC TẢ, CHƯA XÁC NHẬN VỚI ROUTE THẬT — xem ghi chú
// đầu file TC-TRIP-15.test.js để biết danh sách đầy đủ và hình dạng response giả định.
const PICKUP = { lat: 10.7769, lng: 106.7009 };
const DROPOFF = { lat: 10.7829, lng: 106.6934 };
const DRIVER_LOCATION = { lat: 10.7769, lng: 106.7009 }; // đặt ngay điểm đón để chắc chắn trong bán kính tìm kiếm

async function registerAvailableDriver(plateSuffix = "00") {
  const email = randEmail("tc_trip_driver");
  const regRes = await req("POST", "/drivers/register", {
    body: {
      email,
      password: "Test@1234",
      fullName: "Tài xế test Trip Service",
      vehicle: { plate: `51H-999.${plateSuffix}`, model: "Toyota Vios", type: "4-seat" },
    },
  });
  if (regRes.status !== 201) {
    throw new Error(`registerAvailableDriver: đăng ký thất bại (status ${regRes.status}): ${JSON.stringify(regRes.json)}`);
  }
  const token = regRes.json.data.token;
  const driverId = regRes.json.data.driver.id;

  await req("PATCH", "/drivers/me/status", { token, body: { status: "available" } });
  await req("POST", "/locations", { token, body: DRIVER_LOCATION });

  return { driverId, token };
}

// Dispatch xử lý bất đồng bộ qua event bus nên offer không có ngay lập tức — polling tối đa ~10s.
async function pollForOffer(driverToken, { intervalMs = 300, timeoutMs = 10000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await req("GET", "/dispatch/drivers/me/pending", { token: driverToken });
    if (res.status === 200 && res.json.data) return res.json.data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("pollForOffer: không nhận được offer trong thời gian chờ — kiểm tra Dispatch/Event Bus có đang chạy không");
}

module.exports = {
  createAssignedTrip,
  createCompletedTrip,
  advanceTripTo,
  PICKUP,
  DROPOFF,
  registerAvailableDriver,
  pollForOffer,
};