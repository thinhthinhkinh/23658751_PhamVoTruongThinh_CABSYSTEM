const express = require("express");
const ctrl = require("../controllers/location.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.post("/", authRequired, requireRole("driver"), ctrl.reportLocation);

// service-to-service: bỏ qua auth để đơn giản hóa demo
router.get("/nearby-drivers", ctrl.findNearby);
router.get("/drivers/:id", ctrl.getByDriverId);

module.exports = router;
