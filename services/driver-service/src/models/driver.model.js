// Model: cấu trúc 1 bản ghi Driver (FR-02, FR-11)
// status: "offline" | "available" | "busy"
function createDriver({ id, fullName, email, passwordHash, phone, vehicle, createdByStaff }) {
  const now = new Date().toISOString();
  return {
    id,
    fullName,
    email,
    passwordHash,
    phone: phone || null,
    vehicle: vehicle || null, // { plate, model, type }
    status: "offline",
    active: true,
    createdByStaff: !!createdByStaff, // true nếu do nhân viên vận hành tạo (FR-02)
    createdAt: now,
    updatedAt: now,
  };
}

function toPublicJSON(driver) {
  const { passwordHash, ...rest } = driver;
  return rest;
}

module.exports = { createDriver, toPublicJSON };
