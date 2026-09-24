// Model: 1 thông báo đã gửi cho khách hàng/tài xế (FR-17, FR-18)
function createNotification({ id, userId, userRole, channel, title, body }) {
  return {
    id,
    userId,
    userRole, // "customer" | "driver"
    channel,
    title,
    body,
    sentAt: new Date().toISOString(),
  };
}

// FR-19: kênh thông báo — kiến trúc plug-in, thêm kênh mới không cần sửa code cũ
function createChannel({ name, type }) {
  return { name, type, addedAt: new Date().toISOString() };
}

module.exports = { createNotification, createChannel };
