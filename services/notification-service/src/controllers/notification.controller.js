const repo = require("../repositories/notification.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// GET /notifications/me — FR-17, FR-18
const getMine = asyncHandler(async (req, res) => {
  return okList(res, repo.getMyNotifications(req.user.id));
});

// POST /notifications/channels — FR-19
const addChannel = asyncHandler(async (req, res) => {
  const channel = repo.addChannel(req.body);
  return ok(res, channel, 201);
});

// ---- webhook nhận event từ event bus ----
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
