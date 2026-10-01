// TC-TRIP-22 | Positive | Lịch sử chuyến của khách có giới hạn (limit) và phân trang
// Bảng chấm thực hành, mục 14: cần ít nhất 5 booking, danh sách có limit và paging.
// Mở rộng đúng phần "limit/paging" của TC-TRIP-13 (đã kiểm phần "chỉ thấy chuyến của mình").
//
// GIẢ ĐỊNH CẦN ĐỐI CHIẾU: tên tham số query "limit" và "page" — đổi lại nếu route dùng tên khác.
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-TRIP-22 | Positive | Lịch sử chuyến của khách có giới hạn (limit) và phân trang", async () => {
  const customerToken = signCustomerToken(uuid());
  const body = {
    pickupLocation: { lat: 10.77, lng: 106.7 },
    dropoffLocation: { lat: 10.78, lng: 106.69 },
    vehicleType: "4-seat",
  };
  for (let i = 0; i < 5; i++) {
    const res = await req("POST", "/trips", { token: customerToken, body });
    expect(res.status).toBe(201);
  }

  const page1 = await req("GET", "/customers/me/trips?limit=3&page=1", { token: customerToken });
  expect(page1.status).toBe(200);
  expect(page1.json.data.length).toBeLessThanOrEqual(3);

  const page2 = await req("GET", "/customers/me/trips?limit=3&page=2", { token: customerToken });
  expect(page2.status).toBe(200);

  const ids1 = page1.json.data.map((t) => t.id);
  const ids2 = page2.json.data.map((t) => t.id);
  expect(ids1.some((id) => ids2.includes(id))).toBe(false);
});
