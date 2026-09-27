const repo = require("../repositories/notification.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const getMine = asyncHandler(async (req, res) => {
  const notifications = await repo.getMyNotifications(req.user.id);
  return okList(res, notifications);
});

const addChannel = asyncHandler(async (req, res) => {
  const channel = await repo.addChannel(req.body);
  return ok(res, channel, 201);
});

const onEvent = (handlerName) =>
  asyncHandler(async (req, res) => {
    await repo[handlerName](req.body.payload);
    return res.status(200).json({ received: true });
  });

module.exports = {
  getMine,
  addChannel,
  onDriverAssigned: onEvent("onDriverAssigned"),
  onNoDriverFound: onEvent("onNoDriverFound"),
  onTripStatusChanged: onEvent("onTripStatusChanged"),
  onTripCompleted: onEvent("onTripCompleted"),
  onPaymentCompleted: onEvent("onPaymentCompleted"),
  onPaymentFailed: onEvent("onPaymentFailed"),
};