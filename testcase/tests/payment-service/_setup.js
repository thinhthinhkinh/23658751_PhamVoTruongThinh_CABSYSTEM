// Helper riêng cho Payment Service test: "bơm" sẵn số tiền cần thanh toán cho 1 tripId
// bằng cách gọi thẳng webhook nội bộ /payments/events/fare-calculated — mô phỏng đúng
// việc Trip Service publish event FareCalculated qua event bus, nhưng không cần bật
// Trip Service/Pricing Service/Event Bus chỉ để test Payment Service.
const { req, uuid } = require("../helpers");

async function seedFare(amount = 70000) {
  const tripId = uuid();
  await req("POST", "/payments/events/fare-calculated", {
    body: { event: "FareCalculated", payload: { tripId, amount } },
  });
  return tripId;
}

module.exports = { seedFare };
