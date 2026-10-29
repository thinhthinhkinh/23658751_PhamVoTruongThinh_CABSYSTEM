const express = require("express");
const ctrl = require("../controllers/trip.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

// bookingId is used as the route param (1:1 mapping, bookingId = trip identifier for external callers)
router.get("/:id", authRequired, ctrl.getByBookingId);
router.patch("/:id/status", authRequired, requireRole("driver"), ctrl.updateStatus);
router.post("/:id/rating", authRequired, requireRole("customer"), ctrl.addRating);
router.get("/:id/internal", ctrl.getInternal);

// internal webhook — receives DriverAssigned event (used by tests to bypass RabbitMQ)
router.post("/events/driver-assigned", ctrl.onDriverAssigned);

module.exports = router;
