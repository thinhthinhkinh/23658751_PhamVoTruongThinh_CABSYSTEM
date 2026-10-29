const crypto = require("crypto");

// Dùng crypto.scrypt built-in của Node để không cần thêm dependency bcrypt.
// Định dạng lưu trữ: "salt:hash" (hex).

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const hashVerify = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashVerify, "hex"));
}

module.exports = { hashPassword, verifyPassword };
