const notificationDao = require("../daos/notification.dao");
const channelDao = require("../daos/channel.dao");
const AppError = require("../utils/AppError");

const { grpcCall, bookingClient } = require("../utils/grpcClient");
const DEFAULT_CHANNEL = "push";

async function send({ userId, userRole, title, body, channel = DEFAULT_CHANNEL }) {
  const notification = await notificationDao.insert({ userId, userRole, channel, title, body });
  console.log(`[notification-service] -> ${userRole} ${userId} [${channel}] ${title}: ${body}`);
  return notification;
}

async function getMyNotifications(userId) {
  return notificationDao.findByUserId(userId);
}

async function addChannel({ name, type }) {
  if (!name || !type) throw new AppError(400, "INVALID_INPUT", "name và type là bắt buộc");
  return channelDao.insert({ name, type });
}

async function listChannels() {
  return channelDao.findAll();
}

async function getBookingInternal(bookingId) {
  const body = await grpcCall(bookingClient, "GetBookingInternal", { bookingId }).catch(() => null);
  return body?.data || null;
}

async function onDriverAssigned(payload) {
  const booking = await getBookingInternal(payload.bookingId);
  if (!booking) return;
  await send({
    userId: booking.customerId,
    userRole: "customer",
    title: "Đã tìm thấy tài xế",
    body: `Tài xế đang trên đường đến đón bạn, dự kiến đến sau ${payload.eta || "vài"} phút.`,
  });
}

async function onNoDriverFound(payload) {
  const booking = await getBookingInternal(payload.bookingId);
  if (!booking) return;
  await send({
    userId: booking.customerId,
    userRole: "customer",
    title: "Không tìm được tài xế",
    body: "Hiện chưa tìm được tài xế phù hợp cho booking của bạn, vui lòng thử lại sau.",
  });
}

async function onBookingStatusChanged(payload) {
  const booking = await getBookingInternal(payload.bookingId);
  if (!booking) return;
  const statusText = {
    arrived: "Tài xế đã đến điểm đón",
    picked_up: "Tài xế đã đón bạn, chuyến đi bắt đầu",
    in_progress: "Chuyến đi đang diễn ra",
  }[payload.status];
  if (!statusText) return;
  await send({ userId: booking.customerId, userRole: "customer", title: "Cập nhật booking", body: statusText });
}

async function onBookingCompleted(payload) {
  const booking = await getBookingInternal(payload.bookingId);
  if (!booking) return;
  await send({ userId: booking.customerId, userRole: "customer", title: "Chuyến đi hoàn thành", body: "Cảm ơn bạn đã sử dụng dịch vụ. Vui lòng đánh giá tài xế." });
  if (booking.driverId) {
    await send({ userId: booking.driverId, userRole: "driver", title: "Chuyến đi hoàn thành", body: "Bạn đã hoàn thành chuyến đi." });
  }
}

async function onPaymentCompleted(payload) {
  const booking = await getBookingInternal(payload.bookingId);
  if (!booking) return;
  await send({ userId: booking.customerId, userRole: "customer", title: "Thanh toán thành công", body: `Thanh toán cho booking của bạn (${payload.method}) đã hoàn tất.` });
}

async function onPaymentFailed(payload) {
  const booking = await getBookingInternal(payload.bookingId);
  if (!booking) return;
  await send({ userId: booking.customerId, userRole: "customer", title: "Thanh toán thất bại", body: `Giao dịch thất bại: ${payload.reason || "vui lòng thử lại"}.` });
}

module.exports = {
  send,
  getMyNotifications,
  addChannel,
  listChannels,
  onDriverAssigned,
  onNoDriverFound,
  onBookingStatusChanged,
  onBookingCompleted,
  onPaymentCompleted,
  onPaymentFailed,
};
