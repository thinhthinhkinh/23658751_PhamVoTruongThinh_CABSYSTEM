const { createProxyMiddleware } = require("http-proxy-middleware");

const targets = {
  customer: process.env.CUSTOMER_SERVICE_URL || "http://localhost:4001",
  driver: process.env.DRIVER_SERVICE_URL || "http://localhost:4002",
  trip: process.env.TRIP_SERVICE_URL || "http://localhost:4003",
  dispatch: process.env.DISPATCH_SERVICE_URL || "http://localhost:4004",
  location: process.env.LOCATION_SERVICE_URL || "http://localhost:4005",
  pricing: process.env.PRICING_SERVICE_URL || "http://localhost:4006",
  payment: process.env.PAYMENT_SERVICE_URL || "http://localhost:4007",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008",
  admin: process.env.ADMIN_SERVICE_URL || "http://localhost:4009",
};

// Gateway nhận request dạng /api/v1/xxx nhưng các service phía sau chỉ hiểu /xxx
// (không có tiền tố /api/v1) — nên luôn cần pathRewrite bóc tiền tố này đi.
function proxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { "^/api/v1": "" },
  });
}

// Đường dẫn dùng driverId của Driver Service nhưng thuộc dữ liệu Trip Service
const DRIVER_RATINGS_PATTERN = /^\/api\/v1\/drivers\/[^/]+\/ratings$/;

function registerRoutes(app) {
  // ⚠️ Thứ tự đăng ký quan trọng: những path "lệch service" so với tiền tố chung
  // phải khai báo TRƯỚC route theo prefix chung, nếu không sẽ bị prefix chung nuốt mất.
  app.use("/api/v1/customers/me/trips", proxy(targets.trip));
  app.use("/api/v1/customers/me/payments", proxy(targets.payment));
  app.use("/api/v1/drivers/me/trips", proxy(targets.trip));
  app.use((req, res, next) => {
    if (DRIVER_RATINGS_PATTERN.test(req.originalUrl.split("?")[0])) {
      return proxy(targets.trip)(req, res, next);
    }
    return next();
  });

  // Route theo prefix chung (mỗi service sở hữu 1 nhóm resource)
  app.use("/api/v1/customers", proxy(targets.customer));
  app.use("/api/v1/drivers", proxy(targets.driver));
  app.use("/api/v1/trips", proxy(targets.trip));
  app.use("/api/v1/dispatch", proxy(targets.dispatch));
  app.use("/api/v1/locations", proxy(targets.location));
  app.use("/api/v1/pricing", proxy(targets.pricing));
  app.use("/api/v1/payments", proxy(targets.payment));
  app.use("/api/v1/notifications", proxy(targets.notification));
  app.use("/api/v1/admin", proxy(targets.admin));
}

module.exports = { registerRoutes, targets };
