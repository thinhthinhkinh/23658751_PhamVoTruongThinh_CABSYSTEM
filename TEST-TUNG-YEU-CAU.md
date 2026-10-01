# Hướng dẫn test từng yêu cầu — Phiếu chấm 30 STT

> Chạy tất cả lệnh trong **Git Bash** (hoặc WSL).  
> Gateway URL: `http://localhost:3000`  
> API prefix: `http://localhost:3000/api/v1`

---

## Chuẩn bị: Lấy token trước khi test

### 1. Sinh Admin Token (ops_admin)
```bash
# Chạy từ thư mục testcase/
cd testcase
ADMIN_TOKEN=$(node -e "
const jwt=require('jsonwebtoken');
console.log(jwt.sign({id:'admin-001',role:'ops_admin'},
  'cab-system-super-secret-key-change-me',{expiresIn:'24h'}));
")
echo "ADMIN_TOKEN=$ADMIN_TOKEN"
```

### 2. Đăng ký + lấy Customer Token
```bash
CUST_RES=$(curl -s -X POST http://localhost:3000/api/v1/customers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van A","email":"custa_'$(date +%s)'@test.com","password":"123456","phone":"0901234567"}')
echo $CUST_RES | python3 -m json.tool
CUSTOMER_TOKEN=$(echo $CUST_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "CUSTOMER_TOKEN=$CUSTOMER_TOKEN"
```

### 3. Đăng ký + lấy Driver Token
```bash
DRV_RES=$(curl -s -X POST http://localhost:3000/api/v1/drivers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Tran Van B","email":"drvb_'$(date +%s)'@test.com","password":"123456","vehicle":{"plate":"51H-111.11","model":"Toyota Vios","type":"4-seat"}}')
echo $DRV_RES | python3 -m json.tool
DRIVER_TOKEN=$(echo $DRV_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
DRIVER_ID=$(echo $DRV_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['driver']['id'])")
echo "DRIVER_TOKEN=$DRIVER_TOKEN"
echo "DRIVER_ID=$DRIVER_ID"
```

---

## STT 1 — Mô tả kiến trúc source code

**Kiểm tra thủ công:** Mở file `SYSTEM-DOCUMENTATION.md` — đọc mục 1 (Architecture Overview) và mục 2 (Services).

**Kỳ vọng:** Có mô tả layered architecture, 10 services, event-driven pattern.

---

## STT 2 — `.gitignore` và `.env` không lên GitHub

```bash
# Kiểm tra .gitignore có chứa .env không
grep "\.env" .gitignore

# Kiểm tra .env.example tồn tại (dùng làm template)
ls .env*
```

**Kỳ vọng:** `.env` trong `.gitignore`, có file `.env.example`.

---

## STT 3 — Mô tả nhiệm vụ Gateway

**Kiểm tra thủ công:** Mở `SYSTEM-DOCUMENTATION.md` — tìm mục "API Gateway".

**Kiểm tra thực tế:**
```bash
# Gateway route tất cả requests
curl -s http://localhost:3000/api/v1/customers/register \
  -X POST -H "Content-Type: application/json" \
  -d '{"test":"only"}' | python3 -m json.tool
# → phải đi qua gateway trả về error (không phải connection refused)
```

---

## STT 4 — Mô tả IPC (giao tiếp giữa services)

**Kiểm tra thủ công:** Mở `SYSTEM-DOCUMENTATION.md` — tìm mục "RabbitMQ & Sự kiện".

**Xem RabbitMQ exchanges và queues:**
```bash
# Mở browser: http://localhost:15672 (guest/guest)
# Vào tab "Exchanges" → thấy exchange "cab_events" (topic)
# Vào tab "Queues" → thấy các exclusive queues của từng service

# Hoặc dùng API RabbitMQ:
curl -s -u guest:guest http://localhost:15672/api/exchanges/%2F/cab_events | python3 -m json.tool
# → {"name":"cab_events","type":"topic","durable":true,...}
```

---

## STT 5 — docker-compose + liệt kê container

```bash
docker-compose ps
# Kỳ vọng: 13 container tất cả (healthy)
# mongodb, rabbitmq, event-bus-service, 9 domain services, api-gateway
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep cab
```

---

## STT 6 — `/health`, `/ready`, `/health/services`

```bash
# Health check gateway
curl -s http://localhost:3000/health | python3 -m json.tool
# → {"status":"ok","service":"api-gateway"}

curl -s http://localhost:3000/ready | python3 -m json.tool
# → {"status":"ready","service":"api-gateway"}

curl -s http://localhost:3000/health/services | python3 -m json.tool
# → {"status":"ok","services":[...tất cả healthy...]}
```

---

## STT 7 — Message Broker (RabbitMQ)

**Hệ thống dùng RabbitMQ thực sự** qua `amqplib` — không phải simulation.

```bash
# 1. Kiểm tra RabbitMQ container đang chạy
docker-compose ps rabbitmq
# → rabbitmq  Up (healthy)  0.0.0.0:5672->5672, 0.0.0.0:15672->15672

# 2. Xem exchange cab_events qua API
curl -s -u guest:guest http://localhost:15672/api/exchanges/%2F/cab_events | python3 -m json.tool
# → {"name":"cab_events","type":"topic","durable":true,"auto_delete":false,...}

# 3. Xem các queues đang active (exclusive queues của từng service)
curl -s -u guest:guest http://localhost:15672/api/queues | python3 -m json.tool | grep -A3 '"name"'

# 4. Xem bindings của exchange (routing keys)
curl -s -u guest:guest "http://localhost:15672/api/exchanges/%2F/cab_events/bindings/source" | python3 -m json.tool
# → thấy các routing key: TripRequested, DriverAssigned, NoDriverFound, FareCalculated, ...
```

> **Mở Management UI**: `http://localhost:15672` → user: `guest` / pass: `guest`
> → Tab **Exchanges** → `cab_events` → xem type, durability, bindings

---

## STT 8 — Mọi request qua Gateway

```bash
# Gọi trực tiếp 1 service (bypass gateway) — vẫn được vì đây là dev environment
curl -s http://localhost:4001/health
# → {"status":"ok","service":"customer-service"}

# Gọi qua gateway — đây là cách ĐÚNG
curl -s http://localhost:3000/api/v1/customers/register \
  -X POST -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
# → validation error từ customer-service, nhưng đi qua gateway ✓
```

---

## STT 9 — Đăng ký khách hàng

```bash
curl -s -X POST http://localhost:3000/api/v1/customers/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Le Thi C",
    "email": "lethi_'$(date +%s)'@example.com",
    "password": "matkhau123",
    "phone": "0912345678"
  }' | python3 -m json.tool
```

**Kỳ vọng:** `status 201`, có `token` và `customer.id` trong response.

---

## STT 10 — Đăng nhập khách hàng

```bash
# Dùng email đã đăng ký ở STT 9
curl -s -X POST http://localhost:3000/api/v1/customers/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lethi_<TIMESTAMP>@example.com","password":"matkhau123"}' | python3 -m json.tool
```

**Kỳ vọng:** `status 200`, có `token`.

---

## STT 11 — Lấy thông tin khách hàng (token)

```bash
curl -s http://localhost:3000/api/v1/customers/me \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | python3 -m json.tool
# → {"data":{"id":"...","fullName":"Nguyen Van A","email":"...",...}}
```

---

## STT 12 — Lấy thông tin tài xế theo ID

```bash
curl -s http://localhost:3000/api/v1/drivers/$DRIVER_ID | python3 -m json.tool
# → không cần token, trả thông tin public của tài xế
```

---

## STT 13 — Danh sách tài xế khu vực (limit + paging)

```bash
# Đặt vị trí tài xế trước
curl -s -X POST http://localhost:3000/api/v1/locations \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":10.771,"lng":106.70}' | python3 -m json.tool

# Tìm tài xế gần với pagination
curl -s "http://localhost:3000/api/v1/locations/nearby-drivers?lat=10.77&lng=106.70&radiusKm=5&limit=2&page=1" | python3 -m json.tool
# → {"data":[...],"meta":{"total":N,"page":1,"limit":2,"totalPages":M}}

curl -s "http://localhost:3000/api/v1/locations/nearby-drivers?lat=10.77&lng=106.70&radiusKm=5&limit=2&page=2" | python3 -m json.tool
# → trang 2
```

---

## STT 14 — Danh sách booking của Customer (limit + paging)

```bash
# Tạo vài chuyến trước (nếu chưa có)
for i in 1 2 3; do
  curl -s -X POST http://localhost:3000/api/v1/trips \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"pickupLocation":{"lat":10.77,"lng":106.70},"dropoffLocation":{"lat":10.78,"lng":106.69},"vehicleType":"4-seat"}' > /dev/null
done

# Lấy danh sách với pagination
curl -s "http://localhost:3000/api/v1/customers/me/trips?limit=2&page=1" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | python3 -m json.tool
# → {"data":[...],"meta":{"total":N,"page":1,"limit":2,"totalPages":M}}
```

---

## STT 15 — Đặt xe → booking → tìm tài xế tự động

```bash
# Bước 1: Đăng ký và đặt tài xế ở trạng thái available + cập nhật vị trí
DRV2_RES=$(curl -s -X POST http://localhost:3000/api/v1/drivers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Driver STT15","email":"drv15_'$(date +%s)'@test.com","password":"123456","vehicle":{"plate":"51H-015.15","model":"Vios","type":"4-seat"}}')
DRV2_TOKEN=$(echo $DRV2_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
DRV2_ID=$(echo $DRV2_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['driver']['id'])")

curl -s -X PATCH http://localhost:3000/api/v1/drivers/me/status \
  -H "Authorization: Bearer $DRV2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"available"}' > /dev/null

curl -s -X POST http://localhost:3000/api/v1/locations \
  -H "Authorization: Bearer $DRV2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":10.771,"lng":106.70}' > /dev/null

# Bước 2: Tạo chuyến đi
TRIP_RES=$(curl -s -X POST http://localhost:3000/api/v1/trips \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupLocation":{"lat":10.77,"lng":106.70},"dropoffLocation":{"lat":10.78,"lng":106.69},"vehicleType":"4-seat"}')
TRIP_ID=$(echo $TRIP_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "TRIP_ID=$TRIP_ID"

# Bước 3: Chờ dispatch xử lý (3 giây)
sleep 3

# Bước 4: Tài xế kiểm tra offer
curl -s http://localhost:3000/api/v1/dispatch/drivers/me/pending \
  -H "Authorization: Bearer $DRV2_TOKEN" | python3 -m json.tool
# → {"data":{"tripId":"...","eta":N}}  ← tài xế nhận được đề xuất
```

---

## STT 16 — Tài xế nhận chuyến

```bash
# (tiếp theo từ STT 15, TRIP_ID và DRV2_TOKEN đã có)

# Tài xế chấp nhận chuyến
curl -s -X POST http://localhost:3000/api/v1/dispatch/$TRIP_ID/accept \
  -H "Authorization: Bearer $DRV2_TOKEN" | python3 -m json.tool
# → {"data":{"tripId":"...","driverId":"...","eta":N}}

# Kiểm tra trạng thái chuyến → driver_assigned
curl -s http://localhost:3000/api/v1/trips/$TRIP_ID/status \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | python3 -m json.tool
# → {"data":{"status":"driver_assigned"}}
```

---

## STT 17 — Cập nhật trạng thái chuyến

```bash
# (tiếp theo từ STT 16)
# Tài xế cập nhật: driver_assigned → arrived
curl -s -X PATCH http://localhost:3000/api/v1/trips/$TRIP_ID/status \
  -H "Authorization: Bearer $DRV2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"arrived"}' | python3 -m json.tool

# arrived → in_progress
curl -s -X PATCH http://localhost:3000/api/v1/trips/$TRIP_ID/status \
  -H "Authorization: Bearer $DRV2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | python3 -m json.tool

# in_progress → completed
curl -s -X PATCH http://localhost:3000/api/v1/trips/$TRIP_ID/status \
  -H "Authorization: Bearer $DRV2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","distanceKm":5.2,"durationMin":15}' | python3 -m json.tool
# → {"data":{"status":"completed","fareAmount":...}}
```

---

## STT 18 — Hủy chuyến

```bash
# Tạo chuyến mới để hủy
CANCEL_TRIP_RES=$(curl -s -X POST http://localhost:3000/api/v1/trips \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupLocation":{"lat":10.77,"lng":106.70},"dropoffLocation":{"lat":10.78,"lng":106.69},"vehicleType":"4-seat"}')
CANCEL_TRIP_ID=$(echo $CANCEL_TRIP_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# Hủy chuyến
curl -s -X POST http://localhost:3000/api/v1/trips/$CANCEL_TRIP_ID/cancel \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | python3 -m json.tool
# → {"data":{"status":"cancelled"}}
```

---

## STT 19 — Thanh toán online

```bash
# Bước 1: Seed fare cho TRIP_ID đã completed (từ STT 17)
curl -s -X POST http://localhost:3000/api/v1/payments/events/fare-calculated \
  -H "Content-Type: application/json" \
  -d "{\"event\":\"FareCalculated\",\"payload\":{\"tripId\":\"$TRIP_ID\",\"amount\":85000}}" | python3 -m json.tool

# Bước 2: Tạo thanh toán e-wallet
PAY_RES=$(curl -s -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tripId\":\"$TRIP_ID\",\"method\":\"e-wallet\"}")
echo $PAY_RES | python3 -m json.tool
# → {"data":{"status":"success","amount":85000,"providerRef":"PROV-XXXXXXXX"}}
# hoặc status:"failed" (30% xác suất) — chạy lại nếu muốn success
```

---

## STT 20 — Đánh giá chuyến đi

```bash
# (TRIP_ID phải ở trạng thái completed)
curl -s -X POST http://localhost:3000/api/v1/trips/$TRIP_ID/rating \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":5,"comment":"Tài xế rất thân thiện!"}' | python3 -m json.tool
# → {"data":{"score":5,"comment":"Tài xế rất thân thiện!","driverId":"..."}}
```

---

## STT 21 — Đăng ký tài xế → trạng thái pending_approval

```bash
NEW_DRV=$(curl -s -X POST http://localhost:3000/api/v1/drivers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Thi D","email":"ngthi_'$(date +%s)'@test.com","password":"abc123","vehicle":{"plate":"51H-021.21","model":"Honda City","type":"4-seat"}}')
echo $NEW_DRV | python3 -m json.tool
# → "approvalStatus":"pending_approval"  ← QUAN TRỌNG

NEW_DRV_ID=$(echo $NEW_DRV | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['driver']['id'])")
echo "NEW_DRV_ID=$NEW_DRV_ID"
```

---

## STT 22 — Admin duyệt / từ chối hồ sơ tài xế

```bash
# Duyệt tài xế
curl -s -X PATCH http://localhost:3000/api/v1/drivers/$NEW_DRV_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
# → "approvalStatus":"approved"

# Tạo tài xế mới để test từ chối
REJECT_DRV_ID=$(curl -s -X POST http://localhost:3000/api/v1/drivers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ho Van E","email":"hove_'$(date +%s)'@test.com","password":"123456","vehicle":{"plate":"51H-022.22","model":"Mazda","type":"4-seat"}}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['driver']['id'])")

curl -s -X PATCH http://localhost:3000/api/v1/drivers/$REJECT_DRV_ID/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
# → "approvalStatus":"rejected"
```

---

## STT 23 — Bật/tắt trạng thái nhận chuyến

```bash
# Chuyển sang available (bật nhận chuyến)
curl -s -X PATCH http://localhost:3000/api/v1/drivers/me/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"available"}' | python3 -m json.tool
# → "status":"available"

# Chuyển sang offline (tắt nhận chuyến)
curl -s -X PATCH http://localhost:3000/api/v1/drivers/me/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"offline"}' | python3 -m json.tool
# → "status":"offline"
```

---

## STT 24 — Mã hóa dữ liệu nhạy cảm (password hash)

```bash
# Kiểm tra trong MongoDB — password KHÔNG được lưu plaintext
docker exec 23658751_phamvotruongthinh_cabsystem-mongodb-1 \
  mongosh driver_db --eval "db.drivers.findOne({},{passwordHash:1,_id:0})"
# → passwordHash: "6f3c2e...:<salt>:<hash>" — KHÔNG phải "123456"
```

---

## STT 25 — SQL Injection

```bash
# Thử inject vào email field
curl -s -X POST http://localhost:3000/api/v1/customers/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin'\'' OR '\''1'\''='\''1","password":"anything"}' | python3 -m json.tool
# → 401 INVALID_CREDENTIALS — không bị bypass (MongoDB không có SQL)

# Thử inject vào query parameter
curl -s "http://localhost:3000/api/v1/trips?status='; DROP TABLE trips; --" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | python3 -m json.tool
# → trả về [] hoặc lỗi validation — không crash
```

---

## STT 26 — XSS Input

```bash
# (cần TRIP_ID đã completed, dùng TRIP_ID từ STT 17)
# Gửi script tag trong comment rating
XSS_RES=$(curl -s -X POST http://localhost:3000/api/v1/trips/$TRIP_ID/rating \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":4,"comment":"<script>alert(\"XSS\")</script>"}' 2>/dev/null || \
  echo "already rated - create new completed trip")

# Xem rating đã lưu — comment phải bị escape
curl -s http://localhost:3000/api/v1/drivers/$DRV2_ID/ratings | python3 -m json.tool
# → comment: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"  ← đã escape ✓
```

> Nếu trip đã được rate, tạo một completed trip mới (chạy lại flow STT 15→17→26).

---

## STT 27 — JWT Tampering

```bash
# Dùng token hợp lệ
VALID_TOKEN=$CUSTOMER_TOKEN

# Tạo token giả (sửa chữ ký bằng cách đổi 1 ký tự cuối)
TAMPERED_TOKEN="${VALID_TOKEN%?}X"

curl -s http://localhost:3000/api/v1/customers/me \
  -H "Authorization: Bearer $TAMPERED_TOKEN" | python3 -m json.tool
# → 401 INVALID_TOKEN — JWT bị sửa không hợp lệ ✓

# Dùng token với secret sai
WRONG_SECRET_TOKEN=$(node -e "
const jwt=require('jsonwebtoken');
console.log(jwt.sign({id:'hacker',role:'ops_admin'},'wrong-secret',{expiresIn:'1h'}));
" 2>/dev/null || echo "need-node")

curl -s http://localhost:3000/api/v1/customers/me \
  -H "Authorization: Bearer $WRONG_SECRET_TOKEN" | python3 -m json.tool
# → 401 INVALID_TOKEN ✓
```

---

## STT 28 — Unauthorized Access (403)

```bash
# Customer cố truy cập endpoint chỉ dành cho ops_admin
curl -s -X PATCH http://localhost:3000/api/v1/drivers/$DRIVER_ID/approve \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | python3 -m json.tool
# → 403 FORBIDDEN ✓

# Driver cố lấy danh sách tất cả tài xế (chỉ admin mới được)
curl -s http://localhost:3000/api/v1/drivers/all \
  -H "Authorization: Bearer $DRIVER_TOKEN" | python3 -m json.tool
# → 403 FORBIDDEN ✓

# Không có token
curl -s http://localhost:3000/api/v1/customers/me | python3 -m json.tool
# → 401 MISSING_TOKEN ✓
```

---

## STT 29 — Rate Limit Attack (429)

```bash
# Gửi 50 request đồng thời với cùng 1 token → nhiều cái sẽ nhận 429
TOKEN_FIXED=$CUSTOMER_TOKEN
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/v1/trips \
    -H "Authorization: Bearer $TOKEN_FIXED" \
    -H "Content-Type: application/json" \
    -d '{"pickupLocation":{"lat":10.77,"lng":106.70},"dropoffLocation":{"lat":10.78,"lng":106.69},"vehicleType":"4-seat"}' &
done
wait
# → thấy nhiều dòng "201" và một số dòng "429"
```

---

## STT 30 — Replay Attack / Idempotency

```bash
# Tạo 1 fare mới
REPLAY_TRIP_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
curl -s -X POST http://localhost:3000/api/v1/payments/events/fare-calculated \
  -H "Content-Type: application/json" \
  -d "{\"event\":\"FareCalculated\",\"payload\":{\"tripId\":\"$REPLAY_TRIP_ID\",\"amount\":60000}}" > /dev/null

# Lần 1: tạo thanh toán thành công
curl -s -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tripId\":\"$REPLAY_TRIP_ID\",\"method\":\"cash\"}" | python3 -m json.tool
# → 201 status:"success"

# Lần 2: gửi lại đúng request đó (replay attack)
curl -s -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tripId\":\"$REPLAY_TRIP_ID\",\"method\":\"cash\"}" | python3 -m json.tool
# → 409 PAYMENT_ALREADY_EXISTS — chặn replay ✓
```

---

## Checklist nhanh (chạy tất cả tests tự động)

```bash
cd testcase
npm test
# → 86 passed, 86 total ✓
```

---

## Ghi chú

| Biến | Mô tả |
|------|-------|
| `$ADMIN_TOKEN` | JWT với `role:"ops_admin"` — dùng cho STT 22, 28 |
| `$CUSTOMER_TOKEN` | JWT lấy sau khi đăng ký/đăng nhập customer |
| `$DRIVER_TOKEN` | JWT lấy sau khi đăng ký driver |
| `$DRIVER_ID` | UUID của driver vừa đăng ký |
| `$TRIP_ID` | UUID của chuyến đã completed (STT 17) |
| `$DRV2_ID` | UUID của driver nhận chuyến trong STT 15–17 |

> **Tip:** Chạy section "Chuẩn bị" một lần, copy các biến, rồi test từng STT theo thứ tự.
