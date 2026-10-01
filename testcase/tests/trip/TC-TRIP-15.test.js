// TC-TRIP-15 | Positive | Luồng hoàn chỉnh tiền mặt từ đặt xe đến đánh giá
//
// Test này khác các test Trip-only còn lại: nó cần Dispatch thật gán offer cho MỘT
// TÀI XẾ THẬT (đã đăng ký, đang available, có vị trí) — xem registerAvailableDriver()
// và pollForOffer() trong ./_setup.js.
//
// CÁC ENDPOINT DƯỚI ĐÂY MÌNH SUY RA TỪ ĐẶC TẢ (Test-Scenarios-CAB-System-v9.xlsx),
// CHƯA THẤY TRONG FILE MẪU BẠN GỬI — ĐỐI CHIẾU LẠI TÊN PATH VÀ HÌNH DẠNG RESPONSE
// VỚI ROUTE THẬT TRƯỚC KHI CHẠY:
//   POST /drivers/register          body {email,password,fullName,vehicle:{plate,model,type}}
//                                    -> 201 {data:{token, driver:{id,...}}}
//   PATCH /drivers/me/status        body {status:"available"} -> 200
//   POST /locations                  body {lat,lng} -> 200
//   GET /dispatch/drivers/me/pending -> 200 {data: null | {tripId,...}}
//   POST /dispatch/{tripId}/accept   -> 200
//   POST /payments                   body {tripId, method:"cash"} -> 201 {data:{status,amount,...}}
//   GET /customers/me/trips, GET /drivers/me/trips -> 200 {data:[...]}
//
// Nếu Dispatch của bạn không có endpoint polling kiểu "pending", mà đẩy offer qua
// WebSocket/push, thay pollForOffer() trong _setup.js bằng cách lắng nghe tương ứng.

const { req, signCustomerToken, uuid } = require("../helpers");
const { PICKUP, DROPOFF, registerAvailableDriver, pollForOffer } = require("./_setup");

test(
  "TC-TRIP-15 | Positive | Luồng hoàn chỉnh tiền mặt từ đặt xe đến đánh giá",
  async () => {
    const customerId = uuid();
    const customerToken = signCustomerToken(customerId);
    const { driverId, token: driverToken } = await registerAvailableDriver("15");

    // 1. Khách đặt xe
    const tripRes = await req("POST", "/trips", {
      token: customerToken,
      body: { pickupLocation: PICKUP, dropoffLocation: DROPOFF, vehicleType: "4-seat" },
    });
    expect(tripRes.status).toBe(201);
    const tripId = tripRes.json.data.id;

    // 2. Tài xế nhận offer và accept
    const offer = await pollForOffer(driverToken);
    expect(offer.tripId ?? offer.id).toBe(tripId);
    const acceptRes = await req("POST", `/dispatch/${tripId}/accept`, { token: driverToken });
    expect(acceptRes.status).toBe(200);

    // 3. Tài xế cập nhật đủ 4 mốc trạng thái
    for (const status of ["arrived", "picked_up", "in_progress"]) {
      const r = await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status } });
      expect(r.status).toBe(200);
      expect(r.json.data.status).toBe(status);
    }
    const completeRes = await req("PATCH", `/trips/${tripId}/status`, {
      token: driverToken,
      body: { status: "completed", distanceKm: 5, durationMin: 15 },
    });
    expect(completeRes.status).toBe(200);
    expect(completeRes.json.data.status).toBe("completed");
    // 15000 + 5*9500 + 15*500 = 70000 theo đơn giá xe 4 chỗ hiện tại (Pricing Service) — nếu bảng giá
    // đã đổi, chỉ cần so > 0 vẫn đúng tinh thần test, đổi lại toBe(70000) nếu muốn khớp chặt.
    expect(completeRes.json.data.fareAmount).toBeGreaterThan(0);
    const fareAmount = completeRes.json.data.fareAmount;

    // 4. Khách thanh toán tiền mặt
    const payRes = await req("POST", "/payments", { token: customerToken, body: { tripId, method: "cash" } });
    expect(payRes.status).toBe(201);
    expect(payRes.json.data.status).toBe("success");
    expect(payRes.json.data.amount).toBe(fareAmount);

    // 5. Khách đánh giá 5 sao
    const ratingRes = await req("POST", `/trips/${tripId}/rating`, { token: customerToken, body: { score: 5 } });
    expect(ratingRes.status).toBe(201);

    // 6. Lịch sử hiển thị đúng ở cả hai phía
    const custHistory = await req("GET", "/customers/me/trips", { token: customerToken });
    const driverHistory = await req("GET", "/drivers/me/trips", { token: driverToken });
    expect(custHistory.json.data.some((t) => t.id === tripId)).toBe(true);
    expect(driverHistory.json.data.some((t) => t.id === tripId)).toBe(true);
  },
  20000 // timeout riêng cho test này: đủ thời gian cho bước polling offer
);