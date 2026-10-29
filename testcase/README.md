# Test Case — CAB System

Test case tự động hóa cho **83 test suite / 86 test scenario**, phủ đủ 11 service. Mỗi test case là 1 file riêng dưới `tests/<service>/`, đặt tên đúng theo Test ID trong Excel để đối chiếu ngược.

**Đã chạy thật, xác nhận 83/83 PASS trước khi bàn giao** (chạy toàn bộ cùng lúc trên 1 cụm, không phải chạy rời từng phần rồi gộp kết quả).

## Cấu trúc

```
testcase/
├── package.json / package-lock.json
├── .env.example
├── README.md
└── tests/
    ├── helpers.js                # gọi API dùng chung + ký JWT customer/driver/ops_staff/ops_admin
    ├── customer/                 # TC-CUST-01..10, TC-CUST-21   (11 test)
    ├── driver/                   # TC-DRV-01..10                (10 test)
    ├── trip/                     # TC-TRIP-01..22               (22 test) + _setup.js
    ├── dispatch/                 # TC-DISP-01..07               (7 test)  + _setup.js
    ├── location/                 # TC-LOC-01..05, TC-LOC-21     (6 test)
    ├── pricing/                  # TC-PRICE-01..04              (4 test)
    ├── payment/                  # TC-PAY-01..08                (8 test)  + _setup.js
    ├── notification/             # TC-NOTI-01..05               (5 test)  + _setup.js
    ├── admin/                    # TC-ADM-01..07                (7 test)  + _setup.js
    └── gateway/                  # TC-GATE-01..03               (3 test)
```

File `_setup.js` trong 1 số thư mục là helper riêng của service đó (không phải test, Jest tự bỏ qua vì không khớp đuôi `.test.js`) — dùng để dựng sẵn dữ liệu cần thiết (VD: 1 chuyến đã gán tài xế) mà không cần chạy cả luồng thật từ đầu.

## Chạy TOÀN BỘ test cùng lúc (khuyến nghị)

Cần bật **cả cụm** (MongoDB + RabbitMQ + 11 service + gateway). Khuyến nghị dùng Docker:

```bash
docker compose up --build -d --wait
```

Hoặc chạy thủ công (xem SYSTEM-DOCUMENTATION.md phần khởi động stack).

Rồi ở thư mục `testcase`:

```bash
npm install
copy .env.example .env      # Windows — hoặc "cp" trên macOS/Linux
npm test
```

Kết quả mong đợi: `Test Suites: 83 passed, 83 total | Tests: 86 passed, 86 total`.

⚠️ **Riêng test TC-DISP-03** (tài xế không phản hồi quá thời gian quy định) cần biến môi trường `DISPATCH_OFFER_TIMEOUT_SEC` nhỏ để không phải chờ lâu — mặc định của `cab-system` là 20 giây. Set trước khi khởi động `dispatch-service`:

```bash
set DISPATCH_OFFER_TIMEOUT_SEC=3      # Windows cmd
$env:DISPATCH_OFFER_TIMEOUT_SEC=3     # PowerShell
```

Nếu để mặc định 20s, test TC-DISP-03 vẫn đúng nhưng sẽ mất hơn 20 giây — test tự thích ứng theo giá trị này, không bị fail vì timeout dài hơn.

## Chạy RIÊNG 1 service (khi chỉ cần kiểm tra 1 phần)

Bảng dưới liệt kê **service tối thiểu cần bật** cho từng nhóm test (luôn cần API Gateway + auth-service):

| Thư mục test     | Service cần bật (ngoài gateway + auth-service)                                                      |
|------------------|-----------------------------------------------------------------------------------------------------|
| `customer/`      | customer-service                                                                                    |
| `driver/`        | driver-service                                                                                      |
| `location/`      | location-service                                                                                    |
| `pricing/`       | pricing-service                                                                                     |
| `gateway/`       | Cả cụm                                                                                              |
| `trip/`          | booking-service, trip-service, pricing-service                                                      |
| `payment/`       | booking-service, trip-service, pricing-service, payment-service                                     |
| `notification/`  | booking-service, trip-service, pricing-service, notification-service                                |
| `admin/`         | customer-service, driver-service, booking-service, trip-service, pricing-service, payment-service, admin-service |
| `dispatch/`      | driver-service, location-service, booking-service, trip-service, dispatch-service + **RabbitMQ**   |

Luôn cần **API Gateway** chạy cùng (mọi test đều gọi qua `http://localhost:3000/api/v1`).

Chạy 1 thư mục:
```bash
npx jest tests/driver --runInBand
```

Chạy 1 file:
```bash
npx jest tests/driver/TC-DRV-01.test.js
```

## Vì sao nhiều test dùng JWT tự ký thay vì đăng ký tài khoản thật?

Hầu hết service (Trip, Location, Payment, Notification, Admin) chỉ **verify chữ ký JWT + role**, không xác minh id đó có thật trong Customer/Driver Service hay không. Điều này đúng với thiết kế microservices: mỗi service tự chịu trách nhiệm xác thực/phân quyền dựa trên token, không gọi ngược lại "service chủ" của id đó. Nhờ vậy phần lớn test có thể chạy **độc lập, không cần cả cụm**, giúp chạy nhanh và dễ debug.

Ngoại lệ: `dispatch/` cần tài xế **có thật** trong Driver Service (để `gRPC ListByStatus` trả về đúng), vì đây là service duy nhất mà hành vi cốt lõi (tìm & phân công) phụ thuộc trực tiếp vào dữ liệu thật từ service khác qua gRPC, không phải qua JWT. Dispatch cũng cần RabbitMQ để publish `DriverAssigned` / `NoDriverFound`.

## Vòng đời booking ↔ trip (quan trọng khi đọc test)

Sau khi tách `booking-service` và `trip-service` thành 2 service độc lập:

- **Booking** (booking-service) — phía khách hàng, statuses: `requested → finding_driver → driver_assigned | no_driver_found | cancelled`
- **Trip** (trip-service) — phía tài xế, statuses: `driver_assigned → arrived → picked_up → in_progress → completed`

Booking **không bao giờ đạt trạng thái `completed`**. Khi tài xế hoàn thành chuyến, chỉ Trip được cập nhật lên `completed`. Các test trong `trip/` vì vậy:
- PATCH trạng thái → `PATCH /trips/:id/status`
- Đánh giá → `POST /trips/:id/rating`
- Lịch sử tài xế → `GET /drivers/me/trips`

## Webhook bypass cho test (không cần RabbitMQ)

Các test ngoài `dispatch/` dùng 2 webhook nội bộ để bypass RabbitMQ:

```
POST /api/v1/bookings/events/driver-assigned   → booking-service cập nhật status = driver_assigned
POST /api/v1/trips/events/driver-assigned      → trip-service tạo bản ghi Trip
```

Cả hai phải được gọi để một chuyến "được gán tài xế" hợp lệ từ góc nhìn của hệ thống.

## Lưu ý về dữ liệu giữa các lần chạy

Mỗi service dùng **MongoDB** làm database — không tự reset giữa các lần chạy test. Chạy lại nhiều lần sẽ tích lũy dữ liệu.

Muốn test trên trạng thái sạch, drop toàn bộ volume và khởi động lại stack:

```bash
# Xóa sạch volume MongoDB rồi start lại (mất toàn bộ data)
docker compose down -v
docker compose up --build -d --wait
```

Hoặc dùng MongoDB shell để chỉ xóa collection cần thiết (giữ nguyên pricing_db):

```bash
docker exec -it cab-mongodb mongosh
```

```javascript
use auth_db;         db.revokedtokens.deleteMany({})
use customer_db;     db.customers.deleteMany({})
use driver_db;       db.drivers.deleteMany({})
use booking_db;      db.bookings.deleteMany({})
use trip_db;         db.trips.deleteMany({}); db.ratings.deleteMany({})
use dispatch_db;     db.dispatchrecords.deleteMany({})
use payment_db;      db.payments.deleteMany({}); db.farecaches.deleteMany({})
use notification_db; db.notifications.deleteMany({})
use admin_db;        db.resolvedissues.deleteMany({})
// Giữ nguyên: pricing_db (pricingRules), notification_db.channels
```
