// TC-TRIP-21 | Negative | Bình luận đánh giá chứa script không được lưu/trả về nguyên trạng
// Bảng chấm thực hành, mục 26: gửi <script>alert('hack')</script> vào 1 trường input, kỳ vọng
// script không thực thi và output được escape.
//
// Chọn trường "comment" của đánh giá (POST /trips/:id/rating) vì đây là dữ liệu người dùng
// nhập, được LƯU LẠI và TRẢ VỀ cho người khác xem (tài xế xem đánh giá của mình qua
// GET /drivers/{driverId}/ratings) — đúng kịch bản rủi ro thật của stored XSS, không chỉ kiểm
// tra ở mức "API không crash".
//
// GIẢ ĐỊNH CẦN ĐỐI CHIẾU: path GET /drivers/{driverId}/ratings (đã dùng ở đặc tả TC-TRIP cũ,
// chưa thấy trong file mẫu thật) — đổi lại nếu route khác.
//
// Test chấp nhận 1 trong 2 cách phòng thủ hợp lệ: (a) lưu nguyên nhưng ESCAPE khi trả về
// (&lt;script&gt;...), hoặc (b) LOẠI BỎ thẻ script khỏi nội dung trước khi lưu. Cả hai đều
// khiến trình duyệt không thể thực thi được script khi hiển thị lại.
const { req } = require("../helpers");
const { createCompletedTrip } = require("./_setup");

test("TC-TRIP-21 | Negative | Bình luận đánh giá chứa script không được lưu/trả về nguyên trạng", async () => {
  const { tripId, customerToken, driverId } = await createCompletedTrip();
  const xssPayload = "<script>alert('hack')</script>";

  const ratingRes = await req("POST", `/trips/${tripId}/rating`, {
    token: customerToken,
    body: { score: 5, comment: xssPayload },
  });
  expect(ratingRes.status).toBe(201);

  const listRes = await req("GET", `/drivers/${driverId}/ratings`, { token: customerToken });
  expect(listRes.status).toBe(200);

  const saved = (listRes.json.data.ratings ?? listRes.json.data).find((r) => r.tripId === tripId);
  expect(saved).toBeDefined();

  // Không được còn nguyên thẻ <script> thực thi được — phải escape hoặc đã bị loại bỏ.
  expect(saved.comment).not.toContain("<script>");
});
