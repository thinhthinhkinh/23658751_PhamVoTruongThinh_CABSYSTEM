// TC-TRIP-19 | Negative | Hủy chuyến thu hồi offer đang mở và lưu lại lịch sử hủy
// Dự kiến FAIL cho tới khi Trip Service phát sự kiện thu hồi offer sang Dispatch khi hủy.
// Dùng chung registerAvailableDriver()/pollForOffer() với TC-TRIP-15 — xem ghi chú endpoint
// giả định ở đầu file đó (POST /drivers/register, GET /dispatch/drivers/me/pending, ...).
// Lý do hủy bắt buộc từ BA v1.5 (khách hàng xác nhận): chọn từ 2 mục — dùng "personal" ở đây,
// đối chiếu lại đúng giá trị enum thật của route (có thể là string khác, ví dụ "OTHER").
const { req, signCustomerToken, uuid } = require("../helpers");
const { PICKUP, DROPOFF, registerAvailableDriver, pollForOffer } = require("./_setup");

test.failing(
  "TC-TRIP-19 | Negative | Hủy chuyến thu hồi offer đang mở và lưu lại lịch sử hủy",
  async () => {
    const customerId = uuid();
    const customerToken = signCustomerToken(customerId);
    const { token: driverToken } = await registerAvailableDriver("19");

    const tripRes = await req("POST", "/trips", {
      token: customerToken,
      body: { pickupLocation: PICKUP, dropoffLocation: DROPOFF, vehicleType: "4-seat" },
    });
    const tripId = tripRes.json.data.id;

    // đợi tài xế thật sự nhận được offer trước khi hủy, để phép thử có ý nghĩa
    await pollForOffer(driverToken);

    // 1. Khách hủy chuyến khi offer đang mở, kèm lý do bắt buộc (BA v1.5)
    const cancelRes = await req("POST", `/trips/${tripId}/cancel`, {
      token: customerToken,
      body: { reason: "Khách yêu cầu hủy vì lý do cá nhân" },
    });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.json.data.status).toBe("cancelled");

    // 2. Offer của tài xế phải được thu hồi — hành vi ĐÚNG cần có là data:null
    const pendingRes = await req("GET", "/dispatch/drivers/me/pending", { token: driverToken });
    expect(pendingRes.json.data).toBeNull();

    // 3. Lịch sử của khách hiển thị đúng chuyến này đã hủy, kèm đúng lý do
    const historyRes = await req("GET", "/customers/me/trips", { token: customerToken });
    const found = historyRes.json.data.find((t) => t.id === tripId);
    expect(found).toBeDefined();
    expect(found.status).toBe("cancelled");
    expect(found.cancelReason ?? found.reason).toBe("Khách yêu cầu hủy vì lý do cá nhân");
  },
  15000
);