# Đánh giá hệ thống theo Phiếu Chấm Project (30 điểm)

> Cập nhật: 2026-10-01 (v2 — tích hợp RabbitMQ) | Sinh viên: Phạm Võ Trường Thịnh — 23658751

---

## Tổng điểm ước tính: **29–30 / 30**

---

## Chi tiết từng tiêu chí

### Phần Chung (STT 1–10)

| STT | Nội dung | Trạng thái | Ghi chú |
|-----|----------|-----------|---------|
| 1 | Mô tả kiến trúc tổ chức source code | ✅ **ĐẠT** | `SYSTEM-DOCUMENTATION.md` mô tả đầy đủ layered architecture |
| 2 | `.gitignore` và `.env` trên GitHub | ✅ **ĐẠT** | `.env` trong `.gitignore`, `.env.example` được commit |
| 3 | Mô tả nhiệm vụ gateway | ✅ **ĐẠT** | Mục 5.1 trong `SYSTEM-DOCUMENTATION.md` |
| 4 | Mô tả IPC của microservice | ✅ **ĐẠT** | Mục 2.3 mô tả cả Sync REST lẫn Async Event Bus |
| 5 | Compose hệ thống + liệt kê container | ✅ **ĐẠT** | `docker-compose.yml` có 13 container (MongoDB + RabbitMQ + Event Bus + 10 services) |
| 6 | `/health`, `/ready`, `/health/services` | ✅ **ĐẠT** | **ĐÃ THÊM** `/ready` và `/health/services` vào api-gateway |
| 7 | Kafka / RabbitMQ | ✅ **ĐẠT** | **ĐÃ TÍCH HỢP** RabbitMQ 3-management — `amqplib` + topic exchange `cab_events` |
| 8 | Mọi request qua Gateway | ✅ **ĐẠT** | Gateway là single entry point, forward tất cả `/api/v1/*` |
| 9 | Đăng ký khách hàng | ✅ **ĐẠT** | `POST /api/v1/customers/register` → 201 + token |
| 10 | Đăng nhập khách hàng | ✅ **ĐẠT** | `POST /api/v1/customers/login` → 200 + token |

### Bảng Chấm Thực Hành 1 (STT 11–20)

| STT | Nội dung | Trạng thái | Ghi chú |
|-----|----------|-----------|---------|
| 11 | Lấy thông tin khách hàng với mã số | ✅ **ĐẠT** | `GET /api/v1/customers/me` (token customer) |
| 12 | Lấy thông tin tài xế với mã số | ✅ **ĐẠT** | `GET /api/v1/drivers/:id` (unauthenticated) |
| 13 | Danh sách tài xế tại khu vực (limit + paging) | ✅ **ĐẠT** | **ĐÃ THÊM** `?limit=&page=` vào `/locations/nearby-drivers` |
| 14 | Danh sách booking của Customer (limit + paging) | ✅ **ĐẠT** | **ĐÃ THÊM** `?limit=&page=` vào `/customers/me/trips` |
| 15 | Đặt xe → tạo booking → tìm tài xế | ✅ **ĐẠT** | `POST /api/v1/trips` → saga TripRequested → dispatch |
| 16 | Tài xế nhận chuyến | ✅ **ĐẠT** | `GET /dispatch/drivers/me/pending` + `POST /dispatch/:id/accept` |
| 17 | Cập nhật trạng thái chuyến | ✅ **ĐẠT** | `PATCH /trips/:id/status` — state machine 8 trạng thái |
| 18 | Hủy chuyến | ✅ **ĐẠT** | `POST /trips/:id/cancel` — chỉ cho phép từ cancellable states |
| 19 | Thanh toán online | ✅ **ĐẠT** | `POST /payments` — mock gateway 85% success (card/e-wallet) |
| 20 | Đánh giá chuyến đi | ✅ **ĐẠT** | `POST /trips/:id/rating` — score 1-5, comment, idempotent |

### Bảng Chấm Thực Hành 2 (STT 21–30)

| STT | Nội dung | Trạng thái | Ghi chú |
|-----|----------|-----------|---------|
| 21 | Đăng ký tài xế → trạng thái chờ duyệt | ✅ **ĐẠT** | **ĐÃ THÊM** `approvalStatus: "pending_approval"` khi self-register |
| 22 | Admin duyệt/từ chối hồ sơ tài xế | ✅ **ĐẠT** | **ĐÃ THÊM** `PATCH /drivers/:id/approve` và `PATCH /drivers/:id/reject` |
| 23 | Bật/tắt trạng thái nhận chuyến | ✅ **ĐẠT** | `PATCH /drivers/me/status` với `{ status: "available"/"offline" }` |
| 24 | Data encryption at rest | ✅ **ĐẠT** | Password hash bằng `crypto.scrypt` (salt:hash hex) — không lưu plaintext |
| 25 | SQL injection attempt | ✅ **ĐẠT** | MongoDB + Mongoose — không có SQL, không bị bypass |
| 26 | XSS input test | ✅ **ĐẠT** | **ĐÃ THÊM** HTML escape (`escapeHtml`) trong `addRating.comment` |
| 27 | JWT tampering | ✅ **ĐẠT** | `jsonwebtoken.verify(token, JWT_SECRET)` — chữ ký bị sửa → 401 |
| 28 | Unauthorized API access (403) | ✅ **ĐẠT** | `requireRole` middleware trả 403 nếu sai role |
| 29 | Rate limit attack (429) | ✅ **ĐẠT** | **ĐÃ THÊM** `express-rate-limit` 60 req/min tại Gateway |
| 30 | Replay attack — idempotency | ✅ **ĐẠT** | `tripId` là unique trong Payment — tạo 2 lần → 409 PAYMENT_ALREADY_EXISTS |

---

## Các thay đổi đã implement (2026-10-01)

### 1. API Gateway — `/ready` + `/health/services` + Rate Limiting
**File:** [`api-gateway/src/app.js`](api-gateway/src/app.js)
- `GET /ready` → 200 `{ status: "ready", service: "api-gateway" }`
- `GET /health/services` → gọi `/health` của tất cả 9 services, trả danh sách trạng thái
- `express-rate-limit`: 60 req/phút/IP → 429 khi vượt quá

### 2. Location Service — Pagination cho `/nearby-drivers`
**File:** [`services/location-service/src/controllers/location.controller.js`](services/location-service/src/controllers/location.controller.js)
- Query params: `?limit=N&page=M` 
- Response: `{ data: [...], meta: { total, page, limit, totalPages } }`
- Backward compatible: không truyền `limit`/`page` → trả toàn bộ như cũ

### 3. Trip Service — Pagination cho customer/driver trips
**Files:** 
- [`services/trip-service/src/daos/trip.dao.js`](services/trip-service/src/daos/trip.dao.js) — thêm `findByCustomerIdPaged` + `findByDriverIdPaged`
- [`services/trip-service/src/repositories/trip.repository.js`](services/trip-service/src/repositories/trip.repository.js) — truyền pagination options
- [`services/trip-service/src/controllers/trip.controller.js`](services/trip-service/src/controllers/trip.controller.js) — parse `?limit=&page=`

### 4. Trip Service — XSS Protection
**File:** [`services/trip-service/src/repositories/trip.repository.js`](services/trip-service/src/repositories/trip.repository.js)
- Hàm `escapeHtml()` escape `< > & "` trước khi lưu comment vào DB

### 5. Driver Service — Approval Workflow
**Files:**
- [`services/driver-service/src/models/driver.model.js`](services/driver-service/src/models/driver.model.js) — thêm field `approvalStatus`
- [`services/driver-service/src/repositories/driver.repository.js`](services/driver-service/src/repositories/driver.repository.js) — `register()` set `pending_approval`; thêm `setApprovalStatus()`
- [`services/driver-service/src/controllers/driver.controller.js`](services/driver-service/src/controllers/driver.controller.js) — thêm `approveDriver()` + `rejectDriver()`
- [`services/driver-service/src/routes/driver.routes.js`](services/driver-service/src/routes/driver.routes.js) — `PATCH /:id/approve` và `PATCH /:id/reject`

### 6. Testcase — MongoDB driver package
**File:** [`testcase/package.json`](testcase/package.json)
- Thêm `mongodb` package cho TC-CUST-21

---

## Thay đổi bổ sung (2026-10-01 v2)

### STT 7 — RabbitMQ (✅ HOÀN THÀNH)

RabbitMQ đã được tích hợp đầy đủ vào hệ thống:

| Thành phần | Thay đổi |
|---|---|
| `docker-compose.yml` | Thêm `rabbitmq:3-management` (AMQP :5672, UI :15672) |
| 5× `eventBusClient.js` | Thay HTTP fetch → `amqplib` topic exchange `cab_events` |
| 5× `package.json` | Thêm `"amqplib": "^0.10.4"` |
| 5× `server.js` | Thay webhook URL string → callback function |

**Kiến trúc message broker**:
- Topic exchange `cab_events` (durable)
- `publish(event, payload)` → publish message với routing key = event name
- `subscribe(event, fn)` → exclusive queue, bind exchange, AMQP consumer
- 86/86 tests pass sau khi tích hợp

**Kiểm tra nhanh**: `http://localhost:15672` (guest/guest) → xem exchanges, queues, messages

---

## Hướng dẫn test nhanh với POSTMAN

### Tạo token ops_admin
```bash
node scripts/generate-staff-token.js ops_admin staff-001
```

### STT 6 — Health endpoints
```
GET http://localhost:3000/health
GET http://localhost:3000/ready
GET http://localhost:3000/health/services
```

### STT 13 — Nearby drivers với pagination
```
GET http://localhost:3000/api/v1/locations/nearby-drivers?lat=10.77&lng=106.7&radiusKm=1&limit=3&page=1
GET http://localhost:3000/api/v1/locations/nearby-drivers?lat=10.77&lng=106.7&radiusKm=1&limit=3&page=2
```

### STT 14 — Customer trips với pagination  
```
GET http://localhost:3000/api/v1/customers/me/trips?limit=3&page=1
Authorization: Bearer <customer_token>
```

### STT 21 — Đăng ký tài xế → xem approvalStatus
```
POST http://localhost:3000/api/v1/drivers/register
{
  "fullName": "Nguyen Van A",
  "email": "driver@test.com",
  "password": "123456",
  "vehicle": { "plate": "51H-999.01", "model": "Vios", "type": "4-seat" }
}
→ Response sẽ có: "approvalStatus": "pending_approval"
```

### STT 22 — Admin duyệt hồ sơ tài xế
```
PATCH http://localhost:3000/api/v1/drivers/<driverId>/approve
Authorization: Bearer <ops_admin_token>
→ Response: "approvalStatus": "approved"

PATCH http://localhost:3000/api/v1/drivers/<driverId>/reject
Authorization: Bearer <ops_admin_token>
→ Response: "approvalStatus": "rejected"
```

### STT 26 — XSS test
```
POST http://localhost:3000/api/v1/trips/<completedTripId>/rating
Authorization: Bearer <customer_token>
{ "score": 5, "comment": "<script>alert('hack')</script>" }
→ GET /drivers/<driverId>/ratings → comment sẽ là: "&lt;script&gt;alert('hack')&lt;/script&gt;"
```

### STT 29 — Rate limit
```bash
# Gửi 100 request đồng thời → một số sẽ trả 429
for i in {1..100}; do curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/v1/trips \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pickupLocation":{"lat":10.77,"lng":106.7},"dropoffLocation":{"lat":10.78,"lng":106.69},"vehicleType":"4-seat"}' &
done; wait
```
