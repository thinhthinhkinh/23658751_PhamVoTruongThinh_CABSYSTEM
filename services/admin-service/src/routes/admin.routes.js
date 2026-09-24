const express = require("express");
const ctrl = require("../controllers/admin.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.use(authRequired, requireRole("ops_staff", "ops_admin"));

// FR-20
router.get("/customers", ctrl.listCustomers);
router.get("/drivers", ctrl.listDrivers);
router.get("/vehicles", ctrl.listVehicles);

// FR-22 — chỉ ops_admin (kiểm tra thêm ở đây dù Customer Service cũng enforce lại)
router.delete("/customers/:id", requireRole("ops_admin"), ctrl.disableCustomer);

// FR-21
router.get("/trips", ctrl.listTrips);
router.get("/drivers/:id/status", ctrl.getDriverStatus);
router.get("/transactions", ctrl.listTransactions);
router.post("/trips/:id/resolve", ctrl.resolveTrip);

// FR-23 — chỉ ops_admin
router.get("/reports/trips", requireRole("ops_admin"), ctrl.reportTrips);
router.get("/reports/revenue", requireRole("ops_admin"), ctrl.reportRevenue);
router.get("/reports/completion-rate", requireRole("ops_admin"), ctrl.reportCompletionRate);
router.get("/reports/cancellation-rate", requireRole("ops_admin"), ctrl.reportCancellationRate);
router.get("/reports/driver-performance", requireRole("ops_admin"), ctrl.reportDriverPerformance);

module.exports = router;
