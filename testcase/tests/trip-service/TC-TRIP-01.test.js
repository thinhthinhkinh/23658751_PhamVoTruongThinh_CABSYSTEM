// TC-TRIP-01 | Positive | Khách hàng tạo yêu cầu đặt xe hợp lệ
const { req, signCustomerToken, uuid } = require("../helpers");

test("TC-TRIP-01 | Positive | Khách hàng tạo yêu cầu đặt xe hợp lệ", async () => {
  const customerToken = signCustomerToken(uuid());
  const { status, json } = await req("POST", "/trips", {
    token: customerToken,
    body: {
      pickupLocation: { lat: 10.7769, lng: 106.7009 },
      dropoffLocation: { lat: 10.7829, lng: 106.6934 },
      vehicleType: "4-seat",
    },
  });

  expect(status).toBe(201);
  expect(json.data.status).toBe("finding_driver");
  expect(json.data.id).toBeDefined();
});
