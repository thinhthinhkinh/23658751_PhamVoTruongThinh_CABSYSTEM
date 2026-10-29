// requireRole("ops_staff", "ops_admin") -> chỉ cho phép các role được liệt kê.
// Đáp ứng FR-22 / BR-08: một số thao tác quản trị chỉ dành cho nhân viên được phân quyền.
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện thao tác này" },
      });
    }
    return next();
  };
}

module.exports = { requireRole };
