# CAB System — Tài liệu Kỹ thuật Chi tiết

> Hệ thống đặt xe taxi theo kiến trúc Microservices, triển khai đầy đủ 23 Functional Requirements.  
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
   - [Customer Service](#52-customer-service)
   - [Driver Service](#53-driver-service)
   - [Trip Service](#54-trip-service)
   - [Dispatch Service](#55-dispatch-service)
   - [Location Service](#56-location-service)
   - [Pricing Service](#57-pricing-service)
   - [Payment Service](#58-payment-service)
   - [Notification Service](#59-notification-service)
   - [Admin Service](#510-admin-service)
6. [Pattern & Convention dùng chung](#6-pattern--convention-dùng-chung)
7. [Cơ sở dữ liệu](#7-cơ-sở-dữ-liệu)
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
| API Gateway | 1 | Express + http-proxy-middleware |
| Message Broker | 1 | RabbitMQ 3-management (AMQP) |
| Event Bus (legacy) | 1 | Express (HTTP pub/sub, giữ cho tương thích) |
| Domain Services | 9 | Express + Mongoose + MongoDB |
| Database | 1 container dùng chung | MongoDB 7 (database riêng/service) |

**Functional Requirements phủ**: FR-01 → FR-23 (đầy đủ)

---

## 2. Kiến trúc & Topology

### 2.1 Sơ đồ tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (port 3000)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (3000)                         │
│              Reverse Proxy — route theo path prefix             │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
 4001   4002   4003   4004   4005   4006   4007   4008/4009
 CUST  DRVR   TRIP  DISP   LOC   PRIC   PAY  NOTIF/ADMIN
   │      │      │      │                     │      │
   └──────┴──────┴──────┴─────────────────────┴──────┘
                             │ AMQP (amqplib)
                             ▼
                   ┌───────────────────┐
                   │  RabbitMQ (5672)  │  ← topic exchange
                   │  cab_events       │    "cab_events"
                   │  UI: 15672        │
                   └─────────┬─────────┘
                             │ AMQP consumers
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
       trip-svc          dispatch-svc      payment-svc
       notif-svc         driver-svc        ...

          ┌──────────────────────────────────────┐
          │          MongoDB (27017)             │
          │  customer_db | driver_db | trip_db  │
          │  dispatch_db | location_db | ...    │
          └──────────────────────────────────────┘
```

### 2.2 Cổng (Port) của từng thành phần

| Service | Port | Biến môi trường | FR |
|---|---|---|---|
| api-gateway | **3000** | — | — |
| rabbitmq | **5672** (AMQP) / **15672** (UI) | `RABBITMQ_URL` | — |
| event-bus-service | **4000** | — (legacy, không dùng cho routing) | — |
| customer-service | **4001** | `CUSTOMER_SERVICE_URL` | FR-01 |
| driver-service | **4002** | `DRIVER_SERVICE_URL` | FR-02, FR-11 |
| trip-service | **4003** | `TRIP_SERVICE_URL` | FR-03, FR-04, FR-05, FR-13 |
| dispatch-service | **4004** | `DISPATCH_SERVICE_URL` | FR-06 → FR-09, FR-12 |
| location-service | **4005** | `LOCATION_SERVICE_URL` | FR-10 |
| pricing-service | **4006** | `PRICING_SERVICE_URL` | FR-14 |
| payment-service | **4007** | `PAYMENT_SERVICE_URL` | FR-15, FR-16 |
| notification-service | **4008** | `NOTIFICATION_SERVICE_URL` | FR-17 → FR-19 |
| admin-service | **4009** | `ADMIN_SERVICE_URL` | FR-20 → FR-23 |

### 2.3 Hai cơ chế giao tiếp

#### Đồng bộ (Synchronous REST)
Dùng khi cần kết quả ngay — service gọi trực tiếp HTTP đến service khác:

```
dispatch-service  → driver-service    (lấy danh sách tài xế available)
dispatch-service  → location-service  (lấy tài xế gần điểm đón)
payment-service   → trip-service      (lấy thông tin fare/trip)
notification-svc  → trip-service      (lấy chi tiết chuyến để gửi thông báo)
admin-service     → customer/driver/trip/payment-service (tổng hợp báo cáo)
trip-service      → pricing-service   (tính phí khi hoàn thành chuyến)
```

> Các endpoint dành riêng cho service-to-service (ví dụ `GET /trips/:id/internal`)
> đều **bỏ qua xác thực** (`// service-to-service: bỏ qua auth để đơn giản hóa demo`).
> Điều này an toàn khi các service nằm trong mạng Docker nội bộ.

#### Bất đồng bộ (Async via RabbitMQ)
Dùng cho luồng saga — không cần kết quả ngay, giao tiếp qua AMQP:

```
trip-service   → [TripRequested]      → dispatch-service
dispatch-svc   → [DriverAssigned]     → trip-service, notification-service
dispatch-svc   → [NoDriverFound]      → trip-service, notification-service
trip-service   → [TripStatusChanged]  → notification-service
trip-service   → [TripCompleted]      → notification-service
trip-service   → [FareCalculated]     → payment-service (cache fare)
trip-service   → [TripRated]          → (future: driver rating update)
payment-svc    → [PaymentCompleted]   → notification-service
payment-svc    → [PaymentFailed]      → notification-service
```

---

## 3. RabbitMQ & Sự kiện

### 3.1 Cơ chế hoạt động

Hệ thống dùng **RabbitMQ** (`rabbitmq:3-management`) làm message broker thực sự qua thư viện `amqplib`.

```
Publisher                RabbitMQ              Subscribers
   │                   (topic exchange)            │
   │  ch.publish()         │                       │
   │  event, payload  ──►  │ cab_events exchange   │
   │  routing key = event  │                       │
   │                       │  AMQP consumer        │
   │                       │  exclusive queue  ──► │
   │                       │  ch.ack(msg)          │
```

**Kiến trúc RabbitMQ:**
- Exchange: `cab_events` (type: **topic**, durable: true)
- Mỗi subscription tạo 1 **exclusive queue** tự động, bind với routing key = tên event
- Exclusive queue tự xóa khi consumer disconnect (giữ RAM sạch)
- Publisher kết nối một lần, dùng lại channel cho mọi lần publish
- Subscriber tạo channel riêng để isolate error handling

**File triển khai:** `services/*/src/utils/eventBusClient.js` — mỗi service có bản riêng (amqplib)

**RabbitMQ Management UI:** `http://localhost:15672` (user: `guest` / pass: `guest`)
- Xem exchanges, queues, bindings, messages in-flight

### 3.2 Catalog sự kiện

| Sự kiện | Publisher | Subscribers | Payload chính |
|---|---|---|---|
| `TripRequested` | trip-service | dispatch-service | `tripId`, `pickupLocation`, `vehicleType` |
| `DriverAssigned` | dispatch-service | trip-service, notification-service | `tripId`, `driverId`, `etaMinutes` |
| `NoDriverFound` | dispatch-service | trip-service, notification-service | `tripId` |
| `TripStatusChanged` | trip-service | notification-service | `tripId`, `status`, `actorRole` |
| `TripCompleted` | trip-service | notification-service | `tripId`, `fareAmount` |
| `FareCalculated` | trip-service | payment-service | `tripId`, `fareAmount` |
| `TripRated` | trip-service | *(future)* | `tripId`, `score`, `driverId` |
| `PaymentCompleted` | payment-service | notification-service | `paymentId`, `tripId`, `amount` |
| `PaymentFailed` | payment-service | notification-service | `paymentId`, `tripId`, `reason` |

---

## 4. Authentication & Authorization

### 4.1 Cơ chế JWT

- **Thuật toán**: HS256, secret dùng chung `JWT_SECRET` trên **tất cả** services
- **Thời hạn**: 7 ngày
- **Payload**: `{ id: "<uuid>", role: "<role>" }`
- **Header**: `Authorization: Bearer <token>`

```
┌─────────────────────────────────────────────────┐
│                   JWT Payload                   │
│  {                                              │
│    "id":   "550e8400-e29b-41d4-a716-...",       │
│    "role": "customer" | "driver" |              │
│            "ops_staff" | "ops_admin",           │
│    "iat":  1234567890,                          │
│    "exp":  1235172690                           │
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

### 4.4 Tạo token Ops (không có Staff Service)

```bash
node scripts/generate-staff-token.js ops_admin  staff-001
node scripts/generate-staff-token.js ops_staff  staff-002
```

> **Hạn chế**: không có đăng nhập/đăng xuất, không có revocation — dành riêng cho demo.

---

## 5. Chi tiết từng Service

### 5.1 API Gateway

**Port**: 3000 | **File chính**: [api-gateway/src/routes/gateway.routes.js](api-gateway/src/routes/gateway.routes.js)

Đóng vai trò **reverse proxy thuần** — không có business logic, không parse body (không dùng `express.json()`), forward nguyên vẹn request đến service đích.

#### Route mapping

| Path prefix | Chuyển đến | Ghi chú |
|---|---|---|
| `/api/v1/customers/me/trips` | trip-service:4003 | ⚠️ Phải khai báo **trước** rule customer |
| `/api/v1/customers/me/payments` | payment-service:4007 | ⚠️ Phải khai báo trước |
| `/api/v1/drivers/:id/ratings` | trip-service:4003 | ⚠️ Phải khai báo trước |
| `/api/v1/customers` | customer-service:4001 | |
| `/api/v1/drivers` | driver-service:4002 | |
| `/api/v1/trips` | trip-service:4003 | |
| `/api/v1/dispatch` | dispatch-service:4004 | |
| `/api/v1/locations` | location-service:4005 | |
| `/api/v1/pricing` | pricing-service:4006 | |
| `/api/v1/payments` | payment-service:4007 | |
| `/api/v1/notifications` | notification-service:4008 | |
| `/api/v1/admin` | admin-service:4009 | |

> **Lưu ý**: Thứ tự route khai báo rất quan trọng — `/customers/me/trips` phải đứng trước `/customers` vì cùng prefix.

#### Endpoint đặc biệt

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/health` | Health check của gateway |

---

### 5.2 Customer Service

**Port**: 4001 | **FR**: FR-01 | **DB**: `customer_db`

#### Model dữ liệu

```javascript
Customer {
  _id:          String (UUID),     // alias: "id" trong response
  fullName:     String (required),
  email:        String (unique, required),
  passwordHash: String,            // ẩn khỏi response qua toPublicJSON()
  phone:        String,
  active:       Boolean (default: true),
  createdAt:    Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/customers/register` | ❌ | — | Đăng ký, trả về token |
| `POST` | `/customers/login` | ❌ | — | Đăng nhập, trả về token |
| `GET` | `/customers/me` | ✅ | customer | Xem thông tin bản thân |
| `PUT` | `/customers/me` | ✅ | customer | Cập nhật thông tin |
| `GET` | `/customers/all` | ✅ | ops_staff, ops_admin | Danh sách tất cả |
| `GET` | `/customers/:id` | ✅ | ops_staff, ops_admin | Xem theo ID |
| `PATCH` | `/customers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa tài khoản |
| `GET` | `/health` | ❌ | — | Health check |

#### Business rules
- Email phải duy nhất; đăng ký trùng email → 409 `EMAIL_ALREADY_EXISTS`
- Mật khẩu hash bằng `crypto.scrypt` với salt ngẫu nhiên, lưu dạng `salt:hash` hex
- `active: false` không bị block đăng nhập trong code hiện tại (chỉ flag, chưa enforce)

---

### 5.3 Driver Service

**Port**: 4002 | **FR**: FR-02, FR-11 | **DB**: `driver_db`

#### Model dữ liệu

```javascript
Driver {
  _id:            String (UUID),
  fullName:       String (required),
  email:          String (unique),
  passwordHash:   String,
  phone:          String,
  status:         Enum ["offline", "available", "busy"],  // default: "offline"
  vehicle: {
    plate:  String,
    model:  String,
    type:   String  // "4-seat", "7-seat", "bike", ...
  },
  createdByStaff: Boolean (default: false),
  active:         Boolean (default: true),
  createdAt:      Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/drivers/register` | ❌ | — | Tự đăng ký (createdByStaff=false) |
| `POST` | `/drivers/login` | ❌ | — | Đăng nhập |
| `POST` | `/drivers` | ✅ | ops_staff, ops_admin | Tạo tài xế (createdByStaff=true) |
| `GET` | `/drivers` | ❌ | — | Danh sách (filter `?status=available`) — dùng nội bộ bởi dispatch |
| `GET` | `/drivers/:id` | ❌ | — | Chi tiết theo ID — dùng nội bộ |
| `GET` | `/drivers/me` | ✅ | driver | Xem thông tin bản thân |
| `PUT` | `/drivers/me/vehicle` | ✅ | driver | Cập nhật xe |
| `PATCH` | `/drivers/me/status` | ✅ | driver | Đổi trạng thái (offline/available/busy) |
| `GET` | `/drivers/all` | ✅ | ops_staff, ops_admin | Danh sách cho admin |
| `PATCH` | `/drivers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa |
| `GET` | `/health` | ❌ | — | Health check |

---

### 5.4 Trip Service

**Port**: 4003 | **FR**: FR-03, FR-04, FR-05, FR-13 | **DB**: `trip_db`

Đây là **core domain service** — quản lý vòng đời toàn bộ chuyến đi.

#### State Machine

```
                    ┌─────────────┐
             ┌─────►│  requested  │
             │      └──────┬──────┘
             │             │ (auto) publish TripRequested
             │             ▼
             │      ┌──────────────────┐
             │      │  finding_driver  │◄──── DriverAssigned / NoDriverFound
             │      └──────┬─────┬─────┘       (webhook từ dispatch)
             │             │     │
             │    [assign] │     │ [no driver]
             │             ▼     ▼
             │   ┌─────────────┐  ┌────────────────┐
             │   │driver_assign│  │no_driver_found │ (terminal)
             │   └──────┬──────┘  └────────────────┘
             │          │ driver PATCH /status
             │          ▼
             │      ┌─────────┐
             │      │ arrived │
             │      └────┬────┘
             │           ▼
             │     ┌──────────┐
             │     │ picked_up│
             │     └────┬─────┘
             │          ▼
             │    ┌────────────┐
             │    │ in_progress│
             │    └─────┬──────┘
             │          │ submit distanceKm + durationMin
             │          ▼
             │     ┌───────────┐  → publish TripCompleted + FareCalculated
             │     │ completed │  (terminal)
             │     └───────────┘
             │
    ┌─────────────┐
    │  cancelled  │  (terminal — từ: requested/finding_driver/driver_assigned)
    └─────────────┘
```

**Transition rules**:
- Tài xế chỉ được chuyển theo `DRIVER_TRANSITIONS` map (forward only)
- Khách hàng chỉ được hủy từ các trạng thái `CANCELLABLE_STATUSES`

#### Model dữ liệu

```javascript
Trip {
  _id:              String (UUID),  // alias: "tripId"
  customerId:       String,
  driverId:         String (nullable),
  pickupLocation:   { lat: Number, lng: Number, address: String },
  dropoffLocation:  { lat: Number, lng: Number, address: String },
  vehicleType:      String,
  status:           Enum (xem state machine trên),
  fareAmount:       Number (nullable — chỉ có khi completed),
  distanceKm:       Number (nullable),
  durationMin:      Number (nullable),
  requestedAt:      Date,
  completedAt:      Date (nullable),
  cancelledAt:      Date (nullable),
  cancelledBy:      String (nullable)
}

Rating {
  _id:        String (= tripId),   // 1 rating / 1 trip
  tripId:     String,
  customerId: String,
  driverId:   String,
  score:      Number (1–5, integer),
  comment:    String (optional),
  createdAt:  Date
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/trips` | ✅ | customer | Đặt xe mới |
| `GET` | `/trips` | ✅ | ops_staff, ops_admin | Tất cả chuyến (admin) |
| `GET` | `/trips/:id` | ✅ | customer, driver, ops | Xem chuyến |
| `GET` | `/trips/:id/internal` | ❌ | — | Service-to-service |
| `PATCH` | `/trips/:id/status` | ✅ | driver (hoặc customer hủy) | Cập nhật trạng thái |
| `POST` | `/trips/:id/rating` | ✅ | customer | Đánh giá (sau completed) |
| `GET` | `/trips/:id/rating` | ✅ | any | Xem đánh giá |
| `GET` | `/customers/me/trips` | ✅ | customer | Lịch sử chuyến của khách |
| `GET` | `/drivers/me/trips` | ✅ | driver | Lịch sử chuyến của tài xế |
| `GET` | `/drivers/:id/ratings` | ✅ | ops | Tất cả rating của tài xế |
| `POST` | `/webhooks/driver-assigned` | ❌ | — | Webhook từ dispatch |
| `POST` | `/webhooks/no-driver-found` | ❌ | — | Webhook từ dispatch |
| `GET` | `/health` | ❌ | — | Health check |

#### Tính toán cước phí

Khi hoàn thành chuyến (`status = completed`):
1. Gọi `POST /pricing/calculate` với `{ distanceKm, durationMin, vehicleType }`
2. Nếu tài xế không gửi `distanceKm`, dùng công thức Haversine giữa pickup/dropoff làm fallback
3. Lưu `fareAmount` vào trip, publish `FareCalculated`

---

### 5.5 Dispatch Service

**Port**: 4004 | **FR**: FR-06 → FR-09, FR-12 | **DB**: `dispatch_db`

**Matching engine** — tìm và giao chuyến cho tài xế phù hợp.

#### Model dữ liệu

```javascript
DispatchRecord {
  _id:          String (= tripId),
  tripId:       String,
  candidateIds: [String],   // tất cả tài xế đã xét
  declinedIds:  [String],   // đã từ chối
  assignedDriverId: String (nullable),
  status: Enum ["searching", "assigned", "no_driver_found"],
  createdAt: Date
}
```

#### Thuật toán matching

```
[TripRequested] nhận được
    │
    ▼
1. GET driver-service/drivers?status=available
   → danh sách tài xế đang sẵn sàng
    │
    ▼
2. GET location-service/locations/nearby-drivers
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

**Cấu hình qua env**:

| Biến | Mặc định | Dev (compose) | Prod (compose) |
|---|---|---|---|
| `DISPATCH_SEARCH_RADIUS_KM` | 10 | 10 | 10 |
| `DISPATCH_OFFER_TIMEOUT_SEC` | 20 | 3 | 20 |

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/dispatch/drivers/me/pending` | ✅ | driver | Xem đề xuất đang chờ |
| `POST` | `/dispatch/:tripId/accept` | ✅ | driver | Chấp nhận chuyến |
| `POST` | `/dispatch/:tripId/decline` | ✅ | driver | Từ chối chuyến |
| `GET` | `/dispatch/:tripId` | ✅ | ops | Xem trạng thái dispatch |
| `GET` | `/health` | ❌ | — | Health check |

> **Hạn chế**: `pendingTimers` là `Map` in-memory. Restart service sẽ mất toàn bộ timer đang chờ.

---

### 5.6 Location Service

**Port**: 4005 | **FR**: FR-10 | **DB**: `location_db`

Lưu **vị trí hiện tại** của mỗi tài xế (1 bản ghi/tài xế, upsert — không giữ lịch sử).

#### Model dữ liệu

```javascript
LocationRecord {
  _id:       String (= driverId),  // 1 record duy nhất / tài xế
  driverId:  String,
  lat:       Number,
  lng:       Number,
  updatedAt: Date
}
```

#### Công thức Haversine (tính khoảng cách giữa 2 tọa độ)

```javascript
distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;  // bán kính Trái đất (km)
  // ... công thức haversine chuẩn
}
```

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/locations` | ✅ | driver | Cập nhật vị trí bản thân |
| `GET` | `/locations/drivers/:id` | ❌ | — | Vị trí theo driverId (nội bộ) |
| `GET` | `/locations/nearby-drivers` | ❌ | — | Tài xế gần điểm (nội bộ) |

**Query params** của `/nearby-drivers`:

| Param | Bắt buộc | Mô tả |
|---|---|---|
| `lat` | ✅ | Vĩ độ điểm trung tâm |
| `lng` | ✅ | Kinh độ điểm trung tâm |
| `radiusKm` | ✅ | Bán kính tìm kiếm (km) |
| `driverIds` | ✅ | JSON array ID tài xế để lọc |

---

### 5.7 Pricing Service

**Port**: 4006 | **FR**: FR-14 | **DB**: `pricing_db`

**Stateless** — tính cước phí dựa trên rules cấu hình.

#### Công thức tính phí

```
fareAmount = round(baseFare + distanceKm × perKmRate + durationMin × perMinuteRate)
```

#### Model dữ liệu

```javascript
PricingRule {
  _id:            String (UUID),
  vehicleType:    String (unique),  // "4-seat", "7-seat", "bike"
  baseFare:       Number,           // đồng (VND)
  perKmRate:      Number,
  perMinuteRate:  Number,
  active:         Boolean
}
```

**Khởi động**: nếu collection trống, seed từ `services/pricing-service/data/pricingRules.json`.

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/pricing/calculate` | ❌ | — | Tính phí (nội bộ — dùng bởi trip-service) |
| `GET` | `/pricing/rules` | ✅ | ops_admin | Danh sách rule |
| `POST` | `/pricing/rules` | ✅ | ops_admin | Tạo rule |
| `PUT` | `/pricing/rules/:id` | ✅ | ops_admin | Cập nhật rule |
| `GET` | `/health` | ❌ | — | Health check |

**Request** `POST /pricing/calculate`:
```json
{ "vehicleType": "4-seat", "distanceKm": 5.2, "durationMin": 15 }
```

---

### 5.8 Payment Service

**Port**: 4007 | **FR**: FR-15, FR-16 | **DB**: `payment_db`

#### Model dữ liệu

```javascript
Payment {
  _id:       String (UUID),
  tripId:    String (unique),     // 1 payment / 1 trip
  customerId: String,
  amount:    Number,
  method:    Enum ["cash", "card", "e-wallet"],
  status:    Enum ["pending", "completed", "failed"],
  retryCount: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}

FareCache {
  _id:        String (= tripId),  // FareCalculated event populate đây
  fareAmount: Number,
  cachedAt:   Date
}
```

#### Luồng xử lý thanh toán

```
POST /payments (customer)
    │
    ▼
1. Lấy fareAmount:
   ├─ Từ FareCache (FareCalculated event đã populate)
   └─ Fallback: GET trip-service/:tripId/internal
    │
    ▼
2. mockGateway.charge(method, amount):
   ├─ "cash"     → thành công 100%
   ├─ "card"     → thành công 85% (Math.random())
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

> Retry chỉ được thực hiện khi `status = "failed"`. `PaymentCompleted` không được retry.

---

### 5.9 Notification Service

**Port**: 4008 | **FR**: FR-17, FR-18, FR-19 | **DB**: `notification_db`

**Pure event consumer** — không có logic chủ động. Lắng nghe 6 sự kiện, tạo thông báo, log ra console (không push/SMS thật).

#### Model dữ liệu

```javascript
Notification {
  _id:        String (UUID),
  userId:     String,
  userType:   Enum ["customer", "driver"],
  tripId:     String (nullable),
  event:      String,        // tên event gốc
  message:    String,        // nội dung thông báo
  channel:    String,        // "push" | "sms"
  read:       Boolean (default: false),
  createdAt:  Date
}

Channel {
  _id:  String (UUID),
  name: String,   // "push", "sms"
  active: Boolean
}
```

#### Sự kiện xử lý

| Event nhận | Tạo thông báo cho |
|---|---|
| `DriverAssigned` | customer (tài xế đang đến), driver (bạn có chuyến mới) |
| `NoDriverFound` | customer (không tìm được tài xế) |
| `TripStatusChanged` | customer + driver (trạng thái đã thay đổi) |
| `TripCompleted` | customer (chuyến hoàn thành, số tiền) |
| `PaymentCompleted` | customer (thanh toán thành công) |
| `PaymentFailed` | customer (thanh toán thất bại, hãy thử lại) |

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/notifications/me` | ✅ | any | Thông báo của bản thân |
| `POST` | `/notifications/channels` | ✅ | ops_admin | Tạo channel |
| `GET` | `/health` | ❌ | — | Health check |

---

### 5.10 Admin Service

**Port**: 4009 | **FR**: FR-20, FR-21, FR-22, FR-23 | **DB**: `admin_db`

**Pure aggregator** — không có domain data riêng (trừ `ResolvedIssue`). Tổng hợp dữ liệu từ tất cả services khác qua HTTP, forward `Authorization` header của caller.

#### API Endpoints

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/admin/customers` | ✅ | ops_staff, ops_admin | Danh sách khách hàng |
| `PATCH` | `/admin/customers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa khách hàng |
| `GET` | `/admin/drivers` | ✅ | ops_staff, ops_admin | Danh sách tài xế |
| `PATCH` | `/admin/drivers/:id/disable` | ✅ | ops_admin | Vô hiệu hóa tài xế |
| `GET` | `/admin/trips` | ✅ | ops_staff, ops_admin | Danh sách chuyến |
| `POST` | `/admin/trips/:id/resolve` | ✅ | ops_staff, ops_admin | Ghi nhận giải quyết vấn đề |
| `GET` | `/admin/reports/trips` | ✅ | ops_admin | Báo cáo số chuyến theo khoảng thời gian |
| `GET` | `/admin/reports/revenue` | ✅ | ops_admin | Báo cáo doanh thu |
| `GET` | `/admin/reports/completion-rate` | ✅ | ops_admin | Tỷ lệ hoàn thành chuyến |
| `GET` | `/admin/reports/cancellation-rate` | ✅ | ops_admin | Tỷ lệ hủy chuyến |
| `GET` | `/admin/reports/driver-performance` | ✅ | ops_admin | Hiệu suất tài xế |
| `GET` | `/health` | ❌ | — | Health check |

**Query params báo cáo**:

| Param | Mô tả | Ví dụ |
|---|---|---|
| `from` | Từ ngày (ISO 8601) | `2025-01-01` |
| `to` | Đến ngày (ISO 8601) | `2025-12-31` |

> **Vấn đề hiệu năng**: các endpoint báo cáo fetch **toàn bộ** trip collection rồi filter in-memory. `driver-performance` gọi thêm 1 HTTP request/tài xế (N+1 pattern). Chấp nhận được cho demo, không scale được.

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

### 6.2 Response format chuẩn

```javascript
// Thành công — 1 item
{ "data": { ...item } }

// Thành công — list
{ "data": [...items], "meta": { "total": N } }

// Lỗi
{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

### 6.3 Mã lỗi phổ biến

| Code | Status | Mô tả |
|---|---|---|
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `UNAUTHORIZED` | 401 | Thiếu hoặc sai token |
| `FORBIDDEN` | 403 | Không có quyền |
| `EMAIL_ALREADY_EXISTS` | 409 | Email trùng |
| `INVALID_STATUS_TRANSITION` | 400 | Chuyển trạng thái không hợp lệ |
| `TRIP_NOT_COMPLETED` | 400 | Thao tác yêu cầu trip đã hoàn thành |
| `ALREADY_RATED` | 409 | Trip đã được đánh giá |
| `PAYMENT_ALREADY_EXISTS` | 409 | Đã có payment cho trip này |
| `PAYMENT_NOT_FAILED` | 400 | Retry khi payment không ở trạng thái failed |

### 6.4 AppError

```javascript
throw new AppError(statusCode, "ERROR_CODE", "message cho user");
// errorMiddleware bắt → { "error": { "code", "message" } }
```

### 6.5 UUID làm Primary Key

Mọi entity dùng `uuid` (v4) làm `_id` (kiểu String trong Mongoose). `toJSON`/`toObject` transform đổi tên:

| Entity | `_id` trong DB | Alias trong response |
|---|---|---|
| Customer | `_id` | `id` |
| Driver | `_id` | `id` |
| Trip | `_id` | `tripId` |
| Payment | `_id` | `id` |
| Notification | `_id` | `id` |

---

## 7. Cơ sở dữ liệu

### 7.1 Kiến trúc "Database per Service"

```
MongoDB container (port 27017)
├── customer_db
├── driver_db
├── trip_db
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
# Mỗi service có MONGO_URI riêng trong .env
MONGO_URI=mongodb://localhost:27017/customer_db
```

Trong Docker Compose, `localhost` được thay bằng service name `mongodb`:
```yaml
MONGO_URI: mongodb://mongodb:27017/customer_db
```

### 7.3 Seed data

| Service | Có seed data | Nguồn |
|---|---|---|
| pricing-service | ✅ | `data/pricingRules.json` → Mongo (1 lần, nếu collection trống) |
| notification-service | ✅ | Hard-code trong `server.js` (channels: push, sms) |
| Các service còn lại | ❌ | Không seed |

---

## 8. Docker & Deployment

### 8.1 File cấu hình

| File | Mục đích |
|---|---|
| `docker-compose.yml` | Development — build từ source code |
| `docker-compose-prod.yaml` | Production — pull images từ Docker Hub |

### 8.2 Thứ tự khởi động (depends_on)

```
mongodb
  └─► event-bus-service
        ├─► customer-service
        ├─► driver-service
        ├─► location-service
        ├─► pricing-service
        │     └─► trip-service ──────────────────────────┐
        │           ├─► payment-service                  │
        │           ├─► notification-service             │
        │           └─► admin-service                    │
        └─► dispatch-service ◄───────────────────────────┘
              (phụ thuộc: event-bus + driver + location + trip)
                    └─► api-gateway (chờ TẤT CẢ service healthy)
```

### 8.3 Healthcheck

Mỗi container khai báo healthcheck:
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:<port>/health"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 15s
```

`docker compose up --wait` sẽ chờ đến khi tất cả healthy trước khi trả về.

### 8.4 Images Docker Hub

```
thinhpvt/cab-event-bus:latest
thinhpvt/cab-customer:latest
thinhpvt/cab-driver:latest
thinhpvt/cab-trip:latest
thinhpvt/cab-dispatch:latest
thinhpvt/cab-location:latest
thinhpvt/cab-pricing:latest
thinhpvt/cab-payment:latest
thinhpvt/cab-notification:latest
thinhpvt/cab-admin:latest
thinhpvt/cab-gateway:latest
```

### 8.5 CI/CD (.github/workflows/ci.yml)

```
Push / PR to main
    │
    ├─► Build & Test job:
    │     docker compose up --build -d --wait
    │     cd testcase && npm test
    │     (dump logs on failure)
    │     docker compose down
    │
    └─► Build & Push job (chỉ push to main):
          docker build + push tất cả 11 images
          Tag: <commit-sha> và latest
```

---

## 9. Luồng nghiệp vụ chính

### 9.1 Đặt xe → Hoàn thành (Happy path)

```
Khách hàng                Gateway    Trip-svc   Event-bus  Dispatch   Driver-svc  Location-svc  Pricing-svc  Payment-svc
    │                        │           │           │          │           │            │              │            │
    │─POST /trips ──────────►│           │           │          │           │            │              │            │
    │                        │──────────►│           │          │           │            │              │            │
    │                        │     Create trip       │          │           │            │              │            │
    │                        │     status=requested  │          │           │            │              │            │
    │                        │           │─publish──►│          │           │            │              │            │
    │                        │           │ TripReq.  │──────────►           │            │              │            │
    │◄200 {tripId}───────────│◄──────────│           │   GET /drivers?status=available  │              │            │
    │                        │           │           │          │──────────────────────►│              │            │
    │                        │           │           │          │◄──[driver list]────────│              │            │
    │                        │           │           │          │ GET /nearby-drivers?...│──────────────►│            │
    │                        │           │           │          │◄──[sorted by dist]─────│──────────────│            │
    │                        │           │           │          │                        │              │            │
    │                        │           │           │ Offer driver (setTimeout 3s/20s) │              │            │
    │                        │           │           │          │                        │              │            │
Tài xế─GET /dispatch/me/pending─────────────────────────────────►                       │              │            │
    │◄─{tripId, pickup, ...}──────────────────────────────────────                       │              │            │
Tài xế─POST /dispatch/:id/accept────────────────────────────────►                       │              │            │
    │                        │           │           │◄publish──│                        │              │            │
    │                        │           │◄──────────│ DriverAssigned                   │              │            │
    │                        │      Update trip      │          │                        │              │            │
    │                        │      status=driver_assigned                               │              │            │
    │                        │           │           │          │                        │              │            │
    │                        │           │ [Tài xế cập nhật trạng thái tuần tự]         │              │            │
    │                        │           │   arrived → picked_up → in_progress          │              │            │
    │                        │           │           │          │                        │              │            │
Tài xế─PATCH /trips/:id/status {completed, distanceKm, durationMin}                    │              │            │
    │                        │──────────►│           │          │            POST /pricing/calculate───►│            │
    │                        │           │◄──────────────────────────────────────────────── fareAmount──│            │
    │                        │     status=completed  │          │                        │              │            │
    │                        │     fareAmount saved  │          │                        │              │            │
    │                        │           │─publish──►│──────────────────────────────────────────────────────────────►│
    │                        │           │ TripComp. │          │                        │              │ FareCached │
    │                        │           │─publish──►│──────────────────────────────────────────────────────────────►│
    │                        │           │ FareCal.  │          │                        │              │            │
    │                        │           │           │          │                        │              │            │
Khách─POST /payments {tripId, method: "cash"}────────────────────────────────────────────────────────────────────────►│
    │                        │           │           │          │                        │              │     Process│
    │◄200 {paymentId, status: "completed"}────────────────────────────────────────────────────────────────────────────│
```

### 9.2 Không tìm được tài xế

```
Dispatch: hết danh sách candidate (tất cả timeout/decline)
    │
    └─► publish NoDriverFound
            │
            ├─► trip-service: cập nhật status = "no_driver_found"
            └─► notification-service: gửi thông báo cho khách
```

---

## 10. Testing

### 10.1 Cấu trúc test suite

```
testcase/
├── .env                    # BASE_URL, JWT_SECRET
├── package.json            # jest --runInBand (chạy tuần tự)
├── tests/
│   ├── helpers.js          # req(), randEmail(), signStaffToken(), ...
│   ├── admin/              # TC-ADMIN-01..XX
│   ├── customer/           # TC-CUST-01..21
│   ├── dispatch/           # TC-DISP-01..XX
│   ├── driver/             # TC-DRV-01..XX
│   ├── gateway/            # TC-GATE-01..03 ← MỚI (chưa commit)
│   ├── location/           # TC-LOC-01..21
│   ├── notification/       # TC-NOTIF-01..XX
│   ├── payment/            # TC-PAY-01..XX
│   ├── pricing/            # TC-PRIC-01..XX
│   └── trip/               # TC-TRIP-01..22
│       └── _setup.js       # fixture builder (không phải test)
```

**Jest config**: `--runInBand` (không parallel) để tránh race condition trên shared MongoDB.

### 10.2 Helpers quan trọng

```javascript
// helpers.js
req(method, path, body?, token?)    // fetch wrapper → { status, json }
randEmail()                         // tạo email ngẫu nhiên tránh duplicate
signStaffToken(role, id)            // tạo JWT ops trực tiếp (bypass login)
signCustomerToken(id)               // tạo JWT customer trực tiếp
signDriverToken(id)                 // tạo JWT driver trực tiếp

// trip/_setup.js
advanceTripTo(tripId, targetStatus, driverToken)   // fast-forward qua state machine
registerAvailableDriver()                          // tạo + set available driver
pollForOffer(driverToken, tripId, maxRetries)       // chờ dispatch giao chuyến
```

### 10.3 Test files mới (chưa commit — cần implement)

| Test file | Tính năng cần implement |
|---|---|
| `gateway/TC-GATE-01.test.js` | `GET /ready` và `GET /health/services` trên API Gateway |
| `gateway/TC-GATE-02.test.js` | Aggregated health check |
| `gateway/TC-GATE-03.test.js` | Route không tồn tại → 404 |
| `location/TC-LOC-21.test.js` | Pagination `?limit&page` cho `/nearby-drivers` |
| `trip/TC-TRIP-13..22.test.js` | Mở rộng coverage trip (ownership, pagination lịch sử chuyến) |
| `customer/TC-CUST-21.test.js` | Kiểm tra mật khẩu không lưu plaintext (kết nối trực tiếp MongoDB) |

### 10.4 Chạy test

```bash
# Đảm bảo toàn bộ stack đang chạy (docker compose up -d hoặc manual)
cd testcase
npm test                           # chạy tất cả
npx jest tests/trip/               # chỉ trip tests
npx jest tests/trip/TC-TRIP-01     # 1 test cụ thể
```

---

## 11. Cài đặt & Chạy

### 11.1 Cài đặt local (Node.js)

```bash
# Yêu cầu: Node.js >= 18, MongoDB running
git clone <repo>
cd 23658751_PhamVoTruongThinh_CABSYSTEM
cp .env.example .env
# Sửa JWT_SECRET và MONGO_URI trong .env nếu cần
npm install                # npm workspaces — cài cho tất cả service
```

### 11.2 Chạy với Docker (khuyến nghị)

```bash
# Development (build từ source)
docker compose up --build -d --wait
# Hoặc production (pull từ Docker Hub)
docker compose -f docker-compose-prod.yaml up -d --wait

# Kiểm tra
curl http://localhost:3000/health
```

### 11.3 Chạy thủ công từng service

```bash
# Thứ tự bắt buộc: event-bus trước
npm run start:event-bus
npm run start:customer
npm run start:driver
npm run start:trip
npm run start:dispatch
npm run start:location
npm run start:pricing
npm run start:payment
npm run start:notification
npm run start:admin
npm run start:gateway
```

### 11.4 Biến môi trường

| Biến | Mô tả | Mặc định |
|---|---|---|
| `JWT_SECRET` | Secret ký JWT (dùng chung mọi service) | `dev-secret-change-me` |
| `PORT` | Port của service | per-service (4001–4009) |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/<db>` |
| `EVENT_BUS_URL` | URL của event-bus-service | `http://localhost:4000` |
| `DISPATCH_SEARCH_RADIUS_KM` | Bán kính tìm tài xế (km) | `10` |
| `DISPATCH_OFFER_TIMEOUT_SEC` | Thời gian tài xế quyết định (giây) | `20` |
| `*_SERVICE_URL` | URL của từng service | `http://localhost:<port>` |

---

## 12. Giới hạn đã biết & Cải tiến tương lai

### 12.1 Giới hạn trong bản demo

| Vấn đề | Mô tả | Giải pháp đề xuất |
|---|---|---|
| **Không có Staff/Ops Service** | Token ops tạo bằng script CLI, không có login/logout, không revoke được | Xây dựng ops-account-service tương tự customer-service |
| **Event Bus in-memory** | Mất tất cả subscriber khi restart; không có retry khi delivery fail | Thay bằng RabbitMQ/Kafka thật |
| **Dispatch timers in-memory** | Mất timer khi restart dispatch-service | Dùng Redis TTL hoặc job queue (Bull/BullMQ) |
| **Mock payment gateway** | 15% thất bại ngẫu nhiên; không có webhook signature verification | Tích hợp cổng thanh toán thật (VNPay, Momo) |
| **Notification chỉ log** | Không push/SMS thật | Tích hợp Firebase FCM, Twilio SMS |
| **Admin báo cáo N+1** | Fetch toàn bộ dữ liệu rồi filter in-memory | Thêm query params để filter phía MongoDB; dùng aggregation pipeline |
| **Không có real-time** | Client phải polling | Thêm WebSocket (Socket.io) hoặc SSE |
| **Không có rate limiting** | Dễ bị abuse | Thêm express-rate-limit ở Gateway |
| **Haversine duplicate** | Công thức copy ở 2 service | Tạo shared utility package hoặc npm package nội bộ |

### 12.2 Vấn đề bảo mật đã biết (chấp nhận cho demo)

| Vấn đề | Ghi chú |
|---|---|
| Internal endpoints không auth | An toàn trong Docker network; cần mTLS/API key nếu expose ra ngoài |
| JWT_SECRET dùng chung | Một secret lộ → toàn bộ hệ thống bị compromise |
| Payment webhook không verify signature | Demo simplification |
| `active: false` không block đăng nhập | Customer bị disable vẫn đăng nhập được — cần fix |

### 12.3 Mapping Functional Requirements

| FR | Tên | Service | Status |
|---|---|---|---|
| FR-01 | Quản lý tài khoản khách hàng | customer-service | ✅ |
| FR-02 | Quản lý tài khoản tài xế | driver-service | ✅ |
| FR-03 | Đặt xe | trip-service | ✅ |
| FR-04 | Theo dõi trạng thái chuyến | trip-service | ✅ |
| FR-05 | Hủy chuyến | trip-service | ✅ |
| FR-06 | Tìm tài xế | dispatch-service | ✅ |
| FR-07 | Giao chuyến cho tài xế | dispatch-service | ✅ |
| FR-08 | Tài xế nhận/từ chối chuyến | dispatch-service | ✅ |
| FR-09 | Tự động thử tài xế tiếp theo | dispatch-service | ✅ |
| FR-10 | Cập nhật vị trí tài xế | location-service | ✅ |
| FR-11 | Quản lý phương tiện tài xế | driver-service | ✅ |
| FR-12 | Ước tính ETA | dispatch-service | ✅ (heuristic) |
| FR-13 | Đánh giá chuyến | trip-service | ✅ |
| FR-14 | Tính cước phí | pricing-service | ✅ |
| FR-15 | Xử lý thanh toán | payment-service | ✅ (mock) |
| FR-16 | Retry thanh toán | payment-service | ✅ |
| FR-17 | Thông báo DriverAssigned/NoDriverFound | notification-service | ✅ (log) |
| FR-18 | Thông báo thay đổi trạng thái | notification-service | ✅ (log) |
| FR-19 | Thông báo thanh toán | notification-service | ✅ (log) |
| FR-20 | Quản lý tài khoản (admin) | admin-service | ✅ |
| FR-21 | Xem danh sách chuyến (admin) | admin-service | ✅ |
| FR-22 | Giải quyết vấn đề chuyến đi | admin-service | ✅ |
| FR-23 | Báo cáo vận hành | admin-service | ✅ (in-memory agg) |

---

*Tài liệu này được tổng hợp từ việc đọc toàn bộ source code thực tế của hệ thống.*  
*Cập nhật lần cuối: 2026-10-01*
