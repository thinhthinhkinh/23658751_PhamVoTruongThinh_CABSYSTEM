# CAB System — Microservices Demo

Cài đặt đầy đủ 10 service (+ Event Bus + API Gateway) cho toàn bộ 23 FR đã phân tích ở tài liệu BA, theo đúng kiến trúc microservices đã đề xuất, dùng pattern **Middleware → Routes → Controllers → Repositories → DAOs → Models → data.json** (giống project Todo API).

## 1. Cấu trúc thư mục

```
cab-system/
├── event-bus-service/     # Mô phỏng Kafka/RabbitMQ bằng HTTP pub-sub (port 4000)
├── api-gateway/            # Cổng vào duy nhất cho client (port 3000)
├── services/
│   ├── customer-service/   # FR-01                    (port 4001)
│   ├── driver-service/     # FR-02, FR-11              (port 4002)
│   ├── trip-service/       # FR-03,04,05,13 + rating   (port 4003)
│   ├── dispatch-service/   # FR-06..09, FR-12          (port 4004)
│   ├── location-service/   # FR-10                     (port 4005)
│   ├── pricing-service/    # FR-14                     (port 4006)
│   ├── payment-service/    # FR-15, FR-16              (port 4007)
│   ├── notification-service/ # FR-17..19               (port 4008)
│   └── admin-service/      # FR-20..23 (tổng hợp)      (port 4009)
├── scripts/
│   ├── generate-staff-token.js   # tạo JWT ops_staff/ops_admin để test (xem Mục 5)
│   ├── test-e2e.js               # test toàn bộ luồng chính
│   └── test-dispatch-edge-cases.js # test retry khi từ chối + không tìm được tài xế
├── cab-system-openapi.yaml # (nếu bạn để cùng chỗ) đặc tả OpenAPI cho toàn bộ API
├── .env.example
└── package.json            # npm workspaces — 1 lệnh install cho cả 10 service
```

## 2. Cài đặt

Yêu cầu Node.js ≥ 18 (dùng `fetch` built-in). Bạn đang có Node ở `C:\Apps\nodejs` — dùng bình thường.

```bash
cd cab-system
npm install          # 1 lệnh cài cho TẤT CẢ service nhờ npm workspaces
cp .env.example .env  # rồi sửa JWT_SECRET nếu muốn
```

## 3. Chạy toàn bộ hệ thống

Cách 1 — chạy tất cả cùng lúc (cần cài `concurrently`, đã có trong devDependencies):
```bash
npm run start:all
```

Cách 2 — chạy từng service ở terminal riêng (dễ debug hơn):
```bash
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

**Lưu ý thứ tự**: nên khởi động `event-bus-service` trước tiên (các service khác cần subscribe event lúc startup). Nếu event bus khởi động sau, service nào start trước sẽ log lỗi "subscribe thất bại" — không sao, bạn chỉ cần restart lại service đó.

Kiểm tra tất cả đã chạy:
```bash
curl http://localhost:3000/health   # Gateway
curl http://localhost:4000/health   # Event bus
# ... tương tự cho các port 4001-4009
```

## 4. Test thử luồng chính bằng curl (qua Gateway, port 3000)

```bash
# 1. Đăng ký khách hàng
curl -X POST http://localhost:3000/api/v1/customers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van A","email":"a@test.com","password":"123456"}'
# -> lưu lại "token" trong response, gọi là $CUSTOMER_TOKEN

# 2. Đăng ký tài xế
curl -X POST http://localhost:3000/api/v1/drivers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Tran Van B","email":"b@test.com","password":"123456","vehicle":{"plate":"51H-123.45","model":"Vios","type":"4-seat"}}'
# -> lưu lại token, gọi là $DRIVER_TOKEN

# 3. Tài xế sẵn sàng nhận chuyến
curl -X PATCH http://localhost:3000/api/v1/drivers/me/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"available"}'

# 4. Tài xế gửi vị trí (gần điểm đón)
curl -X POST http://localhost:3000/api/v1/locations \
  -H "Authorization: Bearer $DRIVER_TOKEN" -H "Content-Type: application/json" \
  -d '{"lat":10.7769,"lng":106.7009}'

# 5. Khách đặt xe
curl -X POST http://localhost:3000/api/v1/trips \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" -H "Content-Type: application/json" \
  -d '{"pickupLocation":{"lat":10.7769,"lng":106.7009},"dropoffLocation":{"lat":10.7829,"lng":106.6934},"vehicleType":"4-seat"}'
# -> lưu lại "id" của trip, gọi là $TRIP_ID

# 6. (chờ ~1-2 giây để Dispatch xử lý) Tài xế xem đề xuất & nhận chuyến
curl http://localhost:3000/api/v1/dispatch/drivers/me/pending -H "Authorization: Bearer $DRIVER_TOKEN"
curl -X POST http://localhost:3000/api/v1/dispatch/$TRIP_ID/accept -H "Authorization: Bearer $DRIVER_TOKEN"

# 7. Tài xế cập nhật trạng thái tuần tự
curl -X PATCH http://localhost:3000/api/v1/trips/$TRIP_ID/status -H "Authorization: Bearer $DRIVER_TOKEN" -H "Content-Type: application/json" -d '{"status":"arrived"}'
curl -X PATCH http://localhost:3000/api/v1/trips/$TRIP_ID/status -H "Authorization: Bearer $DRIVER_TOKEN" -H "Content-Type: application/json" -d '{"status":"picked_up"}'
curl -X PATCH http://localhost:3000/api/v1/trips/$TRIP_ID/status -H "Authorization: Bearer $DRIVER_TOKEN" -H "Content-Type: application/json" -d '{"status":"in_progress"}'
curl -X PATCH http://localhost:3000/api/v1/trips/$TRIP_ID/status -H "Authorization: Bearer $DRIVER_TOKEN" -H "Content-Type: application/json" -d '{"status":"completed","distanceKm":5,"durationMin":15}'

# 8. Khách thanh toán tiền mặt
curl -X POST http://localhost:3000/api/v1/payments -H "Authorization: Bearer $CUSTOMER_TOKEN" -H "Content-Type: application/json" -d "{\"tripId\":\"$TRIP_ID\",\"method\":\"cash\"}"

# 9. Khách đánh giá tài xế
curl -X POST http://localhost:3000/api/v1/trips/$TRIP_ID/rating -H "Authorization: Bearer $CUSTOMER_TOKEN" -H "Content-Type: application/json" -d '{"score":5,"comment":"Tốt"}'
```

## 5. Test tự động (khuyến nghị — nhanh hơn nhiều so với curl tay)

Hai script trong `scripts/` chạy toàn bộ luồng qua Gateway và in ✅/❌ cho từng bước:

```bash
# Đảm bảo cả 11 service đang chạy trước khi test
node scripts/test-e2e.js                 # luồng chính: đặt xe -> hoàn thành -> thanh toán -> đánh giá -> báo cáo admin
node scripts/test-dispatch-edge-cases.js # luồng phụ: tài xế từ chối -> tự chuyển tài xế khác; không tìm được tài xế
```

Cả 2 script đã được chạy thử và **pass 100%** (27/27 assertion) trên môi trường sạch.

**⚠️ Lưu ý khi tự chạy nhiều lần**: các file `data/*.json` là state thật, không tự reset. Nếu chạy test nhiều lần liên tiếp, tài xế "available" từ lần chạy trước vẫn còn trong hệ thống và có thể được chọn làm ứng viên cho lần chạy sau (không sai logic, chỉ là dữ liệu tích lũy). Muốn test trên trạng thái sạch, xóa dữ liệu:
```bash
find . -path "*/data/*.json" -not -name "pricingRules.json" -not -name "channels.json" -exec sh -c 'echo "[]" > "$1"' _ {} \;
```

### Test các endpoint `/admin/*` (FR-20..23)

Chưa có "Staff/Ops Service" quản lý tài khoản nhân viên vận hành trong phạm vi demo này (đây là điểm cần bổ sung nếu triển khai thật — tương tự Customer/Driver Service nhưng cho nhân viên nội bộ). Dùng script sau để tạo JWT `ops_admin`/`ops_staff` cho mục đích test:

```bash
node scripts/generate-staff-token.js ops_admin staff-1
# in ra 1 JWT token, dùng làm Bearer token gọi các endpoint /api/v1/admin/*
```

## 6. Kiến trúc & lưu ý thiết kế quan trọng

- **Event Bus Service** mô phỏng Kafka/RabbitMQ bằng HTTP pub-sub thuần (không cần cài Kafka thật) — mỗi service khi khởi động tự `POST /subscribe` các event nó quan tâm, và `POST /publish` khi cần phát event. Xem `cab-system-openapi.yaml` / tài liệu API Design để biết đủ danh sách event.
- **Database per Service**: mỗi service có `data/*.json` riêng, không service nào đọc trực tiếp file của service khác — mọi truy vấn chéo đều qua HTTP (có các endpoint `/internal` không cần auth dành riêng cho gọi service-to-service, ví dụ `GET /trips/:id/internal`).
- **Saga theo kiểu choreography**: Trip Service không gọi trực tiếp Dispatch/Payment — chỉ publish event rồi lắng nghe kết quả. Nhờ vậy lỗi ở Payment/Notification không làm sập luồng đặt xe chính (đúng yêu cầu phi chức năng trong tài liệu BA).
- **JWT dùng chung `JWT_SECRET`** giữa mọi service — token do Customer/Driver Service cấp verify được ở tất cả service khác mà không cần gọi lại để xác thực.
- **Các điểm đánh dấu ⚠️ trong code** (fare formula, timeout phản hồi tài xế, chính sách hủy chuyến) là placeholder tạm thời — đúng như Mục 9 tài liệu BA đã liệt kê là "chưa chốt với khách hàng". Cấu hình qua biến môi trường (`DISPATCH_OFFER_TIMEOUT_SEC`, `DISPATCH_SEARCH_RADIUS_KM`) chứ không hardcode.
- **Giới hạn đã biết của bản demo**: chưa có Staff/Ops Service riêng (dùng script sinh token tạm); chưa có WebSocket cho real-time (dùng polling); mock payment gateway (85% tỷ lệ thành công ngẫu nhiên) thay vì tích hợp cổng thật.
