// TC-TRIP-14 | Negative | Endpoint nội bộ của Trip Service không gọi được từ bên ngoài
// Dự kiến FAIL cho tới khi thêm xác thực dịch vụ (NFR Bảo mật — đề xuất bản 1.1 BA,
// đang chờ khách hàng xác nhận, xem Nhat-Ky-Thay-Doi-BA-CAB-System.docx). Hiện tại
// endpoint này không yêu cầu token, đúng như TC-TRIP-12 đang xác nhận (PASS).
// Dùng test.failing: nếu ai đó sửa xong bảo mật, test này sẽ tự báo "failing test
// passed" để nhắc chuyển sang test() thường, thay vì âm thầm không ai để ý.
const { req, signCustomerToken, uuid } = require("../helpers");

test.failing("TC-TRIP-14 | Negative | Endpoint nội bộ của Trip Service không gọi được từ bên ngoài", async () => {
  const customerToken = signCustomerToken(uuid());
  const tripRes = await req("POST", "/bookings", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  const bookingId = tripRes.json.data.bookingId;

  // Bước 1: tra cứu nội bộ không token — hành vi ĐÚNG cần có là 401/403
  const internalRes = await req("GET", `/bookings/${bookingId}/internal`);
  expect([401, 403]).toContain(internalRes.status);

  // Bước 2: webhook không xác thực dịch vụ, gán một tài xế lạ cho chuyến
  const fakeDriverId = uuid();
  const webhookRes = await req("POST", "/bookings/events/driver-assigned", {
    body: { event: "DriverAssigned", payload: { bookingId, driverId: fakeDriverId, eta: 5 } },
  });
  expect([401, 403]).toContain(webhookRes.status);

  // Bước 3: chuyến không bị ảnh hưởng bởi webhook giả ở bước 2
  const check = await req("GET", `/bookings/${bookingId}`, { token: customerToken });
  expect(check.json.data.status).toBe("finding_driver");
  expect(check.json.data.driverId ?? null).toBeNull();
});