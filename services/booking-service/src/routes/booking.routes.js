const express = require("express");
const ctrl = require("../controllers/booking.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.post("/", authRequired, requireRole("customer"), ctrl.create);
router.get("/", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.listAll);

router.get("/:id", authRequired, ctrl.getById);
router.get("/:id/status", authRequired, ctrl.getStatus);
router.post("/:id/cancel", authRequired, requireRole("customer"), ctrl.cancel);

// service-to-service: skip auth for internal calls
router.get("/:id/internal", ctrl.getInternal);

// webhook: internal event from dispatch-service via event bus
router.post("/events/driver-assigned", ctrl.onDriverAssigned);
router.post("/events/no-driver-found", ctrl.onNoDriverFound);

module.exports = router;
