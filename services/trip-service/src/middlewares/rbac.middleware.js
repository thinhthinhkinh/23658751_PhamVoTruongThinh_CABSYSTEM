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
