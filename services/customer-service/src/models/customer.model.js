// Model: mô tả cấu trúc 1 bản ghi Customer lưu trong data.json (FR-01)
function createCustomer({ id, fullName, email, passwordHash, phone }) {
  const now = new Date().toISOString();
  return {
    id,
    fullName,
    email,
    passwordHash,
    phone: phone || null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

// Loại bỏ passwordHash trước khi trả về client
function toPublicJSON(customer) {
  const { passwordHash, ...rest } = customer;
  return rest;
}

module.exports = { createCustomer, toPublicJSON };
