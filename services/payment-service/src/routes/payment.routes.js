const express = require("express");
const ctrl = require("../controllers/payment.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.post("/", authRequired, requireRole("customer"), ctrl.create);
router.get("/", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.listAll);
router.get("/:id", authRequired, requireRole("customer"), ctrl.getById);
router.post("/:id/retry", authRequired, requireRole("customer"), ctrl.retry);

// callback từ cổng thanh toán ngoài — xác thực bằng chữ ký riêng trong thực tế, bỏ qua ở demo
router.post("/webhook", ctrl.webhook);

// webhook nội bộ nhận event từ event bus
router.post("/events/fare-calculated", ctrl.onFareCalculated);

module.exports = router;
