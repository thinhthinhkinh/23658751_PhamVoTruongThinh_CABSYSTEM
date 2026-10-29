const redis = require("../config/redis");

// cab:session:{sessionId}  → Hash { userId, role, revoked }  với TTL tính từ expiresAt
// cab:user_sessions:{userId} → Set các sessionId (để revokeAll)

module.exports = {
  async create({ sessionId, userId, role, expiresAt }) {
    const ttl = Math.max(1, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
    const pipeline = redis.pipeline();
    pipeline.hset(`cab:session:${sessionId}`, "userId", userId, "role", role, "revoked", "0");
    pipeline.expire(`cab:session:${sessionId}`, ttl);
    pipeline.sadd(`cab:user_sessions:${userId}`, sessionId);
    // user_sessions set tự expire sau ttl để không tích lũy vô hạn
    pipeline.expire(`cab:user_sessions:${userId}`, ttl);
    await pipeline.exec();
  },

  async findBySessionId(sessionId) {
    const data = await redis.hgetall(`cab:session:${sessionId}`);
    if (!data || !data.userId) return null;
    return {
      sessionId,
      userId: data.userId,
      role: data.role,
      revoked: data.revoked === "1",
    };
  },

  async revoke(sessionId) {
    await redis.hset(`cab:session:${sessionId}`, "revoked", "1");
    await redis.del(`cab:token_cache:${sessionId}`);
  },

  async revokeAllForUser(userId) {
    const sessionIds = await redis.smembers(`cab:user_sessions:${userId}`);
    if (!sessionIds.length) return;
    const pipeline = redis.pipeline();
    for (const sid of sessionIds) {
      pipeline.hset(`cab:session:${sid}`, "revoked", "1");
      pipeline.del(`cab:token_cache:${sid}`);
    }
    await pipeline.exec();
  },
};
