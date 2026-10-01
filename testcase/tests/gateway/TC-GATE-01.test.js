// TC-GATE-01 | Positive | Gateway trả đúng trạng thái /health, /ready, /health/services
// Bảng chấm thực hành, mục 6. Ba endpoint này thường nằm ở GỐC domain (không qua tiền tố
// /api/v1 mà helpers.req() mặc định thêm vào — khớp đúng cách README hướng dẫn kiểm tra:
// "curl http://localhost:3000/health", không phải ".../api/v1/health"), nên không dùng req()
// có sẵn mà gọi fetch trực tiếp tới gốc.
//
// TÁCH THÀNH 3 TEST ĐỘC LẬP (01/10/2026, sau lần chạy thật đầu tiên): ban đầu gộp cả ba vào
// 1 test, nhưng khi /ready fail thì không biết /health/services có hoạt động hay không vì
// test dừng ngay ở assertion đầu tiên bị fail. Tách riêng để mỗi endpoint tự báo cáo kết quả
// của mình, không bị che bởi cái fail trước.
//
// GIẢ ĐỊNH CẦN ĐỐI CHIẾU LẠI (README không mô tả response body của /ready, /health/services):
//   - /health/services: giả định trả về danh sách trạng thái từng service phía sau, tên
//     trường có thể là "services" hoặc "data" — đối chiếu lại đúng tên trường thật.
const { BASE } = require("../helpers");
const ROOT = BASE.replace(/\/api\/v1$/, "");

async function getRoot(path) {
  const res = await fetch(`${ROOT}${path}`);
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

test("TC-GATE-01a | Positive | Gateway trả đúng trạng thái /health", async () => {
  const health = await getRoot("/health");
  expect(health.status).toBe(200);
});

test("TC-GATE-01b | Positive | Gateway trả đúng trạng thái /ready", async () => {
  const ready = await getRoot("/ready");
  expect(ready.status).toBe(200);
});

test("TC-GATE-01c | Positive | Gateway trả đúng trạng thái /health/services", async () => {
  const healthServices = await getRoot("/health/services");
  expect(healthServices.status).toBe(200);
  const list = healthServices.json?.services ?? healthServices.json?.data;
  expect(Array.isArray(list)).toBe(true);
  // Kỳ vọng đủ 10 mục phía sau (event-bus + 9 service); nới lỏng thành ">= 9" để không vỡ
  // test nếu event-bus không được liệt kê chung danh sách này.
  expect(list.length).toBeGreaterThanOrEqual(9);
});