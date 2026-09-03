# CAB System — API Specification (mỗi service 1 file, tự chứa hoàn toàn)

Mỗi service có **đúng 1 file YAML duy nhất, đầy đủ toàn bộ cấu trúc OpenAPI 3.0.3** (openapi, info, servers, paths, components) — **không có `$ref` trỏ ra file khác**. Muốn xem/sửa/import API của service nào, chỉ cần đúng 1 file đó, không phụ thuộc file nào khác trong hay ngoài thư mục này.

## Danh sách file

| File | Số path | Ghi chú |
|---|---|---|
| `customer-service.yaml` | 4 | FR-01 |
| `driver-service.yaml` | 7 | FR-02, FR-11 |
| `trip-service.yaml` | 8 | FR-03,04,05,13 + đánh giá tài xế |
| `dispatch-service.yaml` | 3 | FR-06..09, FR-12 |
| `location-service.yaml` | 3 | FR-10 |
| `pricing-service.yaml` | 2 | FR-14 |
| `payment-service.yaml` | 5 | FR-15, FR-16 |
| `notification-service.yaml` | 2 | FR-17..19 |
| `admin-service.yaml` | 13 | FR-20..23 (tổng hợp dữ liệu từ service khác) |

Tổng cộng 47 path — khớp 100% với bản gốc.

## Vì sao mỗi file có vẻ "trùng lặp" một số schema?

Vì mỗi file **tự chứa hoàn toàn**, những schema dùng chung (ví dụ `Error`, `LoginRequest`, hay `Trip` xuất hiện cả trong `trip-service.yaml` lẫn `admin-service.yaml` vì Admin đọc dữ liệu Trip) sẽ được **lặp lại y hệt** ở mọi file cần đến nó, thay vì chỉ định nghĩa 1 lần rồi trỏ `$ref` chéo qua file khác. Đây là đánh đổi có chủ đích: đổi một chút trùng lặp lấy sự độc lập tuyệt đối — sửa file của service này không bao giờ ảnh hưởng service khác, và có thể giao 1 file cho 1 người/1 team phụ trách mà không cần đụng tới các file còn lại.

## Cách dùng

- **Sửa API của 1 service** → chỉ mở đúng file `<service>.yaml`, sửa trực tiếp `paths` hoặc `components.schemas` trong chính file đó.
- **Import vào Swagger Catalog/Studio** → import trực tiếp từng file, không cần gộp gì thêm (khác với cách tách kiểu cha-con trước đó cần chạy script bundle).
- **Thêm API mới cho 1 service đã có** → thêm path key vào đúng file, định nghĩa schema mới ngay trong `components.schemas` của chính file đó.
- **Thêm 1 service hoàn toàn mới** → tạo file mới theo đúng khuôn 5 phần: `openapi`, `info`, `servers`, `paths`, `components` (xem bất kỳ file nào ở đây làm mẫu, `dispatch-service.yaml` là file ngắn nhất, dễ đọc nhất để tham khảo cấu trúc).

## Servers khai báo trong mỗi file

Mỗi file có 2 server:
- `http://localhost:<port riêng của service>` — gọi thẳng vào service đó, bỏ qua Gateway (hữu ích khi debug 1 service độc lập)
- `http://localhost:3000/api/v1` — gọi qua API Gateway (đúng luồng thật khi hệ thống chạy đầy đủ)

## Đã kiểm tra trước khi bàn giao

Cả 9 file được validate **độc lập từng file** (không phải validate chung 1 lần) bằng `@apidevtools/swagger-parser`, đều pass chuẩn OpenAPI 3.0.3. Tổng path cộng lại đúng 47, khớp bản gốc — không thiếu, không thừa endpoint nào.
