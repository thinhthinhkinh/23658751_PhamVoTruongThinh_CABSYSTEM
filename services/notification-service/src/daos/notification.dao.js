const { Notification } = require("../models/notification.model");

function findByUserId(userId) {
  return Notification.find({ userId }).sort({ sentAt: -1 });
}

async function insert(notificationData) {
  const notification = new Notification(notificationData);
  await notification.save();
  return notification;
}

module.exports = { findByUserId, insert };