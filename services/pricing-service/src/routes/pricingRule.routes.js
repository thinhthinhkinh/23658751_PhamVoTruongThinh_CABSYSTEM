const express = require("express");
const ctrl = require("../controllers/pricingRule.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

// service-to-service: bỏ qua auth để đơn giản hóa demo
router.post("/calculate", ctrl.calculate);

router.get("/rules", authRequired, requireRole("ops_admin"), ctrl.getRules);

module.exports = router;
