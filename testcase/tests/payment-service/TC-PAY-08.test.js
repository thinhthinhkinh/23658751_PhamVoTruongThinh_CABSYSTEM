// TC-PAY-08 | Positive | Khách hàng chỉ xem được thanh toán của chính mình
// ⚠️ Cần Trip Service đang chạy: Payment Service forward Authorization header sang
// GET /customers/me/trips của Trip Service để lấy danh sách tripId của khách hàng.
const { req, signCustomerToken, uuid } = require("../helpers");

async function createTripAndPayment(customerToken) {
  const tripRes = await req("POST", "/trips", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.77, lng: 106.7 },
      dropoffLocation: { lat: 10.78, lng: 106.69 },
      vehicleType: "4-seat",
    },
  });
  const tripId = tripRes.json.data.id;

  await req("POST", "/payments/events/fare-calculated", {
    body: { event: "FareCalculated", payload: { tripId, amount: 50000 } },
  });
  await req("POST", "/payments", { token: customerToken, body: { tripId, method: "cash" } });
  return tripId;
}

test("TC-PAY-08 | Positive | Khách hàng chỉ xem được thanh toán của chính mình", async () => {
  const tokenA = signCustomerToken(uuid());
  const tokenB = signCustomerToken(uuid());

  const tripIdA = await createTripAndPayment(tokenA);
  await createTripAndPayment(tokenB);

  const { status, json } = await req("GET", "/customers/me/payments", { token: tokenA });

  expect(status).toBe(200);
  const tripIds = json.data.map((p) => p.tripId);
  expect(tripIds).toContain(tripIdA);
  expect(tripIds.length).toBe(1); // không lẫn giao dịch của khách hàng B
});
