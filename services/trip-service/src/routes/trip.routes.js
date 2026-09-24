const express = require("express");
const ctrl = require("../controllers/trip.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.post("/", authRequired, requireRole("customer"), ctrl.create);
router.get("/", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.listAll);

router.get("/:id", authRequired, ctrl.getById);
router.get("/:id/status", authRequired, ctrl.getStatus);
router.patch("/:id/status", authRequired, requireRole("driver"), ctrl.updateStatus);
router.post("/:id/cancel", authRequired, requireRole("customer", "driver"), ctrl.cancel);
router.post("/:id/rating", authRequired, requireRole("customer"), ctrl.addRating);

// service-to-service: bỏ qua auth để đơn giản hóa demo
router.get("/:id/internal", ctrl.getInternal);

// webhook nội bộ nhận event từ event bus (Dispatch Service)
router.post("/events/driver-assigned", ctrl.onDriverAssigned);
router.post("/events/no-driver-found", ctrl.onNoDriverFound);

module.exports = router;
