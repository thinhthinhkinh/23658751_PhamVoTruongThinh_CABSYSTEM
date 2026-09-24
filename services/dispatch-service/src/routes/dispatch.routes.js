const express = require("express");
const ctrl = require("../controllers/dispatch.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.post("/:tripId/accept", authRequired, requireRole("driver"), ctrl.accept);
router.post("/:tripId/decline", authRequired, requireRole("driver"), ctrl.decline);
router.get("/:tripId/candidates", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.getCandidates);

router.get("/drivers/me/pending", authRequired, requireRole("driver"), ctrl.getMyPendingOffer);

// webhook nội bộ nhận event từ event bus (Trip Service)
router.post("/events/trip-requested", ctrl.onTripRequested);

module.exports = router;
