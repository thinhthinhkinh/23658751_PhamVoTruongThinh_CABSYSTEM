require("dotenv").config();
const BASE = "http://localhost:3000/api/v1";

let passed = 0, failed = 0;
function check(label, cond, extra = "") {
  if (cond) { passed++; console.log(`✅ ${label}`); }
  else { failed++; console.log(`❌ ${label} ${extra}`); }
}
async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = () => Math.random().toString(36).slice(2, 8);

async function registerCustomer() {
  const email = `cust_${rand()}@test.com`;
  const r = await req("POST", "/customers/register", { body: { fullName: "KH Test", email, password: "123456" } });
  return { token: r.json.data.token, id: r.json.data.customer.id };
}
async function registerDriver(plate) {
  const email = `drv_${rand()}@test.com`;
  const r = await req("POST", "/drivers/register", {
    body: { fullName: "TX Test", email, password: "123456", vehicle: { plate, model: "Vios", type: "4-seat" } },
  });
  return { token: r.json.data.token, id: r.json.data.driver.id };
}

async function main() {
  const pickup = { lat: 10.77, lng: 106.70 };
  const dropoff = { lat: 10.78, lng: 106.69 };

  console.log("\n===== CASE A: Tài xế đầu từ chối -> hệ thống tự chuyển tài xế khác (FR-08) =====");
  const customer = await registerCustomer();
  const driverA = await registerDriver("51A-111.11");
  const driverB = await registerDriver("51B-222.22");

  await req("PATCH", "/drivers/me/status", { token: driverA.token, body: { status: "available" } });
  await req("PATCH", "/drivers/me/status", { token: driverB.token, body: { status: "available" } });
  // driverA gần hơn -> sẽ được đề xuất trước
  await req("POST", "/locations", { token: driverA.token, body: { lat: pickup.lat + 0.001, lng: pickup.lng } });
  await req("POST", "/locations", { token: driverB.token, body: { lat: pickup.lat + 0.02, lng: pickup.lng } });

  const tripRes = await req("POST", "/trips", { token: customer.token, body: { pickupLocation: pickup, dropoffLocation: dropoff, vehicleType: "4-seat" } });
  const tripId = tripRes.json.data.id;
  await sleep(1200);

  const offerA = await req("GET", "/dispatch/drivers/me/pending", { token: driverA.token });
  check("driverA (gần hơn) được đề xuất trước", offerA.json?.data?.tripId === tripId, JSON.stringify(offerA.json));

  const declineRes = await req("POST", `/dispatch/${tripId}/decline`, { token: driverA.token });
  check("driverA từ chối thành công", declineRes.status === 200);
  await sleep(800);

  const offerB = await req("GET", "/dispatch/drivers/me/pending", { token: driverB.token });
  check("Hệ thống tự động chuyển sang driverB mà KHÔNG cần khách tạo lại yêu cầu", offerB.json?.data?.tripId === tripId, JSON.stringify(offerB.json));

  const acceptB = await req("POST", `/dispatch/${tripId}/accept`, { token: driverB.token });
  check("driverB chấp nhận chuyến", acceptB.status === 200 && acceptB.json?.data?.driverId === driverB.id);

  await sleep(500);
  const finalTrip = await req("GET", `/trips/${tripId}`, { token: customer.token });
  check("Trip cuối cùng gán đúng driverB (không phải driverA)", finalTrip.json?.data?.driverId === driverB.id, JSON.stringify(finalTrip.json?.data));

  console.log("\n===== CASE B: Không có tài xế nào sẵn sàng -> NoDriverFound (FR-09) =====");
  const customer2 = await registerCustomer();
  const trip2Res = await req("POST", "/trips", { token: customer2.token, body: { pickupLocation: { lat: -10, lng: -70 }, dropoffLocation: dropoff, vehicleType: "7-seat" } });
  const trip2Id = trip2Res.json.data.id;
  await sleep(1200);
  const trip2After = await req("GET", `/trips/${trip2Id}`, { token: customer2.token });
  check("Không tìm được tài xế -> status no_driver_found", trip2After.json?.data?.status === "no_driver_found", JSON.stringify(trip2After.json?.data));

  console.log(`\n===== KẾT QUẢ: ${passed} PASS / ${failed} FAIL =====`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
