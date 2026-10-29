const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const credentialDao = require("../daos/credential.dao");
const sessionDao = require("../daos/session.dao");
const redis = require("../config/redis");

const SECRET = process.env.JWT_SECRET || "cab-system-super-secret-key-change-me";
const TOKEN_TTL_DAYS = 7;
// Kết quả validateToken được cache ngắn để tránh lookup Redis session mỗi request.
// Khi logout, cache bị xóa ngay trong session.dao.revoke → revocation có hiệu lực tức thì.
const TOKEN_CACHE_TTL = 60; // giây

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return derived === hash;
}

module.exports = {
  async registerCredentials({ userId, email, password, role }) {
    const existing = await credentialDao.findByEmailAndRole(email, role);
    if (existing) {
      const err = new Error("Email đã được đăng ký");
      err.code = "EMAIL_ALREADY_EXISTS";
      err.status = 409;
      throw err;
    }
    const passwordHash = hashPassword(password);
    await credentialDao.create({ userId, email, role, passwordHash });
    return { userId, email, role };
  },

  async loginByEmail({ email, password }) {
    const credential = await credentialDao.findByEmail(email);
    if (!credential) {
      const err = new Error("Email hoặc mật khẩu không đúng");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }
    if (!verifyPassword(password, credential.passwordHash)) {
      const err = new Error("Email hoặc mật khẩu không đúng");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }
    const role = credential.role;
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await sessionDao.create({ sessionId, userId: credential.userId, role, expiresAt });
    const token = jwt.sign(
      { id: credential.userId, role, sessionId },
      SECRET,
      { expiresIn: `${TOKEN_TTL_DAYS}d` }
    );
    return { token, userId: credential.userId, role };
  },

  async validateToken(token) {
    try {
      const payload = jwt.verify(token, SECRET);
      // Token không có sessionId (register token / test token) → chỉ verify chữ ký
      if (!payload.sessionId) {
        return { valid: true, userId: payload.id || "", role: payload.role || "" };
      }

      // Kiểm tra token cache trước (tránh lookup session store mỗi request)
      const cacheKey = `cab:token_cache:${payload.sessionId}`;
      const cached = await redis.get(cacheKey);
      if (cached === "revoked") {
        return { valid: false, userId: "", role: "" };
      }
      if (cached) {
        const [userId, role] = cached.split("|");
        return { valid: true, userId, role };
      }

      // Cache miss → tra session store (Redis)
      const session = await sessionDao.findBySessionId(payload.sessionId);
      if (!session || session.revoked) {
        await redis.setex(cacheKey, TOKEN_CACHE_TTL, "revoked");
        return { valid: false, userId: "", role: "" };
      }

      // Lưu kết quả hợp lệ vào cache
      await redis.setex(cacheKey, TOKEN_CACHE_TTL, `${payload.id}|${payload.role}`);
      return { valid: true, userId: payload.id || "", role: payload.role || "" };
    } catch {
      return { valid: false, userId: "", role: "" };
    }
  },

  async revokeToken(token) {
    try {
      const payload = jwt.verify(token, SECRET);
      if (payload.sessionId) {
        // session.dao.revoke tự xóa token_cache luôn
        await sessionDao.revoke(payload.sessionId);
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  },
};
