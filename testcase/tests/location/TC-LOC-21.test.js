// TC-LOC-21 | Positive | Danh sách tài xế quanh bán kính có giới hạn (limit) và phân trang
// Bảng chấm thực hành, mục 13: cần ít nhất 5 tài xế trạng thái khác nhau, bán kính 1km, danh
// sách có limit và paging.
//
// Chỉ đăng ký tài xế ở trạng thái "khác nhau" theo đúng nghĩa VỊ TRÍ đăng ký (Location Service
// không lưu status sẵn sàng — đó là của Driver Service); ở đây tập trung đúng phần bảng chấm
// hỏi: limit + paging, không lặp lại phần "trạng thái" đã có ở test khác.
//
// GIẢ ĐỊNH CẦN ĐỐI CHIẾU: tên tham số query "limit" và "page" (có thể là "offset" thay vì
// "page" tùy cách cài đặt thật) — đổi lại nếu route dùng tên khác.
const { req, signDriverToken, uuid } = require("../helpers");

async function registerDriverAt(lat, lng) {
  const token = signDriverToken(uuid());
  // Location Service không xác minh driver có thật ở Driver Service (theo helpers.js), nên
  // gọi thẳng POST /locations bằng token tự ký là đủ cho test này.
  await req("POST", "/locations", { token, body: { lat, lng } });
  return token;
}

test("TC-LOC-21 | Positive | Danh sách tài xế quanh bán kính có giới hạn (limit) và phân trang", async () => {
  const CENTER = { lat: 10.77, lng: 106.7 };
  // 5 tài xế rất gần trung tâm, chắc chắn trong bán kính 1km
  for (let i = 0; i < 5; i++) {
    await registerDriverAt(CENTER.lat + i * 0.001, CENTER.lng);
  }

  const page1 = await req(
    "GET",
    `/locations/nearby-drivers?lat=${CENTER.lat}&lng=${CENTER.lng}&radiusKm=1&limit=3&page=1`
  );
  expect(page1.status).toBe(200);
  expect(page1.json.data.length).toBeLessThanOrEqual(3);

  const page2 = await req(
    "GET",
    `/locations/nearby-drivers?lat=${CENTER.lat}&lng=${CENTER.lng}&radiusKm=1&limit=3&page=2`
  );
  expect(page2.status).toBe(200);

  // hai trang không được trùng tài xế
  const ids1 = page1.json.data.map((d) => d.driverId ?? d.id);
  const ids2 = page2.json.data.map((d) => d.driverId ?? d.id);
  expect(ids1.some((id) => ids2.includes(id))).toBe(false);
});
