// TC-GATE-03 | Negative | Spam API liên tục phải được giới hạn tần suất (rate limit)
// Bảng chấm thực hành, mục 29: attacker gửi >1000 request/giây tới POST /booking (ở đây là
// POST /trips) -> kỳ vọng 429 Too Many Requests, hệ thống không sập.
//
// CHƯA RÕ hệ thống có cấu hình rate limit hay không — README (mục "Giới hạn đã biết của bản
// demo") không nhắc middleware này. Nếu chưa có, test dự kiến FAIL và đây là gap thật cần bổ
// sung (ví dụ express-rate-limit ở API Gateway), không phải lỗi viết test.
//
// N=100 thay vì >1000/giây thật như bảng chấm: đủ để phát hiện rate limit ở ngưỡng thường gặp
// trong đồ án (vài chục request/phút hoặc /giây), tránh làm treo môi trường test cục bộ. Tăng
// N nếu ngưỡng cấu hình thật cao hơn.
const { req, signCustomerToken, uuid } = require("../helpers");

test(
  "TC-GATE-03 | Negative | Spam API liên tục phải được giới hạn tần suất (rate limit)",
  async () => {
    const customerToken = signCustomerToken(uuid());
    const body = {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    };

    const N = 100;
    const results = await Promise.all(
      Array.from({ length: N }, () => req("POST", "/trips", { token: customerToken, body }))
    );

    const rateLimitedCount = results.filter((r) => r.status === 429).length;
    expect(rateLimitedCount).toBeGreaterThan(0);

    // Hệ thống phải vẫn phản hồi bình thường ngay sau đợt spam, không bị sập (500 hoặc không phản hồi).
    const after = await req("POST", "/trips", { token: customerToken, body });
    expect([200, 201, 429]).toContain(after.status);
  },
  30000 // burst 100 request cần thời gian hơn một test thông thường
);
