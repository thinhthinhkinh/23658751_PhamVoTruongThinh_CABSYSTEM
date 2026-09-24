const EVENT_BUS_URL = process.env.EVENT_BUS_URL || "http://localhost:4000";

// Phát 1 sự kiện lên event bus. Fire-and-forget: publisher không chờ subscriber
// xử lý xong, tránh việc 1 service lỗi làm ảnh hưởng luồng chính.
async function publish(event, payload) {
  try {
    await fetch(`${EVENT_BUS_URL}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
    });
  } catch (err) {
    console.error(`[event-bus-client] publish "${event}" thất bại:`, err.message);
  }
}

// Đăng ký nhận 1 loại sự kiện, kèm webhook nội bộ của chính service này.
async function subscribe(event, webhookUrl) {
  try {
    await fetch(`${EVENT_BUS_URL}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, webhookUrl }),
    });
    console.log(`[event-bus-client] đã subscribe "${event}" -> ${webhookUrl}`);
  } catch (err) {
    console.error(`[event-bus-client] subscribe "${event}" thất bại:`, err.message);
  }
}

module.exports = { publish, subscribe };
