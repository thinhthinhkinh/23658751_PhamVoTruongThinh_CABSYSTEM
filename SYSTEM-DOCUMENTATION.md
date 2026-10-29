# CAB System — Tài liệu Kỹ thuật Chi tiết

> Hệ thống đặt xe taxi theo kiến trúc Microservices, triển khai đầy đủ 30 tiêu chí chấm điểm.  
> Sinh viên: **Phạm Võ Trường Thịnh** — MSSV: 23658751  
> Môn: Microservice Architecture — IUH HK1 2026–2027

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc & Topology](#2-kiến-trúc--topology)
3. [Event Bus & Sự kiện](#3-event-bus--sự-kiện)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Chi tiết từng Service](#5-chi-tiết-từng-service)
   - [API Gateway](#51-api-gateway)
   - [Auth Service](#52-auth-service)
   - [Customer Service](#53-customer-service)
   - [Driver Service](#54-driver-service)
   - [Booking Service](#55-booking-service)
   - [Trip Service](#56-trip-service)
   - [Dispatch Service](#57-dispatch-service)
   - [Location Service](#58-location-service)
   - [Pricing Service](#59-pricing-service)
   - [Payment Service](#510-payment-service)
   - [Notification Service](#511-notification-service)
   - [Admin Service](#512-admin-service)
6. [Pattern & Convention dùng chung](#6-pattern--convention-dùng-chung)
7. [Cơ sở dữ liệu & Cache](#7-cơ-sở-dữ-liệu--cache)
8. [Docker & Deployment](#8-docker--deployment)
9. [Luồng nghiệp vụ chính](#9-luồng-nghiệp-vụ-chính)
10. [Testing](#10-testing)
11. [Cài đặt & Chạy](#11-cài-đặt--chạy)
12. [Giới hạn đã biết & Cải tiến tương lai](#12-giới-hạn-đã-biết--cải-tiến-tương-lai)

---

## 1. Tổng quan hệ thống

CAB System là hệ thống đặt xe taxi mô phỏng thực tế, được xây dựng theo kiến trúc **Microservices** với Node.js + Express. Hệ thống gồm:

| Thành phần | Số lượng | Công nghệ |
|---|---|---|
| API Gateway | 1 | Express + gRPC clients |
| Message Broker | 1 | RabbitMQ 3-management (AMQP) |
| Domain Services | **11** | Express + Mongoose + MongoDB + gRPC |
| Database | 1 container dùng chung | MongoDB 7 (database riêng/service) |
| Cache & Session Store | 1 | **Redis 7-alpine** (session, token cache, rate limit, FareCache) |

**Functional Requirements phủ**: FR-01 → FR-25 (đầy đủ)

**Giao tiếp nội bộ**: Gateway → Services dùng **gRPC**; Services → Services dùng gRPC (đồng bộ) và RabbitMQ (bất đồng bộ).

**Nguyên tắc thiết kế quan trọng — Phân chia Bounded Context**:
- **Booking** (4003): vòng đời từ phía khách hàng — `requested → finding_driver → driver_assigned | no_driver_found | cancelled`
- **Trip** (4011): vòng đời từ phía tài xế sau khi được gán — `driver_assigned → arrived → picked_up → in_progress → completed`
- Hai bounded context này tách biệt hoàn toàn để tuân thủ **Single Responsibility Principle (SRP)** của MSA.

---

## 2. Kiến trúc & Topology

### 2.1 Sơ đồ tổng thể

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT                                    │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │ HTTP REST (port 3000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (3000)                                │
│     Parse request → gRPC Auth.ValidateToken → gRPC domain call            │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┘
   │gRPC  │gRPC  │gRPC  │gRPC  │gRPC  │gRPC  │gRPC  │gRPC  │gRPC  │gRPC
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
 5010   5001   5002   5003   5011   5004   5005   5006   5007  5008  5009
 AUTH  CUST  DRVR  BOOK  TRIP  DISP   LOC  PRIC   PAY  NOTI  ADMN

 ─── gRPC Service-to-Service (đồng bộ) ─────────────────────────────────────
 BOOK ──gRPC──► PRIC   (estimatedFare khi tạo booking)
 TRIP ──gRPC──► BOOK   (GetBookingInternal: estimatedFare, customerId)
 TRIP ──gRPC──► PRIC   (actualFare khi trip completed)
 DISP ──gRPC──► DRVR   (GetAvailableDrivers)
 DISP ──gRPC──► LOC    (GetNearbyDrivers)
 PAY  ──gRPC──► BOOK   (GetBookingInternal: amount, customerId)
 ADMN ──gRPC──► CUST   (báo cáo / disable)
 ADMN ──gRPC──► DRVR   (báo cáo / disable)
 ADMN ──gRPC──► BOOK   (danh sách booking, resolve)
 ADMN ──gRPC──► TRIP   (driver performance: trips, ratings)
 ADMN ──gRPC──► PAY    (báo cáo doanh thu)

 ─── AMQP RabbitMQ — topic exchange "cab_events" ────────────────────────────
 BOOK ──publish──► [BookingRequested]  ──► DISP
 BOOK ──publish──► [BookingCancelled]  ──► DISP
 DISP ──publish──► [DriverAssigned]    ──► BOOK, TRIP, NOTI
 DISP ──publish──► [NoDriverFound]     ──► BOOK, NOTI
 TRIP ──publish──► [TripStatusChanged] ──► NOTI
 TRIP ──publish──► [FareCalculated]    ──► PAY  (cache fare)
 PAY  ──publish──► [PaymentCompleted]  ──► NOTI
 PAY  ──publish──► [PaymentFailed]     ──► NOTI

┌────────────────────────────────────────────────────────┐
│                  MongoDB (27017)                       │
│  auth_db     | customer_db  | driver_db               │
│  booking_db  | trip_db      | dispatch_db             │
│  location_db | pricing_db   | payment_db              │
│  notification_db            | admin_db                │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                   Redis 7 (6379)                       │
│  cab:session:{id}     cab:token_cache:{id}            │
│  cab:user_sessions:{userId}   cab:ratelimit:{userId}  │
│  cab:fare:{bookingId}                                 │
└────────────────────────────────────────────────────────┘
```

### 2.2 Cổng (Port) của từng thành phần

| Service | HTTP Port | gRPC Port | FR |
|---|---|---|---|
| api-gateway | **3000** | — | — |
| rabbitmq | — | **5672** (AMQP) / **15672** (UI) | — |
| redis | — | **6379** | — |
| auth-service | **4010** | **5010** | — |
| customer-service | **4001** | **5001** | FR-01 |
| driver-service | **4002** | **5002** | FR-02, FR-11 |
| booking-service | **4003** | **5003** | FR-03, FR-04, FR-05, FR-24, FR-25 |
| trip-service | **4011** | **5011** | FR-13, FR-14 + trip lifecycle |
| dispatch-service | **4004** | **5004** | FR-06 → FR-09, FR-12 |
| location-service | **4005** | **5005** | FR-10 |
| pricing-service | **4006** | **5006** | FR-14 |
| payment-service | **4007** | **5007** | FR-15, FR-16 |
| notification-service | **4008** | **5008** | FR-17 → FR-19 |
| admin-service | **4009** | **5009** | FR-20 → FR-23 |

### 2.3 Hai cơ chế giao tiếp

#### Đồng bộ (gRPC)
Dùng khi cần kết quả ngay — service gọi trực tiếp gRPC đến service khác:

```
api-gateway   → tất cả 10 service       (xử lý request từ client)
booking-svc   → pricing-svc             (ước tính estimatedFare khi tạo booking)
trip-svc      → booking-svc             (GetBookingInternal — estimatedFare, customerId)
trip-svc      → pricing-svc             (tính actualFare khi hoàn thành chuyến)
dispatch-svc  → driver-svc              (GetAvailableDrivers)
dispatch-svc  → location-svc            (GetNearbyDrivers)
payment-svc   → booking-svc             (GetBookingInternal — amount, customerId)
admin-svc     → customer-svc            (danh sách, disable)
admin-svc     → driver-svc              (danh sách, disable, performance)
admin-svc     → booking-svc             (danh sách, resolve)
admin-svc     → trip-svc                (GetDriverTrips, GetDriverRatings — performance report)
admin-svc     → payment-svc             (báo cáo doanh thu)
```

> **Proto files**: `proto/*.proto` — mỗi service có 1 file định nghĩa message + service RPC.
> Gateway load tất cả proto khi khởi động; `api-gateway/src/grpc/clients/index.js` khởi tạo stub client cho từng service.

#### Bất đồng bộ (RabbitMQ AMQP)
Dùng cho luồng saga — không cần kết quả ngay:

```
booking-svc   → [BookingRequested]   → dispatch-service
booking-svc   → [BookingCancelled]   → dispatch-service (hủy offer đang chờ)
dispatch-svc  → [DriverAssigned]     → booking-svc, trip-svc, notification-svc
dispatch-svc  → [NoDriverFound]      → booking-svc, notification-svc
trip-svc      → [TripStatusChanged]  → notification-service
trip-svc      → [FareCalculated]     → payment-service (cache fare)
trip-svc      → [TripRated]          → (future: driver rating update)
payment-svc   → [PaymentCompleted]   → notification-service
payment-svc   → [PaymentFailed]      → notification-service
```

---

## 3. RabbitMQ & Sự kiện

### 3.1 Cơ chế hoạt động

Hệ thống dùng **RabbitMQ** (`rabbitmq:3-management`) làm message broker thực sự qua thư viện `amqplib`.

**Kiến trúc RabbitMQ:**
- Exchange: `cab_events` (type: **topic**, durable: true)
- Mỗi subscription tạo 1 **exclusive queue** tự động, bind với routing key = tên event
- Exclusive queue tự xóa khi consumer disconnect (giữ RAM sạch)
- Publisher kết nối một lần, dùng lại channel cho mọi lần publish

**File triển khai:** `services/*/src/utils/eventBusClient.js` — mỗi service có bản riêng.

**RabbitMQ Management UI:** `http://localhost:15672` (user: `guest` / pass: `guest`)

### 3.2 Catalog sự kiện

| Sự kiện | Publisher | Subscribers | Payload chính |
|---|---|---|---|
| `BookingRequested` | booking-service | dispatch-service | `bookingId`, `customerId`, `pickupLocation`, `vehicleType`, `estimatedFare` |
| `BookingCancelled` | booking-service | dispatch-service | `bookingId`, `cancelReason`, `timestamp` |
| `DriverAssigned` | dispatch-service | booking-svc, trip-svc, notification-svc | `bookingId`, `driverId`, `etaMinutes` |
| `NoDriverFound` | dispatch-service | booking-svc, notification-svc | `bookingId` |
| `TripStatusChanged` | trip-service | notification-service | `bookingId`, `tripId`, `status`, `actorRole` |
| `FareCalculated` | trip-service | payment-service | `bookingId`, `tripId`, `actualFare`, `estimatedFare`, `amount` |
| `TripRated` | trip-service | *(future)* | `bookingId`, `tripId`, `score`, `driverId` |
| `PaymentCompleted` | payment-service | notification-service | `paymentId`, `bookingId`, `amount` |
| `PaymentFailed` | payment-service | notification-service | `paymentId`, `bookingId`, `reason` |

> **BR-10 (estimatedFare):** `FareCalculated.amount = max(actualFare, estimatedFare)`. Giá ước tính khi đặt xe được tính bằng công thức đường thẳng (Haversine) + `Pricing.Calculate`, lưu trong booking, truyền qua `GetBookingInternal` khi trip-service tạo Trip. Khách không bao giờ phải trả ít hơn giá đã ước tính.

---

## 4. Authentication & Authorization

### 4.1 Cơ chế JWT

- **Thuật toán**: HS256, secret dùng chung `JWT_SECRET` trên **tất cả** services
- **Thời hạn**: 7 ngày
- **Payload**: `{ id: "<uuid>", role: "<role>" }` (register token) hoặc `{ id, role, sessionId: "<uuid>" }` (login token)
- **Header**: `Authorization: Bearer <token>`

```
┌─────────────────────────────────────────────────┐
│            JWT Payload (register token)         │
│  {                                              │
│    "id":   "550e8400-e29b-41d4-a716-...",       │
│    "role": "customer" | "driver" |              │
│            "ops_staff" | "ops_admin",           │
│    "iat":  1234567890,                          │
│    "exp":  1235172690                           │
│  }                                              │
├─────────────────────────────────────────────────┤
│              JWT Payload (login token)          │
│  {                                              │
│    "id":        "550e8400-...",                 │
│    "role":      "customer" | "driver" | ...,   │
│    "sessionId": "a1b2c3d4-...",  ← revocable   │
│    "iat":       1234567890,                     │
│    "exp":       1235172690                      │
│  }                                              │
└─────────────────────────────────────────────────┘
```

### 4.2 Phân quyền theo Role

| Role | Mô tả | Tạo bởi |
|---|---|---|
| `customer` | Khách hàng đặt xe | `POST /customers/register` |
| `driver` | Tài xế nhận chuyến | `POST /drivers/register` hoặc ops_staff |
| `ops_staff` | Nhân viên vận hành | Script `generate-staff-token.js` |
| `ops_admin` | Quản trị viên | Script `generate-staff-token.js` |

### 4.3 Middleware

```javascript
// Xác thực — tất cả route có vấn đề
authRequired(req, res, next)   // verify JWT, gán req.user = { id, role }

// Phân quyền — giới hạn role
requireRole("ops_admin", "ops_staff")
requireRole("driver")
requireRole("customer")
```

### 4.4 Thu hồi token (Logout)

```
POST /api/v1/auth/logout   Authorization: Bearer <login_token>
→ Auth Service: ghi revoked=1 vào Redis Hash cab:session:{sessionId}
→ Auth Service: xóa ngay cab:token_cache:{sessionId} (revocation tức thời)
→ ValidateToken sau đó trả về lỗi → gateway từ chối 401
```

> **Chỉ login token có sessionId mới revocable.** Register token không qua session nên không thể thu hồi.

### 4.5 Tạo token Ops (không có Staff Service)

```bash
node scripts/generate-staff-token.js ops_admin  staff-001
node scripts/generate-staff-token.js ops_staff  staff-002
```

> Token ops không có sessionId, không revocable — dành riêng cho demo.

---

## 5. Chi tiết từng Service

### 5.1 API Gateway

**Port**: 3000 | **File chính**: [api-gateway/src/routes/gateway.routes.js](api-gateway/src/routes/gateway.routes.js)

Đóng vai trò **gRPC client hub** — nhận HTTP từ client, gọi gRPC đến service tương ứng, chuyển đổi response về JSON.

> **Rate limiting (Redis-backed)**: `tripLimiter` dùng `RedisStore` (thư viện `rate-limit-redis`) với prefix `cab:ratelimit:`, giới hạn 30 request/giây/userId. Khi scale nhiều Gateway instance, quota được chia sẻ chính xác qua Redis.

#### Route mapping (gRPC)

| Method/Path | gRPC Client → Method | Mô tả |
|---|---|---|
| `POST /api/v1/customers/register` | authClient.Register | Đăng ký khách hàng |
| `POST /api/v1/customers/login` | authClient.Login | Đăng nhập khách hàng |
| `POST /api/v1/drivers/register` | authClient.RegisterDriver | Đăng ký tài xế |
| `POST /api/v1/drivers/login` | authClient.LoginDriver | Đăng nhập tài xế |
| `POST /api/v1/auth/logout` | authClient.Logout | Thu hồi session (logout) |
| `GET /api/v1/bookings` | bookingClient.ListAll | Danh sách tất cả booking (ops_staff+) |
| `GET /api/v1/customers/me/bookings` | bookingClient.GetCustomerBookings | Lịch sử booking của khách |
| `GET /api/v1/customers/me/trips` | tripClient.GetCustomerTrips | Lịch sử trip của khách |
| `GET /api/v1/drivers/me/trips` | tripClient.GetDriverTrips | Lịch sử trip của tài xế |
| `GET /api/v1/drivers/:id/ratings` | tripClient.GetDriverRatings | Rating của tài xế |
| `POST /api/v1/bookings` | bookingClient.CreateBooking | Đặt xe |
| `GET /api/v1/bookings/:id` | bookingClient.GetBookingById | Xem booking |
| `POST /api/v1/bookings/:id/cancel` | bookingClient.CancelBooking | Hủy booking |
| `GET /api/v1/trips/:id` | tripClient.GetTripByBookingId | Xem trip theo bookingId |
| `PATCH /api/v1/trips/:id/status` | tripClient.UpdateTripStatus | Cập nhật trạng thái trip |
| `POST /api/v1/trips/:id/rating` | tripClient.AddRating | Đánh giá |
| `POST /api/v1/dispatch/:id/accept` | dispatchClient.AcceptOffer | Tài xế chấp nhận |
| `POST /api/v1/dispatch/:id/decline` | dispatchClient.DeclineOffer | Tài xế từ chối |

#### Route proxy thuần (REST, không gRPC)

| Method/Path | Target | Ghi chú |
|---|---|---|
| `POST /api/v1/bookings/events/driver-assigned` | booking-service:4003 | Webhook nội bộ |
| `POST /api/v1/bookings/events/no-driver-found` | booking-service:4003 | Webhook nội bộ |
| `POST /api/v1/trips/events/driver-assigned` | trip-service:4011 | Webhook test bypass |
| `GET /api/v1/trips/:id/internal` | trip-service:4011 | Service-to-service |

> **Lưu ý thứ tự**: các route cụ thể (`/customers/me/trips`, `/trips/events/driver-assigned`) phải khai báo **trước** các route có wildcard (`/trips/:id`).

---

### 5.2 Auth Service

**Port**: 4010 | **gRPC Port**: 5010 | **DB**: `auth_db`

Xử lý đăng ký/đăng nhập, cấp JWT, quản lý session và thu hồi token. Lưu thông tin xác thực tách biệt khỏi profile.

#### Model dữ liệu

```javascript
Credential {
  _id:          String (= userId),   // MongoDB — auth_db
  email:        String,
  role:         String,
  passwordHash: String
}

// Session lưu trong Redis (không còn MongoDB)
// cab:session:{sessionId}  →  Hash { userId, role, revoked:"0"|"1" }  TTL=7 ngày
// cab:user_sessions:{userId}  →  Set<sessionId>  (phục vụ revokeAll)
// cab:token_cache:{sessionId}  →  "{userId}|{role}" | "revoked"  TTL=60s
```

> **Thiết kế token**: Token từ `/register` do customer-service ký trực tiếp — **không có sessionId**, không revocable. Token từ `/login` do auth-service cấp — **có sessionId**, lưu session vào Redis, bị blacklist khi logout (revoked=1 + token cache bị xóa ngay lập tức).

#### API Endpoints (HTTP)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/auth/logout` | ✅ | Thu hồi session, blacklist token |
| `GET` | `/health` | ❌ | Health check |

#### API Endpoints (gRPC)

| gRPC Method | Mô tả |
|---|---|
| `Register` | Đăng ký khách hàng, trả token + user (token không có sessionId) |
| `Login` | Đăng nhập, tạo Session, trả token có sessionId |
| `RegisterDriver` | Đăng ký tài xế |
| `LoginDriver` | Đăng nhập tài xế, tạo Session |
| `ValidateToken` | Xác thực JWT + kiểm tra session chưa bị revoke |

---

### 5.3 Customer Service

**Port**: 4001 | **gRPC Port**: 5001 | **FR**: FR-01 | **DB**: `customer_db`

#### Model dữ liệu

```javascript
Customer {
  _id:          String (UUID),
  fullName:     String (required),
  email:        String (unique, required),
  passwordHash: String,
  phone:        String,
  active:       Boolean (default: true),
  createdAt:    Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/customers/me` | ✅ | customer | Xem thông tin bản thân |
| `PUT` | `/customers/me` | ✅ | customer | Cập nhật thông tin |
| `GET` | `/customers/all` | ✅ | ops_staff, ops_admin | Danh sách tất cả |
| `GET` | `/customers/:id` | ✅ | ops_staff, ops_admin | Xem theo ID |
| `PATCH` | `/customers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa tài khoản |
| `GET` | `/health` | ❌ | — | Health check |

---

### 5.4 Driver Service

**Port**: 4002 | **gRPC Port**: 5002 | **FR**: FR-02, FR-11 | **DB**: `driver_db`

#### Model dữ liệu

```javascript
Driver {
  _id:            String (UUID),
  fullName:       String (required),
  email:          String (unique),
  passwordHash:   String,
  phone:          String,
  status:         Enum ["offline", "available", "busy"],
  vehicle: {
    plate:  String,
    model:  String,
    type:   String  // "4-seat", "7-seat", "bike"
  },
  createdByStaff: Boolean (default: false),
  active:         Boolean (default: true),
  createdAt:      Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/drivers` | ✅ | ops_staff, ops_admin | Tạo tài xế (createdByStaff=true) |
| `GET` | `/drivers` | ❌ | — | Danh sách (filter `?status=available`) — nội bộ |
| `GET` | `/drivers/:id` | ❌ | — | Chi tiết theo ID — nội bộ |
| `GET` | `/drivers/me` | ✅ | driver | Xem thông tin bản thân |
| `PUT` | `/drivers/me/vehicle` | ✅ | driver | Cập nhật xe |
| `PATCH` | `/drivers/me/status` | ✅ | driver | Đổi trạng thái |
| `GET` | `/drivers/all` | ✅ | ops_staff, ops_admin | Danh sách cho admin |
| `PATCH` | `/drivers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa |
| `GET` | `/health` | ❌ | — | Health check |

---

### 5.5 Booking Service

**Port**: 4003 | **gRPC Port**: 5003 | **FR**: FR-03, FR-04, FR-05 | **DB**: `booking_db`

Quản lý vòng đời **từ phía khách hàng**: tạo booking, hủy, tra cứu trạng thái booking.

#### State Machine (Booking)

```
                    ┌──────────────┐
             ┌─────►│  requested   │◄─── POST /bookings
             │      └──────┬───────┘      → publish BookingRequested
             │             │ (auto)         (với estimatedFare)
             │             ▼
             │      ┌──────────────────┐
             │      │  finding_driver  │◄── dispatch đang xử lý
             │      └──────┬─────┬─────┘
             │             │     │
             │    [assign] │     │ [no driver]
             │             ▼     ▼
             │   ┌──────────────┐  ┌────────────────┐
             │   │driver_assign │  │no_driver_found │◄──(hủy được)
             │   └──────────────┘  └────────────────┘
             │
    ┌─────────────┐
    │  cancelled  │  (terminal — từ: requested / finding_driver / no_driver_found)
    └─────────────┘
```

**`CANCELLABLE_STATUSES`**: `["requested", "finding_driver", "no_driver_found"]`
- Khi hủy: publish `BookingCancelled` → dispatch-service hủy offer đang chờ
- `no_driver_found` cũng được hủy vì dispatch xử lý gần như ngay lập tức trong môi trường không có tài xế — khách cần có thể dismiss booking thất bại

#### estimatedFare

Khi tạo booking, service tự tính estimatedFare trước khi trả response:
1. Tính khoảng cách đường thẳng (straight-line, Haversine) giữa pickup ↔ dropoff
2. Ước tính thời gian: `max(5, round(distKm × 2))` phút
3. Gọi gRPC `Pricing.Calculate(vehicleType, distKm, estMin)` → `amount`
4. Lưu `estimatedFare` vào booking; dùng khi trip-service tính `amount` sau này

#### Model dữ liệu

```javascript
Booking {
  _id:             String (UUID),  // alias: "bookingId"
  customerId:      String,
  driverId:        String (nullable),
  pickupLocation:  { lat: Number, lng: Number },
  dropoffLocation: { lat: Number, lng: Number },
  vehicleType:     String,
  status:          Enum ["requested","finding_driver","no_driver_found","driver_assigned","cancelled"],
  estimatedFare:   Number (nullable),
  requestedAt:     Date,
  updatedAt:       Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/bookings` | ✅ | customer | Đặt xe mới (tính estimatedFare) |
| `GET` | `/bookings` | ✅ | ops_staff, ops_admin | Tất cả booking (admin) |
| `GET` | `/bookings/:id` | ✅ | customer, driver, ops | Xem booking |
| `GET` | `/bookings/:id/status` | ✅ | any | Trạng thái booking |
| `POST` | `/bookings/:id/cancel` | ✅ | customer | Hủy booking |
| `GET` | `/bookings/:id/internal` | ❌ | — | Service-to-service (trả estimatedFare, locations) |
| `GET` | `/customers/me/bookings` | ✅ | customer | Lịch sử booking của khách |
| `POST` | `/bookings/events/driver-assigned` | ❌ | — | Webhook từ dispatch/test |
| `POST` | `/bookings/events/no-driver-found` | ❌ | — | Webhook từ dispatch/test |
| `GET` | `/health` | ❌ | — | Health check |

#### gRPC Methods (BookingService)

| Method | Request | Mô tả |
|---|---|---|
| `CreateBooking` | vehicleType, locations, token | Đặt xe |
| `GetBookingById` | bookingId | Xem booking |
| `GetBookingStatus` | bookingId | Trạng thái |
| `CancelBooking` | bookingId, token | Hủy |
| `GetBookingInternal` | bookingId | Lấy estimatedFare + chi tiết (nội bộ) |
| `GetCustomerBookings` | token, limit, page | Lịch sử booking |
| `ListAll` | limit, page | Tất cả (admin) |

---

### 5.6 Trip Service

**Port**: 4011 | **gRPC Port**: 5011 | **FR**: FR-13, FR-14 + trip lifecycle | **DB**: `trip_db`

Quản lý vòng đời **từ phía tài xế** sau khi được gán: cập nhật trạng thái, tính cước, đánh giá.

#### State Machine (Trip)

```
    ┌──────────────────┐
    │  driver_assigned │◄── tạo tự động khi nhận DriverAssigned event
    └────────┬─────────┘
             │ PATCH /trips/:id/status {status: "arrived"}
             ▼
         ┌─────────┐
         │ arrived │
         └────┬────┘
              │ PATCH ... {status: "picked_up"}
              ▼
        ┌──────────┐
        │ picked_up│
        └────┬─────┘
             │ PATCH ... {status: "in_progress"}
             ▼
       ┌────────────┐
       │ in_progress│
       └─────┬──────┘
             │ PATCH ... {status: "completed", distanceKm, durationMin}
             ▼
        ┌───────────┐  → publish FareCalculated (actualFare, estimatedFare, amount)
        │ completed │  (terminal)
        └───────────┘
```

**`DRIVER_TRANSITIONS`**: `driver_assigned→arrived→picked_up→in_progress→completed` (forward only)

#### Tính cước phí (BR-10)

Khi hoàn thành chuyến:
1. Gọi gRPC `Pricing.Calculate(vehicleType, distanceKm, durationMin)` → `actualFare`
2. Lấy `estimatedFare` từ Trip record (đã lấy từ booking qua `GetBookingInternal`)
3. `amount = max(actualFare, estimatedFare)` — khách không trả ít hơn giá ước tính
4. Publish `FareCalculated { bookingId, tripId, actualFare, estimatedFare, amount }`

#### Model dữ liệu

```javascript
Trip {
  _id:             String (UUID),  // tripId nội bộ
  bookingId:       String (unique),  // dùng làm identifier từ bên ngoài
  driverId:        String,
  customerId:      String,
  vehicleType:     String,
  pickupLocation:  { lat: Number, lng: Number },
  dropoffLocation: { lat: Number, lng: Number },
  status:          Enum ["driver_assigned","arrived","picked_up","in_progress","completed"],
  estimatedFare:   Number (nullable),  // từ booking, lấy qua GetBookingInternal
  distanceKm:      Number (nullable),
  durationMin:     Number (nullable),
  actualFare:      Number (nullable),
  startedAt:       Date (nullable),
  completedAt:     Date (nullable)
}

Rating {
  _id:        String (UUID),
  tripId:     String,
  bookingId:  String (unique),  // 1 rating / 1 booking
  driverId:   String,
  customerId: String,
  score:      Number (1–5, integer),
  comment:    String (nullable, HTML-escaped),
  createdAt:  Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/trips/:id` | ✅ | any | Xem trip theo bookingId |
| `PATCH` | `/trips/:id/status` | ✅ | driver | Cập nhật trạng thái |
| `POST` | `/trips/:id/rating` | ✅ | customer | Đánh giá (sau completed) |
| `GET` | `/trips/:id/internal` | ❌ | — | Service-to-service |
| `GET` | `/customers/me/trips` | ✅ | customer | Lịch sử trip của khách |
| `GET` | `/drivers/me/trips` | ✅ | driver | Lịch sử trip của tài xế |
| `GET` | `/drivers/:id/ratings` | ❌ | — | Rating của tài xế (public) |
| `POST` | `/trips/events/driver-assigned` | ❌ | — | Webhook test (bypass RabbitMQ) |
| `GET` | `/health` | ❌ | — | Health check |

> **Lưu ý**: `:id` trong `/trips/:id` là `bookingId` (1:1 mapping), không phải `tripId` nội bộ. Điều này giúp client dùng cùng 1 identifier xuyên suốt luồng booking → trip.

#### gRPC Methods (TripService)

| Method | Mô tả |
|---|---|
| `CreateTripInternal` | Tạo trip từ event (idempotent) |
| `GetTripByBookingId` | Lấy trip theo bookingId |
| `GetTripInternal` | Lấy trip nội bộ |
| `UpdateTripStatus` | Cập nhật trạng thái |
| `AddRating` | Thêm đánh giá |
| `GetDriverRatings` | Lấy tất cả rating của tài xế |
| `GetDriverTrips` | Lịch sử trip của tài xế (paged) |
| `GetCustomerTrips` | Lịch sử trip của khách (paged) |

#### Lỗi đặc trưng

| Code | HTTP | Điều kiện |
|---|---|---|
| `TRIP_NOT_FOUND` | 404 | bookingId không có trip tương ứng |
| `INVALID_TRANSITION` | 409 | Chuyển trạng thái không hợp lệ |
| `NOT_YOUR_TRIP` | 403 | Tài xế không được gán vào trip này |
| `TRIP_NOT_COMPLETED` | 409 | Đánh giá khi trip chưa hoàn thành |
| `ALREADY_RATED` | 409 | Trip đã được đánh giá rồi |

---

### 5.7 Dispatch Service

**Port**: 4004 | **gRPC Port**: 5004 | **FR**: FR-06 → FR-09, FR-12 | **DB**: `dispatch_db`

**Matching engine** — tìm và giao chuyến cho tài xế phù hợp.

#### Thuật toán matching

```
[BookingRequested] nhận được
    │
    ▼
1. gRPC driver-service.GetAvailableDrivers
   → danh sách tài xế đang sẵn sàng
    │
    ▼
2. gRPC location-service.GetNearbyDrivers
   ?lat=&lng=&radiusKm=10&driverIds=[...]
   → lọc + sắp xếp theo khoảng cách
    │
    ▼
3. Mời lần lượt từng tài xế (candidate):
   ├─ Tạo setTimeout(DISPATCH_OFFER_TIMEOUT_SEC)
   ├─ Tài xế accept → publish DriverAssigned, dừng timer
   ├─ Tài xế decline → xóa timer, thử candidate tiếp theo
   └─ Timeout → tự chuyển sang candidate tiếp theo
    │
    ▼
4. Hết candidate → publish NoDriverFound
```

**Xử lý BookingCancelled**: khi nhận event này, dispatch dừng timer đang chờ, không giao thêm offer.

**Cấu hình qua env**:

| Biến | Mặc định | Docker dev |
|---|---|---|
| `DISPATCH_SEARCH_RADIUS_KM` | 10 | 10 |
| `DISPATCH_OFFER_TIMEOUT_SEC` | 20 | 3 |

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/dispatch/drivers/me/pending` | ✅ | driver | Xem offer đang chờ |
| `POST` | `/dispatch/:bookingId/accept` | ✅ | driver | Chấp nhận chuyến |
| `POST` | `/dispatch/:bookingId/decline` | ✅ | driver | Từ chối chuyến |
| `GET` | `/dispatch/:bookingId` | ✅ | ops | Xem trạng thái dispatch |
| `GET` | `/health` | ❌ | — | Health check |

> **Hạn chế**: `pendingTimers` là `Map` in-memory. Restart service sẽ mất toàn bộ timer đang chờ.

---

### 5.8 Location Service

**Port**: 4005 | **gRPC Port**: 5005 | **FR**: FR-10 | **DB**: `location_db`

Lưu **vị trí hiện tại** của mỗi tài xế (1 bản ghi/tài xế, upsert).

#### Model dữ liệu

```javascript
LocationRecord {
  _id:       String (= driverId),
  driverId:  String,
  lat:       Number,
  lng:       Number,
  updatedAt: Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/locations` | ✅ | driver | Cập nhật vị trí bản thân |
| `GET` | `/locations/drivers/:id` | ❌ | — | Vị trí theo driverId (nội bộ) |
| `GET` | `/locations/nearby-drivers` | ❌ | — | Tài xế gần điểm (nội bộ) |

---

### 5.9 Pricing Service

**Port**: 4006 | **gRPC Port**: 5006 | **FR**: FR-14 | **DB**: `pricing_db`

**Stateless** — tính cước phí dựa trên rules cấu hình. Được gọi bởi cả booking-service (ước tính) và trip-service (thực tế).

#### Công thức tính phí

```
fareAmount = round(baseFare + distanceKm × perKmRate + durationMin × perMinuteRate)
```

#### Model dữ liệu

```javascript
PricingRule {
  _id:            String (UUID),
  vehicleType:    String (unique),  // "4-seat", "7-seat", "bike"
  baseFare:       Number,
  perKmRate:      Number,
  perMinuteRate:  Number,
  active:         Boolean
}
```

**Khởi động**: nếu collection trống, seed từ `services/pricing-service/data/pricingRules.json`.

#### API Endpoints / gRPC

| Method/RPC | Auth | Mô tả |
|---|---|---|
| `POST /pricing/calculate` (REST) | ❌ | Tính phí — nội bộ |
| `GET /pricing/rules` | ops_admin | Danh sách rule |
| `POST /pricing/rules` | ops_admin | Tạo rule |
| `PUT /pricing/rules/:id` | ops_admin | Cập nhật rule |
| gRPC `Calculate` | — | `{ vehicleType, distanceKm, durationMin }` → `{ amount }` |

---

### 5.10 Payment Service

**Port**: 4007 | **gRPC Port**: 5007 | **FR**: FR-15, FR-16 | **DB**: `payment_db`

#### Model dữ liệu

```javascript
Payment {
  _id:        String (UUID),
  bookingId:  String (unique),
  customerId: String,
  amount:     Number,
  method:     Enum ["cash", "card", "e-wallet"],
  status:     Enum ["pending", "success", "failed"],
  retryCount: Number (default: 0),
  createdAt:  Date,
  updatedAt:  Date
}

// FareCache lưu trong Redis (không còn MongoDB)
// cab:fare:{bookingId}  →  amount (string số)  TTL=24h
// Được populate từ sự kiện RabbitMQ FareCalculated
```

#### Luồng xử lý thanh toán

```
POST /payments { bookingId, method }
    │
    ▼
1. Lấy amount:
   ├─ Từ FareCache (FareCalculated event populate: amount = max(actual, estimated))
   └─ Fallback: gRPC booking-service.GetBookingInternal
    │
    ▼
2. mockGateway.charge(method, amount):
   ├─ "cash"     → thành công 100%
   ├─ "card"     → thành công 85%
   └─ "e-wallet" → thành công 85%
    │
    ├─► Thành công → publish PaymentCompleted
    └─► Thất bại   → publish PaymentFailed
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/payments` | ✅ | customer | Tạo & xử lý thanh toán |
| `GET` | `/payments/:id` | ✅ | customer (owner), ops | Xem payment |
| `POST` | `/payments/:id/retry` | ✅ | customer (owner) | Retry khi failed |
| `GET` | `/customers/me/payments` | ✅ | customer | Lịch sử thanh toán |
| `POST` | `/payments/webhook` | ❌ | — | Callback từ cổng ngoài (demo) |
| `GET` | `/health` | ❌ | — | Health check |

---

### 5.11 Notification Service

**Port**: 4008 | **gRPC Port**: 5008 | **FR**: FR-17, FR-18, FR-19 | **DB**: `notification_db`

**Pure event consumer** — lắng nghe sự kiện, tạo thông báo, log ra console.

#### Sự kiện xử lý

| Event nhận | Tạo thông báo cho |
|---|---|
| `DriverAssigned` | customer (tài xế đang đến), driver (bạn có chuyến mới) |
| `NoDriverFound` | customer (không tìm được tài xế) |
| `TripStatusChanged` | customer + driver |
| `FareCalculated` | customer (chuyến hoàn thành, số tiền) |
| `PaymentCompleted` | customer (thanh toán thành công) |
| `PaymentFailed` | customer (thanh toán thất bại) |

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/notifications/me` | ✅ | any | Thông báo của bản thân |
| `POST` | `/notifications/channels` | ✅ | ops_admin | Tạo channel |
| `GET` | `/health` | ❌ | — | Health check |

---

### 5.12 Admin Service

**Port**: 4009 | **gRPC Port**: 5009 | **FR**: FR-20 → FR-23 | **DB**: `admin_db`

**Pure aggregator** — không có domain data riêng (trừ `ResolvedIssue`). Gọi gRPC đến các service khác.

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/admin/customers` | ✅ | ops_staff, ops_admin | Danh sách khách hàng |
| `PATCH` | `/admin/customers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa khách hàng |
| `GET` | `/admin/drivers` | ✅ | ops_staff, ops_admin | Danh sách tài xế |
| `PATCH` | `/admin/drivers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa tài xế |
| `GET` | `/admin/bookings` | ✅ | ops_staff, ops_admin | Danh sách booking |
| `POST` | `/admin/bookings/:id/resolve` | ✅ | ops_staff, ops_admin | Ghi nhận giải quyết vấn đề |
| `GET` | `/admin/reports/trips` | ✅ | ops_admin | Báo cáo số chuyến |
| `GET` | `/admin/reports/revenue` | ✅ | ops_admin | Báo cáo doanh thu |
| `GET` | `/admin/reports/completion-rate` | ✅ | ops_admin | Tỷ lệ hoàn thành |
| `GET` | `/admin/reports/cancellation-rate` | ✅ | ops_admin | Tỷ lệ hủy |
| `GET` | `/admin/reports/driver-performance` | ✅ | ops_admin | Hiệu suất tài xế |
| `GET` | `/health` | ❌ | — | Health check |

---

## 6. Pattern & Convention dùng chung

### 6.1 Kiến trúc phân layer

Mọi service đều theo đúng pattern sau:

```
Request
  │
  ▼
Middleware (authRequired, requireRole, express.json)
  │
  ▼
Routes (*.routes.js) — định nghĩa endpoint + gắn middleware
  │
  ▼
Controllers (*.controller.js) — thin, chỉ gọi repo + trả response
  │  asyncHandler(() => { ... })  ← bắt lỗi async, chuyển sang next()
  ▼
Repositories (*.repository.js) — business logic, validation
  │
  ▼
DAOs (*.dao.js) — thin Mongoose query wrappers
  │
  ▼
Models (*.model.js) — Mongoose schema + toJSON transform
  │
  ▼
MongoDB
```

### 6.2 gRPC Handler Pattern

Mỗi service có thêm lớp gRPC server:

```
gRPC Request
  │
  ▼
grpc/handler.js — parse request, gọi repo/controller logic
  │
  ▼
Repository — business logic (dùng chung với HTTP controller)
  │
  ▼
DAO → MongoDB
```

Handler dùng hàm `grpcResponse(call, callback, { data })` để chuẩn hóa response dạng `GrpcResponse { ok, data, error }`.

### 6.3 Response format chuẩn

```javascript
// Thành công — 1 item (HTTP)
{ "data": { ...item } }

// Thành công — list (HTTP)
{ "data": [...items], "meta": { "total": N } }

// Lỗi (HTTP)
{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }

// gRPC response (JSON-serialized trong field `data`)
{ ok: true, data: "{ \"bookingId\": \"...\", ... }" }
{ ok: false, error: "{ \"code\": \"NOT_FOUND\", \"message\": \"...\" }" }
```

### 6.4 Mã lỗi phổ biến

| Code | Status | Mô tả |
|---|---|---|
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `UNAUTHORIZED` | 401 | Thiếu hoặc sai token |
| `FORBIDDEN` | 403 | Không có quyền |
| `EMAIL_ALREADY_EXISTS` | 409 | Email trùng |
| `INVALID_TRANSITION` | 409 | Chuyển trạng thái không hợp lệ |
| `NOT_CANCELLABLE` | 409 | Booking không thể hủy ở trạng thái hiện tại |
| `TRIP_NOT_COMPLETED` | 409 | Thao tác yêu cầu trip đã hoàn thành |
| `ALREADY_RATED` | 409 | Trip đã được đánh giá |
| `NOT_YOUR_TRIP` | 403 | Tài xế không được gán vào trip này |
| `PAYMENT_ALREADY_EXISTS` | 409 | Đã có payment cho booking này |
| `PAYMENT_NOT_FAILED` | 400 | Retry khi payment không ở trạng thái failed |

### 6.5 UUID làm Primary Key

| Entity | `_id` trong DB | Alias trong response |
|---|---|---|
| Customer | `_id` | `id` |
| Driver | `_id` | `id` |
| Booking | `_id` | `bookingId` |
| Trip | `_id` | `tripId`; bookingId dùng làm route param |
| Payment | `_id` | `id` |

### 6.6 XSS Protection

Trường `comment` trong Rating được escape HTML trước khi lưu (`&lt;script&gt;` thay cho `<script>`), ngăn Stored XSS khi dữ liệu trả về client.

---

## 7. Cơ sở dữ liệu & Cache

### 7.1 Kiến trúc "Database per Service"

```
MongoDB container (port 27017)
├── auth_db
├── customer_db
├── driver_db
├── booking_db        ← mới (tách từ trip_db cũ)
├── trip_db           ← mới (chỉ chứa Trip + Rating)
├── dispatch_db
├── location_db
├── pricing_db
├── payment_db
├── notification_db
└── admin_db
```

Cùng 1 MongoDB container nhưng **tách biệt hoàn toàn về schema/collection**. Không service nào query trực tiếp vào database của service khác.

### 7.2 Kết nối

```bash
MONGO_URI=mongodb://mongodb:27017/<service>_db
```

### 7.3 Seed data

| Service | Có seed data | Nguồn |
|---|---|---|
| pricing-service | ✅ | `data/pricingRules.json` → Mongo (1 lần, nếu collection trống) |
| notification-service | ✅ | Hard-code trong `server.js` (channels: push, sms) |
| Các service còn lại | ❌ | Không seed |

### 7.4 Redis Key Space

| Key pattern | Type | TTL | Service | Mục đích |
|---|---|---|---|---|
| `cab:session:{sessionId}` | Hash `{userId, role, revoked}` | 7 ngày | auth-service | Lưu trạng thái session đăng nhập |
| `cab:user_sessions:{userId}` | Set `<sessionId>` | 7 ngày | auth-service | Index sessionId theo userId (revokeAll) |
| `cab:token_cache:{sessionId}` | String `"{userId}\|{role}"` hoặc `"revoked"` | 60s | auth-service | Cache kết quả validateToken |
| `cab:ratelimit:{userId}` | String (counter) | windowMs | api-gateway | Rate limiting per-user (RedisStore) |
| `cab:fare:{bookingId}` | String (amount số) | 24h | payment-service | Cache cước phí từ FareCalculated event |

---

## 8. Docker & Deployment

### 8.1 Thứ tự khởi động (depends_on — 15 container)

```
mongodb + rabbitmq + redis (parallel)
  ├─► auth-service          (phụ thuộc: mongodb + redis)
  │     ├─► customer-service
  │     └─► driver-service
  ├─► location-service
  ├─► pricing-service
  │     ├─► booking-service
  │     │     └─► trip-service ─────────────────────┐
  │     │           ├─► payment-service (mongodb+redis)│
  │     │           ├─► notification-service         │
  │     │           └─► admin-service                │
  │     └─► dispatch-service ◄──────────────────────┘
  │           (phụ thuộc: rabbitmq + driver + location)
  └─► api-gateway (chờ TẤT CẢ service healthy, phụ thuộc: redis)
```

### 8.2 Healthcheck

Mỗi container khai báo healthcheck:
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:<port>/health"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 15s
```

`docker compose up --wait` chờ đến khi tất cả healthy.

### 8.3 Images Docker Hub

```
thinhpvt/cab-auth-service:latest
thinhpvt/cab-customer-service:latest
thinhpvt/cab-driver-service:latest
thinhpvt/cab-booking-service:latest
thinhpvt/cab-trip-service:latest
thinhpvt/cab-dispatch-service:latest
thinhpvt/cab-location-service:latest
thinhpvt/cab-pricing-service:latest
thinhpvt/cab-payment-service:latest
thinhpvt/cab-notification-service:latest
thinhpvt/cab-admin-service:latest
thinhpvt/cab-api-gateway:latest
```

### 8.4 Biến môi trường quan trọng

| Biến | Mô tả | Mặc định |
|---|---|---|
| `JWT_SECRET` | Secret ký JWT (dùng chung) | `dev-secret-change-me` |
| `PORT` | HTTP port của service | per-service |
| `GRPC_PORT` | gRPC port của service | per-service |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/<db>` |
| `RABBITMQ_URL` | RabbitMQ AMQP URL | `amqp://localhost:5672` |
| `REDIS_URL` | Redis connection URL (auth, payment, api-gateway) | `redis://localhost:6379` |
| `PRICING_GRPC_URL` | URL gRPC pricing-service | `localhost:5006` |
| `BOOKING_GRPC_URL` | URL gRPC booking-service | `localhost:5003` |
| `DISPATCH_OFFER_TIMEOUT_SEC` | Timeout tài xế quyết định | `20` (dev: `3`) |

---

## 9. Luồng nghiệp vụ chính

### 9.1 Đặt xe → Hoàn thành (Happy path)

```
Khách hàng                Gateway    Booking-svc  RabbitMQ   Dispatch   Trip-svc   Pricing-svc  Payment-svc
    │                        │            │            │          │          │            │            │
    │─POST /bookings─────────►            │            │          │          │            │            │
    │                        │─gRPC──────►│            │          │          │            │            │
    │                        │     gRPC Pricing.Calculate (estimatedFare)───►│            │            │
    │                        │     Create Booking                 │          │            │            │
    │                        │     status=requested               │          │            │            │
    │                        │            │─publish BookingReq──►│          │            │            │
    │◄201 {bookingId, estimatedFare}◄─────│            │──────────►          │            │            │
    │                        │            │            │   gRPC GetAvailableDrivers        │            │
    │                        │            │            │   gRPC GetNearbyDrivers           │            │
    │                        │            │            │   Offer driver (setTimeout)       │            │
    │                        │            │            │          │          │            │            │
Tài xế─GET /dispatch/me/pending──────────────────────────────────►          │            │            │
Tài xế─POST /dispatch/:id/accept─────────────────────────────────►          │            │            │
    │                        │            │◄─DriverAssigned──────│          │            │            │
    │                        │     booking status=driver_assigned │          │            │            │
    │                        │            │            │          │◄DriverAssigned        │            │
    │                        │            │            │          │  gRPC GetBookingInternal           │
    │                        │            │            │          │  Create Trip record   │            │
    │                        │            │            │          │  status=driver_assigned            │
    │                        │            │            │          │            │            │            │
Tài xế─PATCH /trips/:id/status {arrived}────────────────────────────────────►│            │            │
Tài xế─PATCH /trips/:id/status {picked_up}──────────────────────────────────►│            │            │
Tài xế─PATCH /trips/:id/status {in_progress}────────────────────────────────►│            │            │
Tài xế─PATCH /trips/:id/status {completed, distanceKm, durationMin}──────────►│            │            │
    │                        │            │            │          │  gRPC Pricing.Calculate────────────►│
    │                        │            │            │          │◄─actualFare────────────────────────│
    │                        │            │            │          │  amount=max(actual,estimated)       │
    │                        │            │            │◄FareCal.─│            │            │            │
    │                        │            │            │          │            │            │  FareCached│
    │                        │            │            │          │            │            │            │
Khách─POST /payments {bookingId, method: "cash"}──────────────────────────────────────────────────────►│
    │◄201 {status: "success", amount}─────────────────────────────────────────────────────────────────│
    │                        │            │            │          │            │            │            │
Khách─POST /trips/:id/rating {score: 5}────────────────────────────────────────►│            │            │
    │◄201 {rating}───────────────────────────────────────────────────────────────│            │            │
```

### 9.2 Hủy booking

```
Khách─POST /bookings/:id/cancel
    │
    ▼
booking-service: kiểm tra CANCELLABLE_STATUSES ["requested","finding_driver","no_driver_found"]
    ├─ OK → status=cancelled, publish BookingCancelled
    │         └─► dispatch-service: hủy timer đang chờ, không giao offer nữa
    └─ Fail (driver_assigned, cancelled) → 409 NOT_CANCELLABLE
```

### 9.3 Không tìm được tài xế

```
Dispatch: hết danh sách candidate
    └─► publish NoDriverFound
            ├─► booking-service: status = "no_driver_found"
            └─► notification-service: thông báo cho khách
```

---

## 10. Testing

### 10.1 Cấu trúc test suite

```
testcase/
├── .env                    # BASE_URL=http://localhost:3000/api/v1, JWT_SECRET
├── package.json            # jest --runInBand (tuần tự, tránh race condition)
├── tests/
│   ├── helpers.js          # req(), signCustomerToken(), signDriverToken(), uuid()
│   ├── admin/              # TC-ADMIN-01..XX
│   ├── auth/               # TC-AUTH-01..06  (JWT validation + logout revocation)
│   ├── booking/            # TC-BOOK-01..11  (vòng đời booking qua API Gateway)
│   ├── customer/           # TC-CUST-01..22
│   ├── dispatch/           # TC-DISP-01..XX
│   ├── driver/             # TC-DRV-01..XX
│   ├── gateway/            # TC-GATE-01..03
│   ├── location/           # TC-LOC-01..21
│   ├── notification/       # TC-NOTIF-01..XX
│   ├── payment/            # TC-PAY-01..XX
│   ├── pricing/            # TC-PRIC-01..XX
│   └── trip/               # TC-TRIP-01..22
│       └── _setup.js       # fixture builder (createAssignedTrip, createCompletedTrip, ...)
```

### 10.2 Helpers quan trọng

```javascript
// helpers.js
req(method, path, {token?, body?})  // fetch → { status, json }
randEmail(prefix)                   // email ngẫu nhiên tránh trùng
signCustomerToken(id)               // JWT customer trực tiếp (bypass auth-service)
signDriverToken(id)                 // JWT driver trực tiếp
signStaffToken(role, id)            // JWT ops trực tiếp

// trip/_setup.js
createAssignedTrip()
  // → tạo booking + gọi /bookings/events/driver-assigned + /trips/events/driver-assigned
  // → trả { bookingId, customerId, driverId, customerToken, driverToken }

createCompletedTrip()
  // → gọi createAssignedTrip() + PATCH /trips/:id/status qua 4 bước

advanceTripTo(bookingId, driverToken, targetStatus)
  // → PATCH /trips/:id/status từng bước cho đến targetStatus

registerAvailableDriver(plateSuffix)
  // → đăng ký + set available + POST /locations
  // → cần Dispatch thật chạy (TC-TRIP-15)

pollForOffer(driverToken, {timeoutMs})
  // → polling GET /dispatch/drivers/me/pending cho đến khi có offer
```

### 10.3 Vì sao dùng webhook `/trips/events/driver-assigned`?

Trong môi trường test, không cần bật cả RabbitMQ + Dispatch. Thay vào đó:
1. Test gọi `POST /bookings/events/driver-assigned` → booking-service cập nhật booking status
2. Test gọi `POST /trips/events/driver-assigned` → trip-service tạo Trip record
3. Hàm `createTripFromEvent` trong trip-service là **idempotent** — gọi nhiều lần với cùng bookingId chỉ tạo 1 Trip

### 10.4 Chạy test

```bash
# Bảo đảm stack đang chạy
docker compose up -d --wait

cd testcase
npm test                              # tất cả — kỳ vọng: 100 suites, 105 tests PASS
npx jest tests/auth/                  # 6 TC auth
npx jest tests/booking/               # 11 TC booking
npx jest tests/trip/                  # chỉ trip tests
npx jest tests/trip/TC-TRIP-07        # 1 test cụ thể
```

**Kết quả kỳ vọng khi chạy toàn bộ:**

```
Test Suites: 100 passed, 100 total
Tests:       105 passed, 105 total
Time:        ~45–60 s
```

---

## 11. Cài đặt & Chạy

### 11.1 Chạy với Docker (khuyến nghị)

```bash
git clone <repo>
cd 23658751_PhamVoTruongThinh_CABSYSTEM

# Development (build từ source)
docker compose up --build -d --wait

# Kiểm tra
curl http://localhost:3000/health

# RabbitMQ UI
open http://localhost:15672  # guest/guest
```

### 11.2 Thứ tự chạy thủ công

```bash
# Bắt buộc: MongoDB + RabbitMQ trước
# Sau đó theo thứ tự:
node services/auth-service/src/server.js
node services/customer-service/src/server.js
node services/driver-service/src/server.js
node services/pricing-service/src/server.js
node services/booking-service/src/server.js
node services/trip-service/src/server.js
node services/location-service/src/server.js
node services/dispatch-service/src/server.js
node services/payment-service/src/server.js
node services/notification-service/src/server.js
node services/admin-service/src/server.js
node api-gateway/src/server.js
```

---

## 12. Giới hạn đã biết & Cải tiến tương lai

### 12.1 Giới hạn trong bản demo

| Vấn đề | Mô tả | Giải pháp đề xuất |
|---|---|---|
| **Không có Staff/Ops Service** | Token ops tạo bằng script CLI | Xây dựng ops-account-service |
| **Dispatch timers in-memory** | Mất timer khi restart service | Bull/BullMQ với Redis persistence |
| **Mock payment gateway** | 15% thất bại ngẫu nhiên; không verify signature | Tích hợp VNPay/Momo |
| **Notification chỉ log** | Không push/SMS thật | Firebase FCM, Twilio SMS |
| **Admin báo cáo in-memory** | Fetch toàn bộ dữ liệu rồi filter | MongoDB aggregation pipeline |
| **Không có real-time** | Client phải polling | WebSocket (Socket.io) hoặc SSE |

### 12.2 Vấn đề bảo mật đã biết (chấp nhận cho demo)

| Vấn đề | Ghi chú |
|---|---|
| Internal endpoints không auth | An toàn trong Docker network |
| JWT_SECRET dùng chung | Một secret lộ → toàn bộ hệ thống bị compromise |
| Payment webhook không verify signature | Demo simplification |
| `active: false` không block đăng nhập | Customer bị disable vẫn đăng nhập được |

**Đã sửa:**

| Vấn đề | Fix |
|---|---|
| `GET /api/v1/bookings` không có middleware phân quyền | Thêm `requireStaff` — customer không thể xem danh sách tất cả booking |
| `CANCELLABLE_STATUSES` thiếu `no_driver_found` | Booking ở trạng thái `no_driver_found` nay có thể hủy |
| **Không có rate limiting** | Tích hợp Redis-backed rate limiter (`rate-limit-redis` + RedisStore) vào api-gateway — 30 req/s/userId, chính xác khi scale nhiều instance |
| **Session lưu MongoDB, không thu hồi tức thời** | Chuyển sang Redis Hash với TTL — logout xóa token cache ngay, revocation có hiệu lực < 1s |
| **FareCache là MongoDB collection** | Chuyển sang Redis String với TTL 24h — tự dọn dẹp, không cần TTL index MongoDB |

### 12.3 Mapping Functional Requirements

| FR | Tên | Service | Status |
|---|---|---|---|
| FR-01 | Quản lý tài khoản khách hàng | customer-service | ✅ |
| FR-02 | Quản lý tài khoản tài xế | driver-service | ✅ |
| FR-03 | Đặt xe | booking-service | ✅ |
| FR-04 | Theo dõi trạng thái booking | booking-service | ✅ |
| FR-05 | Hủy chuyến | booking-service | ✅ |
| FR-06 | Tìm tài xế | dispatch-service | ✅ |
| FR-07 | Giao chuyến cho tài xế | dispatch-service | ✅ |
| FR-08 | Tài xế nhận/từ chối chuyến | dispatch-service | ✅ |
| FR-09 | Tự động thử tài xế tiếp theo | dispatch-service | ✅ |
| FR-10 | Cập nhật vị trí tài xế | location-service | ✅ |
| FR-11 | Quản lý phương tiện tài xế | driver-service | ✅ |
| FR-12 | Ước tính ETA | dispatch-service | ✅ (heuristic) |
| FR-13 | Đánh giá chuyến | trip-service | ✅ |
| FR-14 | Tính cước phí | pricing-service (gọi bởi booking + trip) | ✅ |
| FR-15 | Xử lý thanh toán | payment-service | ✅ (mock) |
| FR-16 | Retry thanh toán | payment-service | ✅ |
| FR-17 | Thông báo DriverAssigned/NoDriverFound | notification-service | ✅ (log) |
| FR-18 | Thông báo thay đổi trạng thái | notification-service | ✅ (log) |
| FR-19 | Thông báo thanh toán | notification-service | ✅ (log) |
| FR-20 | Quản lý tài khoản (admin) | admin-service | ✅ |
| FR-21 | Xem danh sách booking (admin) | admin-service | ✅ |
| FR-22 | Giải quyết vấn đề | admin-service | ✅ |
| FR-23 | Báo cáo vận hành | admin-service | ✅ (in-memory agg) |
| FR-24 | Lịch sử booking khách hàng | booking-service | ✅ |
| FR-25 | Lịch sử trip tài xế | trip-service | ✅ |

---

*Tài liệu này được tổng hợp từ việc đọc toàn bộ source code thực tế của hệ thống.*  
*Cập nhật lần cuối: 2026-10-09 — tích hợp Redis 7 (session store, token cache, rate limiting, FareCache)*
