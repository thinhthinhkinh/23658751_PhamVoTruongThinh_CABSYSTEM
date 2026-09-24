const express = require("express");
const ctrl = require("../controllers/notification.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.get("/me", authRequired, requireRole("customer", "driver"), ctrl.getMine);
router.post("/channels", authRequired, requireRole("ops_admin"), ctrl.addChannel);

// webhook nội bộ nhận event từ event bus (không cần auth — chỉ gọi trong mạng nội bộ)
router.post("/events/driver-assigned", ctrl.onDriverAssigned);
router.post("/events/no-driver-found", ctrl.onNoDriverFound);
router.post("/events/trip-status-changed", ctrl.onTripStatusChanged);
router.post("/events/trip-completed", ctrl.onTripCompleted);
router.post("/events/payment-completed", ctrl.onPaymentCompleted);
router.post("/events/payment-failed", ctrl.onPaymentFailed);

module.exports = router;
