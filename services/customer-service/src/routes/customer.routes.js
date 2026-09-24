const express = require("express");
const ctrl = require("../controllers/customer.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);

router.get("/me", authRequired, requireRole("customer"), ctrl.getMe);
router.put("/me", authRequired, requireRole("customer"), ctrl.updateMe);

router.get("/all", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.listAll);
router.get("/:id", authRequired, requireRole("ops_staff", "ops_admin"), ctrl.getById);
router.patch("/:id/disable", authRequired, requireRole("ops_admin"), ctrl.disable);

module.exports = router;
