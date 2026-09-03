# CAB System — API Specification (multi-file)

Đặc tả OpenAPI được **tách theo từng service** thay vì gộp 1 file duy nhất, để dễ mở rộng và sửa lỗi — mỗi service có 1 file path riêng, không đụng chạm lẫn nhau.

## Cấu trúc

```
api-specification/
├── openapi.yaml                        # File gốc — chỉ chứa info, servers, tags, và $ref trỏ đến từng path bên dưới
├── paths/
│   ├── customer-service.yaml           # FR-01
│   ├── driver-service.yaml             # FR-02, FR-11
│   ├── trip-service.yaml               # FR-03,04,05,13 + đánh giá tài xế (Rating)
│   ├── dispatch-service.yaml           # FR-06..09, FR-12
│   ├── location-service.yaml           # FR-10
│   ├── pricing-service.yaml            # FR-14
│   ├── payment-service.yaml            # FR-15, FR-16
│   ├── notification-service.yaml       # FR-17..19
│   └── admin-service.yaml              # FR-20..23
├── components/
│   ├── schemas/
│   │   ├── common.yaml                 # Error, LoginRequest (dùng chung)
│   │   ├── customer.yaml
│   │   ├── driver.yaml
│   │   ├── trip.yaml                   # gồm cả schema Rating
│   │   ├── dispatch.yaml
│   │   ├── location.yaml
│   │   ├── pricing.yaml
│   │   ├── payment.yaml
│   │   ├── notification.yaml
│   │   └── admin.yaml
│   ├── responses/common.yaml           # 5 response tái sử dụng: ValidationError, UnauthorizedError...
│   └── parameters/common.yaml          # IdParam, TripIdParam, FromToParams
├── bundled/
│   └── cab-system-openapi.yaml         # Bản GỘP tự động — dùng để import vào Swagger Catalog/Postman
└── scripts/
    └── bundle.js                       # Script gộp lại thành 1 file khi cần
```

## Quy tắc sửa/mở rộng

- **Muốn sửa 1 endpoint của service nào → chỉ mở đúng file `paths/<service>.yaml` của service đó.** Không phải kéo tìm trong 1 file 900 dòng nữa.
- **Muốn thêm schema mới** → thêm vào đúng file `components/schemas/<service>.yaml` tương ứng, rồi `$ref` tới nó bằng đường dẫn tương đối, ví dụ từ `paths/customer-service.yaml`:
  ```yaml
  schema:
    $ref: '../components/schemas/customer.yaml#/TenSchemaMoi'
  ```
- **Muốn thêm 1 API mới cho service đã có** → thêm path key vào đúng file `paths/<service>.yaml`, rồi thêm 1 dòng `$ref` tương ứng trong `openapi.yaml` (mục `paths`), theo đúng mẫu các dòng đã có.
- **File `openapi.yaml` gốc hầu như không cần sửa nữa** trừ khi thêm hẳn 1 API mới hoặc đổi `info`/`servers`.

## Khi nào cần "gộp lại thành 1 file"?

Một số công cụ (Swagger Catalog online, Postman import, chấm điểm nếu yêu cầu nộp 1 file duy nhất) **không đọc được cấu trúc nhiều file** — chúng cần 1 file YAML duy nhất, không có `$ref` trỏ ra file ngoài. Lúc đó chạy:

```bash
cd api-specification
npm install --no-save @apidevtools/swagger-parser js-yaml
node scripts/bundle.js
```

Lệnh này đọc `openapi.yaml` + toàn bộ file con, gộp lại thành `bundled/cab-system-openapi.yaml` — **đây là file để upload lên Swagger Catalog**, không phải file gốc nhiều mảnh.

⚠️ **Luôn sửa ở các file nhỏ trong `paths/`, `components/`, rồi chạy lại `bundle.js`. Không sửa trực tiếp file trong `bundled/` vì nó sẽ bị ghi đè lần chạy sau.**

## Đã sửa 1 lỗi từ bản gốc

Trong lúc tách file, phát hiện 2 chỗ lỗi cú pháp YAML ở bản 1-file cũ (dấu phẩy trong mô tả tiếng Việt không được đặt trong dấu ngoặc kép, khiến YAML hiểu nhầm thành field lạ):
- `POST /trips` → response `201`
- `POST /dispatch/{tripId}/decline` → response `200`

Cả 2 đã được sửa đúng trong bộ file mới này. **Bản bạn đã import vào Swagger Studio trước đó vẫn còn lỗi này** — nên import lại bằng file `bundled/cab-system-openapi.yaml` mới để thay thế.

Toàn bộ 47 path / 36 schema / 23 FR đã được đối chiếu tự động khớp 100% với bản gốc trước khi bàn giao.
