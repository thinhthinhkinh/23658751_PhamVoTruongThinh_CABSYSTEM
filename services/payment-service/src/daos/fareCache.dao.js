const redis = require("../config/redis");

// cab:fare:{bookingId} → giá trị cước (số, dạng string) với TTL 24h
// Được populate từ sự kiện RabbitMQ FareCalculated, phục vụ payment khi POST /payments

const FARE_CACHE_TTL = 24 * 60 * 60; // 24 giờ

async function findByBookingId(bookingId) {
  const val = await redis.get(`cab:fare:${bookingId}`);
  if (val === null) return null;
  return { bookingId, amount: parseFloat(val) };
}

async function upsert(bookingId, amount) {
  await redis.setex(`cab:fare:${bookingId}`, FARE_CACHE_TTL, String(amount));
  return { bookingId, amount };
}

module.exports = { findByBookingId, upsert };
