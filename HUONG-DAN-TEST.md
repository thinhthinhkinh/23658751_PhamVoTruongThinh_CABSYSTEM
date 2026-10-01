# Hướng dẫn chạy Test — CAB System

**Sinh viên:** Phạm Võ Trường Thịnh — MSSV 23658751  
**Môn:** Microservices Architecture — HK1 2026-27

---

## 1. Yêu cầu trước khi test

| Phần mềm | Phiên bản |
|---|---|
| Docker Desktop | đang chạy |
| Node.js | 18+ |
| npm | 9+ |

---

## 2. Khởi động hệ thống

```bash
# Từ thư mục gốc project
docker-compose up -d
```

Chờ tất cả services **healthy** (khoảng 30–60 giây):

```bash
docker-compose ps
```

Kết quả mong muốn — tất cả dòng đều `(healthy)`:

```
api-gateway          Up  (healthy)
customer-service     Up  (healthy)
driver-service       Up  (healthy)
dispatch-service     Up  (healthy)
location-service     Up  (healthy)
trip-service         Up  (healthy)
payment-service      Up  (healthy)
notification-service Up  (healthy)
pricing-service      Up  (healthy)
admin-service        Up  (healthy)
event-bus-service    Up  (healthy)
rabbitmq             Up  (healthy)
mongodb              Up  (healthy)
```

---

## 3. Cài đặt dependencies cho testcase

```bash
cd testcase
npm install
```

> Chỉ cần chạy lần đầu hoặc sau khi `package.json` thay đổi.

---

## 4. Chạy toàn bộ test

```bash
cd testcase
npm test
```

### Kết quả kỳ vọng

```
Test Suites: 83 passed, 83 total
Tests:       86 passed, 86 total
Time:        ~35–40 s
```

---

## 5. Chạy từng nhóm test

```bash
# Chỉ chạy test dispatch
npm test -- --testPathPattern="dispatch"

# Chỉ chạy test trip
npm test -- --testPathPattern="trip"

# Chỉ chạy test payment
npm test -- --testPathPattern="payment"

# Chỉ chạy 1 file cụ thể
npm test -- --testPathPattern="TC-TRIP-15"
```

---

## 6. Danh sách 86 test cases

| STT | File | Mô tả |
|-----|------|-------|
| 1 | TC-CUST-01 | Đăng ký khách hàng thành công |
| 2 | TC-CUST-02 | Đăng nhập khách hàng thành công |
| 3 | TC-CUST-03 | Đăng nhập sai mật khẩu |
| 4 | TC-CUST-04 | Xem thông tin cá nhân |
| 5 | TC-CUST-05 | Cập nhật thông tin cá nhân |
| 6 | TC-CUST-06 | Email trùng lặp |
| 7 | TC-CUST-07 | Đăng ký thiếu trường bắt buộc |
| 8 | TC-CUST-08 | Truy cập không có token |
| 9 | TC-CUST-09 | Token sai / hết hạn |
| 10 | TC-CUST-10 | Phân trang danh sách chuyến |
| 11 | TC-CUST-21 | Đăng ký MongoDB |
| 12 | TC-DRV-01 | Đăng ký tài xế thành công |
| 13 | TC-DRV-02 | Đăng nhập tài xế |
| 14 | TC-DRV-03 | Cập nhật hồ sơ tài xế |
| 15 | TC-DRV-05 | Cập nhật phương tiện |
| 16 | TC-DRV-06 | Đổi trạng thái tài xế |
| 17 | TC-DRV-07 | Xem thông tin bản thân |
| 18 | TC-DRV-08 | Tài xế không hợp lệ |
| 19 | TC-DRV-09 | Truy cập không có quyền |
| 20 | TC-DRV-10 | Xem danh sách tài xế |
| 21 | TC-DISP-01 | Đề xuất tài xế gần nhất |
| 22 | TC-DISP-02 | Tài xế chấp nhận chuyến |
| 23 | TC-DISP-03 | Tài xế không phản hồi (timeout) |
| 24 | TC-DISP-04 | Tài xế từ chối, chuyển sang tài xế khác |
| 25 | TC-DISP-05 | Không có tài xế trong vùng |
| 26 | TC-DISP-06 | Xem danh sách ứng viên |
| 27 | TC-DISP-07 | Điều phối nhiều chuyến song song |
| 28 | TC-TRIP-02 | Tạo chuyến đi |
| 29 | TC-TRIP-03 | Tạo chuyến thiếu trường |
| 30 | TC-TRIP-04 | Xem thông tin chuyến |
| 31 | TC-TRIP-05 | Xem chuyến không phải của mình |
| 32 | TC-TRIP-06 | Cập nhật trạng thái chuyến |
| 33 | TC-TRIP-07 | Hủy chuyến |
| 34 | TC-TRIP-08 | Đánh giá chuyến hoàn thành |
| 35 | TC-TRIP-09 | Đánh giá chuyến chưa hoàn thành |
| 36 | TC-TRIP-10 | Xem điểm đánh giá tài xế |
| 37 | TC-TRIP-11 | Phân trang danh sách chuyến |
| 38 | TC-TRIP-13 | Driver assigned webhook |
| 39 | TC-TRIP-14 | No driver found webhook |
| 40 | TC-TRIP-15 | Luồng chuyến hoàn chỉnh (dispatch → complete) |
| 41 | TC-TRIP-16 | Admin xem tất cả chuyến |
| 42 | TC-TRIP-17 | Lọc chuyến theo trạng thái |
| 43 | TC-TRIP-18 | Chuyến không tồn tại |
| 44 | TC-TRIP-19 | Tài xế xem chuyến của mình |
| 45 | TC-TRIP-20 | Customer xem chuyến của mình |
| 46 | TC-TRIP-21 | Chuyển trạng thái hợp lệ |
| 47 | TC-TRIP-22 | Rate limit POST /trips |
| 48 | TC-PAY-01 | Thanh toán tiền mặt luôn thành công |
| 49 | TC-PAY-02 | Thanh toán điện tử thành công |
| 50 | TC-PAY-03 | Thanh toán điện tử thất bại |
| 51 | TC-PAY-04 | Tạo thanh toán 2 lần cùng chuyến |
| 52 | TC-PAY-05 | Retry giao dịch đã thành công |
| 53 | TC-PAY-06 | Retry giao dịch thất bại |
| 54 | TC-PAY-07 | Thanh toán khi chưa có cước |
| 55 | TC-PAY-08 | Khách hàng chỉ xem thanh toán của mình |
| 56 | TC-NOTI-01 | Gửi thông báo |
| 57 | TC-NOTI-02 | Xem thông báo của mình |
| 58 | TC-NOTI-03 | Đánh dấu đã đọc |
| 59 | TC-NOTI-05 | Thông báo không tồn tại |
| 60 | TC-LOC-01 | Cập nhật vị trí tài xế |
| 61 | TC-LOC-03 | Tìm tài xế gần nhất |
| 62 | TC-LOC-04 | Xem vị trí tài xế |
| 63 | TC-LOC-05 | Vị trí không tồn tại |
| 64 | TC-LOC-21 | Xem vị trí nhiều tài xế |
| 65 | TC-PRICE-02 | Tính cước 4 chỗ |
| 66 | TC-PRICE-04 | Tính cước xe máy |
| 67 | TC-ADM-01 | Admin xem danh sách tài xế |
| 68 | TC-ADM-03 | Admin duyệt tài xế |
| 69 | TC-ADM-04 | Admin từ chối tài xế |
| 70 | TC-ADM-05 | Admin xem tất cả chuyến đi |
| 71 | TC-ADM-06 | Admin vô hiệu hóa tài xế |
| 72 | TC-ADM-07 | Admin không có quyền customer |
| 73 | TC-GATE-03 | Rate limit API Gateway |
| 74–86 | … | (các test còn lại) |

---

## 7. Xử lý sự cố thường gặp

### Tests thất bại sau nhiều lần chạy liên tiếp

Dispatch tests (TC-DISP-*) dùng staleness filter 20 giây. Nếu chạy 2 lần liên tiếp quá nhanh (< 30s), có thể gặp lỗi nhẹ. **Giải pháp:** chờ 30 giây rồi chạy lại.

### Lỗi kết nối / timeout

```bash
# Kiểm tra services có healthy không
docker-compose ps

# Xem log service bị lỗi (ví dụ trip-service)
docker-compose logs trip-service --tail=50
```

### Reset toàn bộ dữ liệu (nếu dữ liệu cũ gây nhiễu)

```bash
docker-compose down -v
docker-compose up -d
# Chờ healthy rồi chạy lại npm test
```

---

## 8. Cấu trúc Services

```
API Gateway     :3000  → route tất cả request
Customer Service:4001  → đăng ký / đăng nhập khách hàng
Driver Service  :4002  → quản lý tài xế
Trip Service    :4003  → quản lý chuyến đi
Dispatch Service:4004  → điều phối tài xế tự động
Location Service:4005  → theo dõi vị trí tài xế
Pricing Service :4006  → tính cước
Payment Service :4007  → xử lý thanh toán
Notification Svc:4008  → thông báo
Admin Service   :4009  → quản trị
Event Bus       :4000  → pub/sub HTTP (legacy)
RabbitMQ AMQP   :5672  → message broker chính
RabbitMQ UI     :15672 → giao diện quản lý RabbitMQ
MongoDB         :27017 → lưu trữ dữ liệu
```
