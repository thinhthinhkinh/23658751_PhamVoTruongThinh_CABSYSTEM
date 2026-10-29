const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => console.error("[payment-service] Redis error:", err.message));
redis.on("connect", () => console.log("[payment-service] đã kết nối Redis"));

module.exports = redis;
