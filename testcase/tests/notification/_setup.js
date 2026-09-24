// Helper riêng cho Notification Service test: cần 1 tripId CÓ THẬT bên Trip Service,
// vì các webhook nhận event của Notification Service sẽ gọi ngược GET /trips/{id}/internal
// để lấy customerId/driverId cần gửi thông báo tới.
const { req, signCustomerToken, uuid } = require("../helpers");

async function createRealTrip() {
  const customerId = uuid();
  const customerToken = signCustomerToken(customerId);
  const tripRes = await req("POST", "/trips", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  return { tripId: tripRes.json.data.id, customerId };
}

module.exports = { createRealTrip };
