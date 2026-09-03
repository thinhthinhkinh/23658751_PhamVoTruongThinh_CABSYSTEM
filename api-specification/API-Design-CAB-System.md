# Thiết kế API — CAB System (theo kiến trúc microservices)

Tài liệu này thiết kế API cho 10 service đã đề xuất ở bước kiến trúc, bám theo 23 yêu cầu chức năng (FR) trong tài liệu phân tích BA. Mỗi endpoint được gắn mã FR để dễ truy vết ngược lại yêu cầu gốc.

## Quy ước chung

- **Base URL**: mọi client (Customer app, Driver app, Admin dashboard) chỉ gọi qua API Gateway, không gọi thẳng service: `https://api.cabsystem.com/api/v1/...`
- **Auth**: JWT Bearer token — header `Authorization: Bearer <token>` cho mọi endpoint trừ các route đăng ký/đăng nhập.
- **Role**: `customer`, `driver`, `ops_staff`, `ops_admin` (ops_admin dành riêng cho thao tác nhạy cảm, đáp ứng FR-22/BR-08).
- **Định dạng thành công**: `{ "data": {...} }` cho 1 đối tượng, `{ "data": [...], "meta": { "page": 1, "total": 50 } }` cho danh sách.
- **Định dạng lỗi**: `{ "error": { "code": "TRIP_NOT_FOUND", "message": "..." } }`
- Các endpoint đánh dấu **service-to-service** không đi qua Gateway public, chỉ gọi nội bộ giữa các service (qua mTLS hoặc network nội bộ).

---

## 1. Customer Service — `/api/v1/customers`

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/customers/register` | Đăng ký tài khoản khách hàng | Không | FR-01 |
| POST | `/customers/login` | Đăng nhập, trả JWT | Không | FR-01 |
| GET | `/customers/me` | Xem thông tin cá nhân hiện tại | customer | FR-01 |
| PUT | `/customers/me` | Cập nhật thông tin cá nhân | customer | FR-01 |
| GET | `/customers/{id}` | Xem hồ sơ khách hàng (tra cứu nội bộ) | ops_staff | — |

## 2. Driver Service — `/api/v1/drivers`

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/drivers/register` | Tài xế tự đăng ký | Không | FR-02 |
| POST | `/drivers` | Nhân viên vận hành tạo tài khoản tài xế | ops_staff | FR-02 |
| POST | `/drivers/login` | Đăng nhập tài xế | Không | FR-02 |
| GET | `/drivers/me` | Xem hồ sơ tài xế hiện tại | driver | FR-02 |
| PUT | `/drivers/me` | Cập nhật hồ sơ cá nhân | driver | FR-02 |
| PUT | `/drivers/me/vehicle` | Cập nhật thông tin phương tiện | driver | FR-02 |
| PATCH | `/drivers/me/status` | Chuyển trạng thái `offline` / `available` / `busy` | driver | FR-11 |
| GET | `/drivers/{id}` | Xem hồ sơ tài xế (nội bộ/service khác gọi) | ops_staff, service-to-service | — |

## 3. Trip Service — `/api/v1/trips`

Service trung tâm, giữ trạng thái vòng đời chuyến đi và điều phối bằng sự kiện (xem Event catalog bên dưới).

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/trips` | Tạo yêu cầu đặt xe (điểm đón, điểm đến, loại xe) | customer | FR-03 |
| GET | `/trips/{id}` | Xem chi tiết & trạng thái hiện tại của 1 chuyến | customer, driver | FR-04 |
| GET | `/trips/{id}/status` | Poll trạng thái (khuyến nghị dùng WebSocket cho real-time) | customer, driver | FR-04 |
| PATCH | `/trips/{id}/status` | Tài xế cập nhật trạng thái: `arrived` → `picked_up` → `in_progress` → `completed` | driver | FR-13 |
| GET | `/customers/me/trips` | Lịch sử chuyến của khách hàng | customer | FR-05 |
| GET | `/drivers/me/trips` | Lịch sử chuyến của tài xế | driver | — |
| POST | `/trips/{id}/cancel` | Hủy chuyến | customer, driver | ⚠️ chính sách hủy chưa chốt — xem Mục 9 tài liệu BA |

## 4. Dispatch Service — `/api/v1/dispatch`

Chủ yếu vận hành qua event `TripRequested`; chỉ expose các endpoint mà tài xế cần phản hồi trực tiếp.

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/dispatch/{tripId}/accept` | Tài xế chấp nhận chuyến được đề xuất | driver | FR-12 |
| POST | `/dispatch/{tripId}/decline` | Tài xế từ chối chuyến → hệ thống tự tìm tài xế khác | driver | FR-08, FR-12 |
| GET | `/dispatch/{tripId}/candidates` | Danh sách tài xế được xét (phục vụ debug/audit) | ops_staff | FR-06, FR-07 |
| ⏱️ timeout | — | Nếu tài xế không phản hồi trong X giây, tự động chuyển sang `decline` | — | FR-08 — ⚠️ giá trị X chưa chốt |

## 5. Location Service — `/api/v1/locations`

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/locations` | Tài xế gửi vị trí hiện tại | driver | FR-10 |
| WS | `/ws/locations` | Kênh WebSocket đẩy vị trí real-time (khuyến nghị thay REST polling) | driver | FR-10 |
| GET | `/locations/drivers/{driverId}` | Vị trí hiện tại của 1 tài xế | ops_staff, service-to-service | FR-10 |
| GET | `/locations/nearby-drivers?lat=&lng=&radius=` | Tìm tài xế gần 1 tọa độ | service-to-service (Dispatch gọi) | FR-06 |

## 6. Pricing Service — `/api/v1/pricing`

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/pricing/calculate` | Tính cước cho 1 chuyến (input: loại dịch vụ, quãng đường, thời gian) | service-to-service | FR-14 |
| GET | `/pricing/rules` | Xem cấu hình quy tắc tính giá hiện hành | ops_admin | FR-14 |

## 7. Payment Service — `/api/v1/payments`

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/payments` | Khởi tạo thanh toán cho 1 chuyến (tiền mặt hoặc điện tử) | customer, service-to-service | FR-15 |
| GET | `/payments/{id}` | Xem trạng thái giao dịch | customer | FR-15 |
| POST | `/payments/{id}/retry` | Xử lý lại khi giao dịch điện tử thất bại | customer | FR-16 |
| POST | `/payments/webhook` | Callback kết quả từ cổng thanh toán ngoài (ký xác thực riêng, không dùng JWT) | payment gateway | FR-15, FR-16 |
| GET | `/customers/me/payments` | Lịch sử thanh toán | customer | FR-05 |

Payment Service **không** lưu số thẻ/tài khoản thanh toán — chỉ lưu `paymentId`, `provider`, `status`, `amount` (đáp ứng BR-06).

## 8. Notification Service — `/api/v1/notifications`

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| GET | `/notifications/me` | Xem lịch sử thông báo đã nhận | customer, driver | FR-17, FR-18 |
| POST | `/notifications/channels` | Đăng ký/kích hoạt thêm kênh thông báo mới (push, SMS, email...) | ops_admin | FR-19 |

Việc gửi thông báo thực tế được kích hoạt hoàn toàn qua event (không có endpoint public để "gửi thông báo" trực tiếp) — đây chính là điểm giúp thêm kênh mới không cần sửa các service khác.

## 9. Rating — `/api/v1/trips/{id}/rating`

Gộp vào Trip Service thay vì tách service riêng, vì nghiệp vụ rất mỏng (1 bảng, 2 endpoint) và luôn gắn liền vòng đời 1 chuyến.

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| POST | `/trips/{id}/rating` | Khách hàng đánh giá tài xế sau chuyến | customer | FR-05 |
| GET | `/drivers/{id}/ratings` | Điểm trung bình & lịch sử đánh giá của 1 tài xế | driver (chính mình), ops_staff | FR-05 |

## 10. Admin / Reporting Service — `/api/v1/admin`

| Method | Endpoint | Mô tả | Auth | FR |
|---|---|---|---|---|
| GET | `/admin/trips?status=ongoing` | Xem các chuyến đang diễn ra | ops_staff | FR-21 |
| GET | `/admin/drivers/{id}/status` | Kiểm tra trạng thái 1 tài xế | ops_staff | FR-21 |
| POST | `/admin/trips/{id}/resolve` | Xử lý chuyến gặp sự cố | ops_staff | FR-21 |
| GET | `/admin/transactions` | Tra cứu lịch sử giao dịch | ops_staff | FR-21 |
| GET/POST/PUT | `/admin/customers`, `/admin/drivers`, `/admin/vehicles` | CRUD quản lý khách hàng/tài xế/phương tiện | ops_staff | FR-20 |
| DELETE, PATCH (khóa tài khoản...) | cùng nhóm trên | Thao tác nhạy cảm | **ops_admin** (quyền cao hơn ops_staff) | FR-22 |
| GET | `/admin/reports/trips?from=&to=` | Báo cáo số lượng chuyến | ops_admin | FR-23 |
| GET | `/admin/reports/revenue?from=&to=` | Báo cáo doanh thu | ops_admin | FR-23 |
| GET | `/admin/reports/completion-rate` | Tỷ lệ hoàn thành chuyến | ops_admin | FR-23 |
| GET | `/admin/reports/cancellation-rate` | Tỷ lệ hủy chuyến | ops_admin | FR-23 |
| GET | `/admin/reports/driver-performance` | Hiệu quả hoạt động của tài xế | ops_admin | FR-23 |

Reporting đọc dữ liệu từ read-model riêng (xây từ event stream), không query trực tiếp DB của Trip/Payment Service — giữ đúng nguyên tắc Database per Service.

---

## Event catalog (giao tiếp bất đồng bộ)

Đây là phần quan trọng nhất để hệ thống thật sự "cách ly lỗi" như khách hàng yêu cầu — mọi side-effect (thông báo, báo cáo, thanh toán) đều là subscriber, không nằm trên đường đi chính của việc đặt xe.

| Event | Publisher | Subscriber(s) | Payload chính | Khi nào phát sinh |
|---|---|---|---|---|
| `TripRequested` | Trip Service | Dispatch Service | tripId, pickupLoc, dropoffLoc, vehicleType, customerId | Khách hàng tạo yêu cầu (FR-03) |
| `DriverLocationUpdated` | Location Service | Dispatch Service | driverId, lat, lng | Mỗi lần tài xế gửi vị trí mới (FR-10) |
| `DriverAssigned` | Dispatch Service | Trip Service, Notification Service | tripId, driverId, eta | Tài xế accept (FR-12) |
| `NoDriverFound` | Dispatch Service | Trip Service, Notification Service | tripId | Hết candidate mà không ai nhận (FR-09) |
| `TripStatusChanged` | Trip Service | Notification Service, Reporting Service | tripId, status, timestamp | Mỗi lần đổi trạng thái: arrived/picked_up/in_progress (FR-13) |
| `TripCompleted` | Trip Service | Pricing Service, Notification Service, Reporting Service | tripId, distance, duration | Tài xế báo hoàn thành (FR-13) |
| `FareCalculated` | Pricing Service | Trip Service, Payment Service | tripId, amount | Sau khi tính cước xong (FR-14) |
| `PaymentCompleted` | Payment Service | Trip Service, Notification Service, Reporting Service | tripId, paymentId, method | Thanh toán thành công (FR-15) |
| `PaymentFailed` | Payment Service | Notification Service | tripId, paymentId, reason | Giao dịch điện tử thất bại (FR-16) |
| `TripRated` | Trip Service | Reporting Service | tripId, driverId, score | Sau khi khách hàng đánh giá (FR-05) |

---

## Ví dụ chi tiết: tạo yêu cầu đặt xe

**Request**

```
POST /api/v1/trips
Authorization: Bearer <customer_jwt>
Content-Type: application/json

{
  "pickupLocation":  { "lat": 10.7769, "lng": 106.7009, "address": "..." },
  "dropoffLocation": { "lat": 10.8231, "lng": 106.6297, "address": "..." },
  "vehicleType": "4-seat"
}
```

**Response — 201 Created**

```
{
  "data": {
    "tripId": "trip_8f21c3",
    "status": "finding_driver",
    "createdAt": "2026-09-03T10:15:00Z"
  }
}
```

**Response — lỗi không tìm được tài xế (đẩy qua WebSocket/poll sau đó, FR-09)**

```
{
  "data": {
    "tripId": "trip_8f21c3",
    "status": "no_driver_found",
    "message": "Hiện chưa tìm được tài xế phù hợp, vui lòng thử lại sau."
  }
}
```

---

## Điểm cần lưu ý khi triển khai

- Các endpoint đánh dấu **⚠️** phụ thuộc vào câu trả lời của khách hàng ở Mục 9 tài liệu BA (chính sách hủy chuyến, timeout phản hồi tài xế) — nên để cấu hình được (config), không hardcode.
- `ops_admin` là superset quyền của `ops_staff` — nên implement bằng scope/permission trong JWT (ví dụ `permissions: ["trip:read", "customer:write", "report:read"]`) thay vì chỉ 2 role cứng, để dễ mở rộng phân quyền chi tiết hơn sau này (đáp ứng FR-22 linh hoạt hơn).
- Payment Service cần idempotency key trên `POST /payments` để tránh double-charge khi client retry do timeout mạng.
