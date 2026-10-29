# CAB System — Kiến trúc Microservices

> Hệ thống đặt xe taxi | Node.js · gRPC · RabbitMQ · MongoDB · Redis 7

---

## 1. Thành phần hệ thống

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| **API Gateway** | Express.js | Điểm vào duy nhất — xác thực JWT, proxy gRPC đến service |
| **11 Domain Services** | Node.js + Express | Xử lý nghiệp vụ, mỗi service có DB riêng |
| **MongoDB** | MongoDB 6 | Lưu trữ chính — 11 database tách biệt |
| **Redis 7** | Redis 7-alpine | Session store · token cache · rate limiting · FareCache |
| **RabbitMQ** | RabbitMQ 3 | Message broker — async event giữa các service |

### 11 Domain Services

| # | Service | HTTP | gRPC | Database |
|---|---|---|---|---|
| 1 | Auth | 4010 | 5010 | auth_db |
| 2 | Customer | 4001 | 5001 | customer_db |
| 3 | Driver | 4002 | 5002 | driver_db |
| 4 | Booking | 4003 | 5003 | booking_db |
| 5 | Trip | 4011 | 5011 | trip_db |
| 6 | Dispatch | 4004 | 5004 | dispatch_db |
| 7 | Location | 4005 | 5005 | location_db |
| 8 | Pricing | 4006 | 5006 | pricing_db |
| 9 | Payment | 4007 | 5007 | payment_db |
| 10 | Notification | 4008 | 5008 | notification_db |
| 11 | Admin | 4009 | 5009 | admin_db |

---

## 2. IPC — Giao tiếp giữa các Service

Hệ thống dùng **2 cơ chế IPC** tùy theo tính chất của từng tương tác:

### Đồng bộ — gRPC

Dùng khi caller **cần kết quả ngay** để tiếp tục xử lý.

```
API Gateway   → tất cả 11 service       (xác thực + proxy request)
Booking       → Pricing                 (ước tính cước khi đặt xe)
Trip          → Pricing                 (tính cước thực tế khi hoàn thành)
Trip          → Booking                 (lấy estimatedFare, customerId)
Dispatch      → Driver                  (lấy danh sách tài xế sẵn sàng)
Dispatch      → Location                (lọc tài xế gần nhất)
Payment       → Booking                 (lấy amount, customerId)
Admin         → Customer/Driver/Booking/Trip/Payment  (tổng hợp báo cáo)
```

### Bất đồng bộ — RabbitMQ

Dùng khi một service cần **thông báo cho nhiều service** mà không cần chờ kết quả.  
Exchange: `cab_events` (topic, durable). Mỗi subscriber tạo exclusive queue tự xóa.

| Event | Publisher | Subscribers |
|---|---|---|
| `BookingRequested` | Booking | Dispatch |
| `BookingCancelled` | Booking | Dispatch |
| `DriverAssigned` | Dispatch | Booking · Trip · Notification |
| `NoDriverFound` | Dispatch | Booking · Notification |
| `TripStatusChanged` | Trip | Notification |
| `FareCalculated` | Trip | Payment |
| `PaymentCompleted` | Payment | Notification |
| `PaymentFailed` | Payment | Notification |

---

## 3. Tại sao Auth và Admin chỉ dùng gRPC, không dùng RabbitMQ?

**Auth Service** — xác thực là yêu cầu **đồng bộ bắt buộc**. API Gateway phải biết ngay token hợp lệ hay không trước khi cho request đi tiếp — không thể publish event rồi chờ. Auth cũng không tạo ra sự kiện nghiệp vụ nào cần broadcast.

**Admin Service** — là pure aggregator, chỉ **đọc dữ liệu on-demand** từ các service khác để tổng hợp báo cáo khi admin yêu cầu. Đây là query đồng bộ 1-1, không phải event fan-out. Admin cũng không tạo ra sự kiện mà service khác cần react.

> **Nguyên tắc:** RabbitMQ phù hợp khi cần fan-out + không cần kết quả ngay. gRPC phù hợp khi cần kết quả ngay + quan hệ 1-1 rõ ràng.

---

## 4. Chức năng từng Service

**Auth** — đăng ký, đăng nhập, cấp JWT, thu hồi token. Session lưu Redis (Hash, TTL 7 ngày). Kết quả ValidateToken cache Redis 60s, revocation hiệu lực < 1 giây.

**Customer** — quản lý tài khoản khách hàng (xem/cập nhật thông tin, ops vô hiệu hóa).

**Driver** — quản lý tài khoản tài xế, cập nhật xe, đổi trạng thái `offline/available/busy`.

**Booking** — tạo booking, ước tính cước (gRPC Pricing), publish `BookingRequested`. Quản lý state: `requested → finding_driver → driver_assigned / no_driver_found / cancelled`.

**Trip** — quản lý chuyến đi sau khi tài xế được gán. State: `driver_assigned → arrived → picked_up → in_progress → completed`. Khi completed: tính `actualFare` (gRPC Pricing) → publish `FareCalculated`. Xử lý đánh giá.

**Dispatch** — matching engine: lấy tài xế sẵn sàng (gRPC Driver) → lọc theo khoảng cách (gRPC Location) → mời lần lượt từng tài xế (timeout 20s) → publish `DriverAssigned` hoặc `NoDriverFound`.

**Location** — lưu vị trí tài xế (upsert 1 bản ghi/tài xế), cung cấp `GetNearbyDrivers` cho Dispatch.

**Pricing** — stateless, tính cước theo công thức: `baseFare + distanceKm × perKmRate + durationMin × perMinuteRate`.

**Payment** — xử lý thanh toán sau chuyến. Lấy cước từ Redis FareCache (`cab:fare:{bookingId}`, TTL 24h) → mock charge → publish `PaymentCompleted/Failed`.

**Notification** — pure event consumer, subscribe tất cả sự kiện liên quan, tạo thông báo và log console.

**Admin** — aggregator: gọi gRPC đến các service khác để lấy danh sách, quản lý tài khoản, tổng hợp báo cáo vận hành.

---

## 5. Sơ đồ tổng thể

```
Client
  │ HTTP :3000
  ▼
API Gateway ──────────────────────────── gRPC ──────────────────────────────────┐
  │                                                                              │
  │              ┌──────────────────── gRPC (sync) ──────────────────────┐      │
  │              │                                                        │      │
  ▼              ▼                                                        ▼      ▼
Auth           Booking ──gRPC──► Pricing ◄──gRPC── Trip ──gRPC──► Booking      Admin
(Redis:        (pub BookingReq)              (pub FareCalc)         Customer
 session,      Dispatch ──gRPC──► Driver                           Driver
 token cache)  (pub DriverAssigned)          Payment ◄──FareCalc   Booking
               (pub NoDriverFound) Location  (pub PaymentDone)     Trip
                                             Notification          Payment
                                             (sub all events)
  │
  └──────────── RabbitMQ cab_events (async) ─────────────────────────────────►

Infrastructure:
  MongoDB :27017  — 11 DB riêng
  Redis   :6379   — session · token cache · rate limit · FareCache
  RabbitMQ:5672   — async events
```

---

*MSSV: 23658751 — Phạm Võ Trường Thịnh | Cập nhật: 2026-10-10*
