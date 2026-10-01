// TC-CUST-21 | Negative | Mật khẩu khách hàng lưu trong DB không được ở dạng plaintext
// Bảng chấm thực hành, mục 24: attacker truy cập trực tiếp DB, xem dữ liệu nhạy cảm.
//
// Hệ thống CAB dùng MongoDB (docker compose), không phải file JSON — khác với mô tả
// ban đầu trong README. Test kết nối trực tiếp tới MongoDB container để kiểm tra.
//
// GIẢ ĐỊNH CẦN ĐỐI CHIẾU:
//   - MongoDB cổng mặc định 27017, localhost (port-forward từ container ra host)
//   - Database tên "cab-system" hoặc "customer-service" — thử cả hai, lấy cái có collection
//   - Collection tên "customers" — thử thêm "users" nếu không thấy
//   SỬA MONGO_URI hoặc DB_NAME/COLLECTION nếu cấu hình thật khác.
//
// Yêu cầu: npm install --save-dev mongodb (chỉ cần cài 1 lần trong thư mục testcase/)
const { MongoClient } = require("mongodb");
const { req, randEmail } = require("../helpers");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

// thử danh sách tên DB và collection phổ biến theo thứ tự ưu tiên
const CANDIDATES = [
  { db: "customer_db",      col: "customers" },  // tên thật trong hệ thống CAB
  { db: "cab-system",       col: "customers" },
  { db: "customer-service", col: "customers" },
  { db: "cab-system",       col: "users"     },
  { db: "customer_service", col: "customers" },
];

async function findInMongo(email) {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    for (const { db, col } of CANDIDATES) {
      const record = await client.db(db).collection(col).findOne({ email });
      if (record) return record;
    }
    // nếu không tìm thấy, liệt kê tất cả DB và collection có sẵn để debug
    const adminDb = client.db("admin");
    const dbs = (await adminDb.admin().listDatabases()).databases.map((d) => d.name);
    const details = [];
    for (const dbName of dbs.filter((n) => !["admin","config","local"].includes(n))) {
      const cols = (await client.db(dbName).listCollections().toArray()).map((c) => c.name);
      details.push(`${dbName}:[${cols.join(",")}]`);
    }
    throw new Error(
      `TC-CUST-21: đã đăng ký email ${email} nhưng không tìm thấy bản ghi ở MongoDB. ` +
      `DB và collection đang có: ${details.join(" | ")}. ` +
      `Sửa CANDIDATES ở đầu file cho đúng tên.`
    );
  } finally {
    await client.close();
  }
}

test(
  "TC-CUST-21 | Negative | Mật khẩu khách hàng lưu trong DB không được ở dạng plaintext",
  async () => {
    const email = randEmail("tc_cust_21");
    const plainPassword = "Test@123400";

    const regRes = await req("POST", "/customers/register", {
      body: { fullName: "Test Encryption", email, password: plainPassword },
    });
    expect(regRes.status).toBe(201);

    const record = await findInMongo(email);
    const stored = record.password ?? record.passwordHash ?? record.hashedPassword;

    expect(stored).toBeDefined();
    expect(stored).not.toBe(plainPassword);
    // hash bcrypt thường bắt đầu bằng $2a$ hoặc $2b$ và dài 60 ký tự
    expect(stored.length).toBeGreaterThan(plainPassword.length);
  },
  15000
);