// Helper riêng cho Dispatch Service test — đây là service DUY NHẤT thực sự cần bật
// gần trọn cụm (Event Bus, Driver Service, Location Service, Trip Service, Dispatch
// Service) vì logic matching/retry là hành vi liên-service thật, không thể giả lập
// bằng JWT tự ký như các service khác.
const { req, signCustomerToken, randEmail, uuid } = require("../helpers");

async function registerAvailableDriver(lat, lng) {
  const registerRes = await req("POST", "/drivers/register", {
    body: { fullName: "Tài xế test", email: randEmail(), password: "123456", vehicle: { plate: "51T-000.00", model: "Vios", type: "4-seat" } },
  });
  const { token, driver } = registerRes.json.data;
  await req("PATCH", "/drivers/me/status", { token, body: { status: "available" } });
  await req("POST", "/locations", { token, body: { lat, lng } });
  return { driverId: driver.id, driverToken: token };
}

async function createTripRequest(pickup, dropoff, vehicleType = "4-seat") {
  const customerToken = signCustomerToken(uuid());
  const tripRes = await req("POST", "/trips", { token: customerToken, body: { pickupLocation: pickup, dropoffLocation: dropoff, vehicleType } });
  return { tripId: tripRes.json.data.id, customerToken };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { registerAvailableDriver, createTripRequest, sleep };
