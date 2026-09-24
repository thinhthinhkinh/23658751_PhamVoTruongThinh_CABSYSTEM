// Lưu danh sách subscriber theo tên event, hoàn toàn trong bộ nhớ (in-memory).
// Đây là bản mô phỏng đơn giản cho môi trường học tập/demo, thay cho Kafka/RabbitMQ thật.

const subscriptions = new Map(); // eventName -> Set<webhookUrl>

function subscribe(eventName, webhookUrl) {
  if (!subscriptions.has(eventName)) {
    subscriptions.set(eventName, new Set());
  }
  subscriptions.get(eventName).add(webhookUrl);
}

function getSubscribers(eventName) {
  return Array.from(subscriptions.get(eventName) || []);
}

function listAll() {
  const result = {};
  for (const [eventName, urls] of subscriptions.entries()) {
    result[eventName] = Array.from(urls);
  }
  return result;
}

module.exports = { subscribe, getSubscribers, listAll };
