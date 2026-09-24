// Test end-to-end toàn bộ luồng: đăng ký -> đặt xe -> matching -> hoàn thành -> thanh toán
// -> thông báo -> đánh giá -> báo cáo admin. Chạy qua API Gateway (http://localhost:3000/api/v1)
// để test luôn cả phần routing của Gateway.
require("dotenv").config();
const jwt = require("jsonwebtoken");

const BASE = "http://localhost:3000/api/v1";
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

let passed = 0;
let failed = 0;

function check(label, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`✅ ${label}`);
  } else {
    failed++;
    console.log(`❌ ${label} ${extra}`);
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const rand = () => Math.random().toString(36).slice(2, 8);

async function main() {
  console.log("\n===== 1. ĐĂNG KÝ TÀI KHOẢN =====");
  const custEmail = `customer_${rand()}@test.com`;
  const custRes = await req("POST", "/customers/register", {
    body: { fullName: "Nguyễn Văn A", email: custEmail, password: "123456", phone: "0900000001" },
  });
  check("Đăng ký khách hàng (FR-01)", custRes.status === 201 && custRes.json?.data?.token, JSON.stringify(custRes.json));
  const customerToken = custRes.json?.data?.token;
  const customerId = custRes.json?.data?.customer?.id;

  const driverEmail = `driver_${rand()}@test.com`;
  const driverRes = await req("POST", "/drivers/register", {
    body: {
      fullName: "Trần Văn B",
      email: driverEmail,
      password: "123456",
      phone: "0900000002",
      vehicle: { plate: "51H-999.99", model: "Toyota Vios", type: "4-seat" },
    },
  });
  check("Đăng ký tài xế (FR-02)", driverRes.status === 201 && driverRes.json?.data?.token, JSON.stringify(driverRes.json));
  const driverToken = driverRes.json?.data?.token;
  const driverId = driverRes.json?.data?.driver?.id;

  console.log("\n===== 2. TÀI XẾ SẴN SÀNG & GỬI VỊ TRÍ =====");
  const statusRes = await req("PATCH", "/drivers/me/status", { token: driverToken, body: { status: "available" } });
  check("Tài xế chuyển trạng thái available (FR-11)", statusRes.status === 200 && statusRes.json?.data?.status === "available");

  const pickup = { lat: 10.7769, lng: 106.7009 };
  const dropoff = { lat: 10.7829, lng: 106.6934 };
  const locRes = await req("POST", "/locations", { token: driverToken, body: { lat: pickup.lat + 0.001, lng: pickup.lng + 0.001 } });
  check("Tài xế gửi vị trí (FR-10)", locRes.status === 200);

  console.log("\n===== 3. KHÁCH ĐẶT XE =====");
  const tripRes = await req("POST", "/trips", {
    token: customerToken,
    body: { pickupLocation: pickup, dropoffLocation: dropoff, vehicleType: "4-seat" },
  });
  check("Tạo yêu cầu đặt xe (FR-03)", tripRes.status === 201 && tripRes.json?.data?.status === "finding_driver", JSON.stringify(tripRes.json));
  const tripId = tripRes.json?.data?.id;

  console.log("\n===== 4. CHỜ DISPATCH TÌM TÀI XẾ (event bus xử lý bất đồng bộ) =====");
  await sleep(1500);
  const pendingRes = await req("GET", "/dispatch/drivers/me/pending", { token: driverToken });
  check("Tài xế nhận được đề xuất chuyến (FR-06,07)", pendingRes.status === 200 && pendingRes.json?.data?.tripId === tripId, JSON.stringify(pendingRes.json));

  const acceptRes = await req("POST", `/dispatch/${tripId}/accept`, { token: driverToken });
  check("Tài xế chấp nhận chuyến (FR-12)", acceptRes.status === 200 && acceptRes.json?.data?.driverId === driverId, JSON.stringify(acceptRes.json));

  await sleep(500);
  const tripAfterAssign = await req("GET", `/trips/${tripId}`, { token: customerToken });
  check("Trip Service cập nhật driver_assigned qua event (FR-04)", tripAfterAssign.json?.data?.status === "driver_assigned", JSON.stringify(tripAfterAssign.json));

  console.log("\n===== 5. THỰC HIỆN CHUYẾN ĐI =====");
  const steps = ["arrived", "picked_up", "in_progress"];
  for (const s of steps) {
    const r = await req("PATCH", `/trips/${tripId}/status`, { token: driverToken, body: { status: s } });
    check(`Tài xế cập nhật trạng thái "${s}" (FR-13)`, r.status === 200 && r.json?.data?.status === s, JSON.stringify(r.json));
  }

  const completeRes = await req("PATCH", `/trips/${tripId}/status`, {
    token: driverToken,
    body: { status: "completed", distanceKm: 5, durationMin: 15 },
  });
  check(
    "Hoàn thành chuyến, có fareAmount (FR-13, FR-14)",
    completeRes.status === 200 && completeRes.json?.data?.status === "completed" && typeof completeRes.json?.data?.fareAmount === "number",
    JSON.stringify(completeRes.json)
  );
  const fareAmount = completeRes.json?.data?.fareAmount;

  console.log("\n===== 6. THANH TOÁN =====");
  await sleep(800); // chờ event FareCalculated tới Payment Service
  const payRes = await req("POST", "/payments", { token: customerToken, body: { tripId, method: "cash" } });
  check("Tạo & xử lý thanh toán tiền mặt (FR-15)", payRes.status === 201 && payRes.json?.data?.status === "success", JSON.stringify(payRes.json));
  check("Số tiền thanh toán khớp fareAmount", payRes.json?.data?.amount === fareAmount);

  console.log("\n===== 7. THÔNG BÁO =====");
  await sleep(500);
  const custNotiRes = await req("GET", "/notifications/me", { token: customerToken });
  check("Khách hàng có lịch sử thông báo (FR-17)", custNotiRes.status === 200 && custNotiRes.json?.data?.length > 0, JSON.stringify(custNotiRes.json));

  console.log("\n===== 8. ĐÁNH GIÁ =====");
  const ratingRes = await req("POST", `/trips/${tripId}/rating`, { token: customerToken, body: { score: 5, comment: "Tài xế thân thiện" } });
  check("Khách hàng đánh giá tài xế (FR-05)", ratingRes.status === 201 && ratingRes.json?.data?.score === 5, JSON.stringify(ratingRes.json));

  const ratingListRes = await req("GET", `/drivers/${driverId}/ratings`, {});
  check("Xem điểm trung bình tài xế", ratingListRes.json?.data?.averageScore === 5, JSON.stringify(ratingListRes.json));

  console.log("\n===== 9. ADMIN / BÁO CÁO (FR-20..FR-23) =====");
  const adminToken = jwt.sign({ id: "staff-demo-1", role: "ops_admin" }, SECRET, { expiresIn: "1h" });

  const adminTrips = await req("GET", "/admin/trips", { token: adminToken });
  check("Admin xem danh sách chuyến (FR-21)", adminTrips.status === 200 && adminTrips.json?.data?.some((t) => t.id === tripId), JSON.stringify(adminTrips.json?.data?.length));

  const adminTx = await req("GET", "/admin/transactions", { token: adminToken });
  check("Admin tra cứu giao dịch (FR-21)", adminTx.status === 200 && adminTx.json?.data?.length > 0);

  const revenueRes = await req("GET", "/admin/reports/revenue", { token: adminToken });
  check("Báo cáo doanh thu > 0 (FR-23)", revenueRes.status === 200 && revenueRes.json?.data?.value >= fareAmount, JSON.stringify(revenueRes.json));

  const perfRes = await req("GET", "/admin/reports/driver-performance", { token: adminToken });
  check(
    "Báo cáo hiệu quả tài xế có averageRating (FR-23)",
    perfRes.status === 200 && perfRes.json?.data?.some((d) => d.driverId === driverId && d.averageRating === 5),
    JSON.stringify(perfRes.json)
  );

  console.log(`\n===== KẾT QUẢ: ${passed} PASS / ${failed} FAIL =====`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Lỗi khi chạy test:", err);
  process.exit(1);
});
