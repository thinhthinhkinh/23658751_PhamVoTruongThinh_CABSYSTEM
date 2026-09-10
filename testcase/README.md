# Test Case — CAB System

Test case tự động hóa cho **toàn bộ 68 test scenario** trong `Test-Scenarios-CAB-System.xlsx`, phủ đủ 9 service. Mỗi test case là 1 file riêng dưới `tests/<service>/`, đặt tên đúng theo Test ID trong Excel để đối chiếu ngược.

**Đã chạy thật, xác nhận 68/68 PASS trước khi bàn giao** (chạy toàn bộ cùng lúc trên 1 cụm, không phải chạy rời từng phần rồi gộp kết quả).

## Cấu trúc

```
testcase/
├── Test-Scenarios-CAB-System.xlsx
├── package.json / package-lock.json
├── .env.example
├── README.md
└── tests/
    ├── helpers.js                    # gọi API dùng chung + ký JWT customer/driver/ops_staff/ops_admin
    ├── customer-service/             # TC-CUST-01..10   (10 test)
    ├── driver-service/               # TC-DRV-01..10    (10 test)
    ├── trip-service/                 # TC-TRIP-01..12   (12 test) + _setup.js
    ├── dispatch-service/             # TC-DISP-01..07   (7 test)  + _setup.js
    ├── location-service/             # TC-LOC-01..05    (5 test)
    ├── pricing-service/              # TC-PRICE-01..04  (4 test)
    ├── payment-service/              # TC-PAY-01..08    (8 test)  + _setup.js
    ├── notification-service/         # TC-NOTI-01..05   (5 test)  + _setup.js
    └── admin-service/                # TC-ADM-01..07    (7 test)  + _setup.js
```

File `_setup.js` trong 1 số thư mục là helper riêng của service đó (không phải test, Jest tự bỏ qua vì không khớp đuôi `.test.js`) — dùng để dựng sẵn dữ liệu cần thiết (VD: 1 chuyến đã gán tài xế) mà không cần chạy cả luồng thật từ đầu.

## Chạy TOÀN BỘ 68 test cùng lúc (khuyến nghị)

Cần bật **cả cụm `cab-system`** (event bus + 9 service + gateway):

```bash
cd cab-system
npm run start:all
```

Rồi ở thư mục `testcase`:

```bash
npm install
copy .env.example .env      # Windows — hoặc "cp" trên macOS/Linux
npm test
```

Kết quả mong đợi: `Tests: 68 passed, 68 total`.

⚠️ **Riêng test TC-DISP-03** (tài xế không phản hồi quá thời gian quy định) cần biến môi trường `DISPATCH_OFFER_TIMEOUT_SEC` nhỏ để không phải chờ lâu — mặc định của `cab-system` là 20 giây (khá lâu cho việc chạy test). Set trước khi khởi động `dispatch-service`:

```bash
# trong cab-system, trước khi npm run start:all (hoặc set trong .env)
set DISPATCH_OFFER_TIMEOUT_SEC=3      # Windows cmd
$env:DISPATCH_OFFER_TIMEOUT_SEC=3     # PowerShell
```

Nếu để mặc định 20s, test TC-DISP-03 vẫn đúng nhưng sẽ mất hơn 20 giây thay vì 5 giây — test tự thích ứng theo giá trị này (`(TIMEOUT_SEC + 5) * 1000`), không bị fail vì timeout dài hơn.

## Chạy RIÊNG 1 service (khi chỉ cần kiểm tra 1 phần)

Không phải mọi test đều cần cả cụm. Bảng dưới liệt kê **service tối thiểu cần bật** cho từng nhóm test:

| Thư mục test | Service cần bật |
|---|---|
| `customer-service/` | Customer Service |
| `driver-service/` | Driver Service |
| `location-service/` | Location Service |
| `pricing-service/` | Pricing Service |
| `trip-service/` | Trip Service + Pricing Service |
| `payment-service/` | Payment Service + Trip Service |
| `notification-service/` | Notification Service + Trip Service |
| `admin-service/` | Admin Service + Customer Service + Trip Service + Pricing Service |
| `dispatch-service/` | Event Bus + Driver Service + Location Service + Trip Service + Dispatch Service (bộ phức tạp nhất) |

Luôn cần **API Gateway** chạy cùng (mọi test đều gọi qua `http://localhost:3000/api/v1`).

Chạy 1 thư mục:
```bash
npx jest tests/driver-service --runInBand
```

Chạy 1 file:
```bash
npx jest tests/driver-service/TC-DRV-01.test.js
```

## Vì sao nhiều test dùng JWT tự ký thay vì đăng ký tài khoản thật?

Hầu hết service (Trip, Location, Payment, Notification, Admin) chỉ **verify chữ ký JWT + role**, không xác minh id đó có thật trong Customer/Driver Service hay không. Điều này đúng với thiết kế microservices: mỗi service tự chịu trách nhiệm xác thực/phân quyền dựa trên token, không gọi ngược lại "service chủ" của id đó. Nhờ vậy phần lớn test có thể chạy **độc lập, không cần cả cụm**, giúp chạy nhanh và dễ debug hơn nhiều so với việc lúc nào cũng phải dựng nguyên hệ thống.

Ngoại lệ: `dispatch-service/` cần tài xế **có thật** trong Driver Service (để `GET /drivers?status=available` trả về đúng), vì đây là service duy nhất mà hành vi cốt lõi (tìm & phân công) phụ thuộc trực tiếp vào dữ liệu thật từ service khác qua HTTP, không phải qua JWT.

## Lưu ý về dữ liệu giữa các lần chạy

Mỗi service dùng file `data/*.json` làm "database" — không tự reset. Chạy lại nhiều lần sẽ tích lũy dữ liệu (không sai logic, nhưng có thể ảnh hưởng 1 số test dựa vào việc đếm/liệt kê, ví dụ `TC-ADM-06`). Muốn test trên trạng thái sạch, dừng service rồi reset:

```bash
cd cab-system
find . -path "*/data/*.json" ! -name "pricingRules.json" ! -name "channels.json" -exec sh -c 'echo "[]" > "$1"' _ {} \;
```

(Trên Windows, xóa thủ công nội dung từng file `data/*.json` về `[]`, trừ `pricingRules.json` và `channels.json`.)
