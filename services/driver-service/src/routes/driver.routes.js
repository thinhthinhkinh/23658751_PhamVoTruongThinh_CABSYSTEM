const express = require("express");
const ctrl = require("../controllers/driver.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.post("/register", ctrl.registerSelf);
router.post("/login", ctrl.login);
router.post("/", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.createByStaff);

router.get("/me", authRequired, requireRole("driver"), ctrl.getMe);
router.put("/me", authRequired, requireRole("driver"), ctrl.updateMe);
router.put("/me/vehicle", authRequired, requireRole("driver"), ctrl.updateVehicle);
router.patch("/me/status", authRequired, requireRole("driver"), ctrl.updateStatus);

// service-to-service: bỏ qua auth để đơn giản hóa demo (thực tế nên dùng mTLS/API key nội bộ)
router.get("/", ctrl.listByStatus);
router.get("/all", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.listAll);
router.patch("/:id/disable", authRequired, requireRole("ops_admin"), ctrl.disable);
router.get("/:id", ctrl.getById);

module.exports = router;
