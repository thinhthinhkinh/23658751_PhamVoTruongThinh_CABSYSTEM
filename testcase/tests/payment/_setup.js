// Helper riêng cho Payment Service test: "bơm" sẵn số tiền cần thanh toán cho 1 bookingId
// bằng cách gọi thẳng webhook nội bộ /payments/events/fare-calculated — mô phỏng đúng
// việc Trip Service publish event FareCalculated qua event bus, nhưng không cần bật
// Trip Service/Pricing Service/Event Bus chỉ để test Payment Service.
const { req, uuid } = require("../helpers");

async function seedFare(amount = 70000) {
  const bookingId = uuid();
  await req("POST", "/payments/events/fare-calculated", {
    body: { event: "FareCalculated", payload: { bookingId, amount } },
  });
  return bookingId;
}

module.exports = { seedFare };
