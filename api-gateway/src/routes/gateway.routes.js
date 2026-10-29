const crypto = require("crypto");
const express = require("express");
const {
  authClient,
  customerClient, driverClient, bookingClient, tripClient, dispatchClient,
  locationClient, pricingClient, paymentClient, notificationClient, adminClient,
} = require("../grpc/clients");
const { grpcRequest, authCtx } = require("../grpc/grpcHelper");

const JWT_SECRET = process.env.JWT_SECRET || "cab-system-super-secret-key-change-me";

// Delegate JWT validation to auth-service; fall back to inline HMAC if auth-service is unreachable.
async function jwtVerifyMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return next();
  const token = auth.slice(7);

  try {
    const result = await new Promise((resolve, reject) => {
      authClient.ValidateToken({ token }, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
    if (!result.valid) {
      return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" } });
    }
    req._authContext = { callerId: result.userId, callerRole: result.role };
    return next();
  } catch {
    // auth-service unreachable → fall back to inline HMAC signature check
    const parts = token.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" } });
    }
    try {
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
      if (!header.alg || header.alg.toLowerCase() === "none") {
        return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" } });
      }
      const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest("base64url");
      if (expected !== parts[2]) {
        return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" } });
      }
      return next();
    } catch {
      return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" } });
    }
  }
}

function requireStaff(req, res, next) {
  const { callerRole } = authCtx(req);
  if (!["ops_staff", "ops_admin"].includes(callerRole)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Chỉ nhân viên vận hành mới được truy cập" } });
  }
  return next();
}

function requireAdmin(req, res, next) {
  const { callerRole } = authCtx(req);
  if (callerRole !== "ops_admin") {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Chỉ ops_admin mới được thực hiện thao tác này" } });
  }
  return next();
}

// Targets kept for /health/services aggregation
const targets = {
  auth:         process.env.AUTH_SERVICE_URL         || "http://localhost:4010",
  customer:     process.env.CUSTOMER_SERVICE_URL     || "http://localhost:4001",
  driver:       process.env.DRIVER_SERVICE_URL       || "http://localhost:4002",
  booking:      process.env.BOOKING_SERVICE_URL      || "http://localhost:4003",
  trip:         process.env.TRIP_SERVICE_URL         || "http://localhost:4011",
  dispatch:     process.env.DISPATCH_SERVICE_URL     || "http://localhost:4004",
  location:     process.env.LOCATION_SERVICE_URL     || "http://localhost:4005",
  pricing:      process.env.PRICING_SERVICE_URL      || "http://localhost:4006",
  payment:      process.env.PAYMENT_SERVICE_URL      || "http://localhost:4007",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008",
  admin:        process.env.ADMIN_SERVICE_URL        || "http://localhost:4009",
};

function registerRoutes(app) {
  app.use(express.json());
  app.use(jwtVerifyMiddleware);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  app.post("/api/v1/auth/logout", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(400).json({ error: { code: "MISSING_TOKEN", message: "Token là bắt buộc" } });
    }
    const token = auth.slice(7);
    return new Promise((resolve) => {
      authClient.RevokeToken({ token }, (err, resp) => {
        if (err || !resp.success) {
          return resolve(res.status(500).json({ error: { code: "REVOKE_FAILED", message: "Không thể thu hồi token" } }));
        }
        return resolve(res.json({ data: { revoked: true } }));
      });
    });
  });

  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  app.post("/api/v1/auth/login", (req, res) =>
    grpcRequest(res, authClient, "LoginByEmail", req.body));

  app.post("/api/v1/customers/register", (req, res) =>
    grpcRequest(res, customerClient, "Register", req.body));

  app.post("/api/v1/customers/login", (req, res) =>
    grpcRequest(res, customerClient, "Login", req.body));

  app.get("/api/v1/customers/me", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    if (!callerId) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Cần đăng nhập để truy cập" } });
    return grpcRequest(res, customerClient, "GetProfile", { userId: callerId, callerRole });
  });

  app.put("/api/v1/customers/me", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, customerClient, "UpdateProfile", { userId: callerId, ...req.body });
  });

  app.get("/api/v1/customers/me/bookings", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, bookingClient, "GetCustomerBookings", {
      userId: callerId, callerRole,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
  });

  app.get("/api/v1/customers/me/payments", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, paymentClient, "GetMyPayments", { userId: callerId, callerRole });
  });

  app.get("/api/v1/customers/all", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, customerClient, "ListAll", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/customers/:id", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, customerClient, "GetById", { id: req.params.id, ...ctx });
  });

  app.patch("/api/v1/customers/:id/disable", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, customerClient, "Disable", { id: req.params.id, ...ctx });
  });

  // ── DRIVER ────────────────────────────────────────────────────────────────
  app.post("/api/v1/drivers/register", (req, res) =>
    grpcRequest(res, driverClient, "RegisterSelf", {
      fullName: req.body.fullName, email: req.body.email, password: req.body.password,
      phone: req.body.phone || "",
      vehiclePlate: (req.body.vehicle || {}).plate || "",
      vehicleModel: (req.body.vehicle || {}).model || "",
      vehicleType:  (req.body.vehicle || {}).type  || "",
    }));

  app.post("/api/v1/drivers/login", (req, res) =>
    grpcRequest(res, driverClient, "Login", req.body));

  app.post("/api/v1/drivers", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "CreateByStaff", {
      fullName: req.body.fullName, email: req.body.email, password: req.body.password,
      phone: req.body.phone || "",
      vehiclePlate: (req.body.vehicle || {}).plate || "",
      vehicleModel: (req.body.vehicle || {}).model || "",
      vehicleType:  (req.body.vehicle || {}).type  || "",
      callerId: ctx.callerId, callerRole: ctx.callerRole,
    });
  });

  app.get("/api/v1/drivers/me", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, driverClient, "GetMyProfile", { userId: callerId, callerRole });
  });

  app.put("/api/v1/drivers/me", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, driverClient, "UpdateProfile", { userId: callerId, ...req.body });
  });

  app.put("/api/v1/drivers/me/vehicle", (req, res) => {
    const { callerId } = authCtx(req);
    const v = req.body.vehicle || req.body;
    return grpcRequest(res, driverClient, "UpdateVehicle", {
      userId: callerId, vehiclePlate: v.plate || "", vehicleModel: v.model || "", vehicleType: v.type || "",
    });
  });

  app.patch("/api/v1/drivers/me/status", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, driverClient, "UpdateStatus", { userId: callerId, status: req.body.status });
  });

  app.get("/api/v1/drivers/all", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "ListAll", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.patch("/api/v1/drivers/:id/approve", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "ApproveDriver", { id: req.params.id, ...ctx });
  });

  app.patch("/api/v1/drivers/:id/reject", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "RejectDriver", { id: req.params.id, ...ctx });
  });

  app.patch("/api/v1/drivers/:id/disable", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "Disable", { id: req.params.id, ...ctx });
  });

  app.get("/api/v1/drivers/:id/ratings", (req, res) =>
    grpcRequest(res, tripClient, "GetDriverRatings", { userId: req.params.id }));

  app.get("/api/v1/drivers/:id", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "GetById", { id: req.params.id, ...ctx });
  });

  app.get("/api/v1/drivers", (req, res) =>
    grpcRequest(res, driverClient, "ListByStatus", { status: req.query.status || "" }));

  // ── BOOKING ───────────────────────────────────────────────────────────────
  app.post("/api/v1/bookings", (req, res) => {
    const ctx = authCtx(req);
    if (ctx.callerRole !== "customer") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Chỉ khách hàng mới được đặt xe" } });
    }
    if (!req.body.pickupLocation || !req.body.dropoffLocation || !req.body.vehicleType) {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "pickupLocation, dropoffLocation, vehicleType là bắt buộc" } });
    }
    const pickup  = req.body.pickupLocation;
    const dropoff = req.body.dropoffLocation;
    return grpcRequest(res, bookingClient, "CreateBooking", {
      customerId:  ctx.callerId,
      pickupLat:   pickup.lat  || 0,
      pickupLng:   pickup.lng  || 0,
      dropoffLat:  dropoff.lat || 0,
      dropoffLng:  dropoff.lng || 0,
      vehicleType: req.body.vehicleType,
    });
  });

  app.get("/api/v1/bookings", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, bookingClient, "ListAll", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/bookings/:id/status", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, bookingClient, "GetBookingStatus", { bookingId: req.params.id, ...ctx });
  });

  app.post("/api/v1/bookings/:id/cancel", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, bookingClient, "CancelBooking", { bookingId: req.params.id, ...ctx });
  });

  // Internal/event endpoints
  app.post("/api/v1/bookings/events/driver-assigned", async (req, res) => {
    try {
      const r = await fetch(`${targets.booking}/bookings/events/driver-assigned`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const json = await r.json().catch(() => null);
      return res.status(r.status).json(json || {});
    } catch (e) {
      return res.status(502).json({ error: { code: "PROXY_ERROR", message: e.message } });
    }
  });

  app.post("/api/v1/bookings/events/no-driver-found", async (req, res) => {
    try {
      const r = await fetch(`${targets.booking}/bookings/events/no-driver-found`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const json = await r.json().catch(() => null);
      return res.status(r.status).json(json || {});
    } catch (e) {
      return res.status(502).json({ error: { code: "PROXY_ERROR", message: e.message } });
    }
  });

  app.get("/api/v1/bookings/:id/internal", async (req, res) => {
    try {
      const r = await fetch(`${targets.booking}/bookings/${req.params.id}/internal`);
      const json = await r.json().catch(() => null);
      return res.status(r.status).json(json || {});
    } catch (e) {
      return res.status(502).json({ error: { code: "PROXY_ERROR", message: e.message } });
    }
  });

  app.get("/api/v1/bookings/:id", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, bookingClient, "GetBookingById", { bookingId: req.params.id, ...ctx });
  });

  // ── TRIP ──────────────────────────────────────────────────────────────────
  app.get("/api/v1/customers/me/trips", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, tripClient, "GetCustomerTrips", {
      userId: callerId, callerRole,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
  });

  app.get("/api/v1/drivers/me/trips", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, tripClient, "GetDriverTrips", {
      userId: callerId, callerRole,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
  });

  app.patch("/api/v1/trips/:id/status", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, tripClient, "UpdateTripStatus", {
      bookingId:   req.params.id,
      status:      req.body.status || "",
      distanceKm:  parseFloat(req.body.distanceKm)  || 0,
      durationMin: parseFloat(req.body.durationMin) || 0,
      ...ctx,
    });
  });

  app.post("/api/v1/trips/:id/rating", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, tripClient, "AddRating", {
      bookingId: req.params.id, customerId: callerId,
      score: parseInt(req.body.score, 10) || 0, comment: req.body.comment || "",
    });
  });

  app.post("/api/v1/trips/events/driver-assigned", async (req, res) => {
    try {
      const r = await fetch(`${targets.trip}/trips/events/driver-assigned`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const json = await r.json().catch(() => null);
      return res.status(r.status).json(json || {});
    } catch (e) {
      return res.status(502).json({ error: { code: "PROXY_ERROR", message: e.message } });
    }
  });

  app.get("/api/v1/trips/:id/internal", async (req, res) => {
    try {
      const r = await fetch(`${targets.trip}/trips/${req.params.id}/internal`);
      const json = await r.json().catch(() => null);
      return res.status(r.status).json(json || {});
    } catch (e) {
      return res.status(502).json({ error: { code: "PROXY_ERROR", message: e.message } });
    }
  });

  app.get("/api/v1/trips/:id", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, tripClient, "GetTripByBookingId", { bookingId: req.params.id, ...ctx });
  });

  // ── DISPATCH ──────────────────────────────────────────────────────────────
  app.get("/api/v1/dispatch/drivers/me/pending", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, dispatchClient, "GetMyPendingOffer", { userId: callerId, callerRole });
  });

  app.post("/api/v1/dispatch/:bookingId/accept", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, dispatchClient, "AcceptOffer", { bookingId: req.params.bookingId, driverId: callerId, callerRole });
  });

  app.post("/api/v1/dispatch/:bookingId/decline", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, dispatchClient, "DeclineOffer", { bookingId: req.params.bookingId, driverId: callerId, callerRole });
  });

  app.get("/api/v1/dispatch/:bookingId/candidates", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, dispatchClient, "GetCandidates", { bookingId: req.params.bookingId, ...ctx });
  });

  // ── LOCATION ──────────────────────────────────────────────────────────────
  app.post("/api/v1/locations", (req, res) => {
    const { callerId } = authCtx(req);
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "lat và lng phải là số" } });
    }
    return grpcRequest(res, locationClient, "ReportLocation", { driverId: callerId, lat, lng });
  });

  app.get("/api/v1/locations/nearby-drivers", (req, res) =>
    grpcRequest(res, locationClient, "FindNearbyDrivers", {
      lat: parseFloat(req.query.lat) || 0, lng: parseFloat(req.query.lng) || 0,
      radiusKm: parseFloat(req.query.radiusKm) || 5,
      limit: parseInt(req.query.limit) || 20, page: parseInt(req.query.page) || 1,
      driverIds: req.query.driverIds || "",
    }));

  app.get("/api/v1/locations/drivers/:id", (req, res) =>
    grpcRequest(res, locationClient, "GetDriverLocation", { driverId: req.params.id }));

  // ── PRICING ───────────────────────────────────────────────────────────────
  app.post("/api/v1/pricing/calculate", (req, res) =>
    grpcRequest(res, pricingClient, "Calculate", {
      vehicleType: req.body.vehicleType || "",
      distanceKm:  req.body.distanceKm  || 0,
      durationMin: req.body.durationMin || 0,
    }));

  app.get("/api/v1/pricing/rules", requireAdmin, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, pricingClient, "GetRules", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  // Internal webhook — proxy to payment-service REST
  app.post("/api/v1/payments/events/fare-calculated", async (req, res) => {
    try {
      const r = await fetch(`${targets.payment}/payments/events/fare-calculated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const json = await r.json().catch(() => null);
      return res.status(r.status).json(json || {});
    } catch (e) {
      return res.status(502).json({ error: { code: "PROXY_ERROR", message: e.message } });
    }
  });

  app.post("/api/v1/payments", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, paymentClient, "CreatePayment", {
      customerId: callerId, bookingId: req.body.bookingId || "", method: req.body.method || "",
    });
  });

  app.get("/api/v1/payments", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, paymentClient, "ListAll", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/payments/:id", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, paymentClient, "GetById", { paymentId: req.params.id, ...ctx });
  });

  app.post("/api/v1/payments/:id/retry", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, paymentClient, "RetryPayment", { paymentId: req.params.id, ...ctx });
  });

  // ── NOTIFICATION ──────────────────────────────────────────────────────────
  for (const ev of ["driver-assigned", "no-driver-found", "booking-status-changed", "booking-completed", "payment-completed", "payment-failed"]) {
    app.post(`/api/v1/notifications/events/${ev}`, async (req, res) => {
      try {
        const r = await fetch(`${targets.notification}/notifications/events/${ev}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body),
        });
        const json = await r.json().catch(() => null);
        return res.status(r.status).json(json || {});
      } catch (e) { return res.status(502).json({ error: { code: "PROXY_ERROR", message: e.message } }); }
    });
  }

  app.get("/api/v1/notifications/me", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, notificationClient, "GetMyNotifications", { userId: callerId, callerRole });
  });

  app.post("/api/v1/notifications/channels", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, notificationClient, "AddChannel", {
      name: req.body.name || "", type: req.body.type || "",
      callerId: ctx.callerId, callerRole: ctx.callerRole,
    });
  });

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  app.get("/api/v1/admin/customers", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListCustomers", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/admin/drivers", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListDrivers", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/admin/vehicles", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListVehicles", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.delete("/api/v1/admin/customers/:id", requireAdmin, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "DisableCustomer", { id: req.params.id, ...ctx });
  });

  app.get("/api/v1/admin/bookings", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListBookings", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/admin/drivers/:id/status", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "GetDriverStatus", { id: req.params.id, ...ctx });
  });

  app.get("/api/v1/admin/transactions", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListTransactions", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.post("/api/v1/admin/bookings/:id/resolve", requireStaff, (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ResolveBooking", {
      bookingId: req.params.id, resolutionNote: req.body.resolutionNote || "", ...ctx,
    });
  });

  app.get("/api/v1/admin/reports/bookings",           requireStaff, (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportBookings",         { callerId: ctx.callerId, callerRole: ctx.callerRole, from: req.query.from || "", to: req.query.to || "" }); });
  app.get("/api/v1/admin/reports/revenue",            requireStaff, (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportRevenue",          { callerId: ctx.callerId, callerRole: ctx.callerRole, from: req.query.from || "", to: req.query.to || "" }); });
  app.get("/api/v1/admin/reports/completion-rate",    requireStaff, (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportCompletionRate",   { callerId: ctx.callerId, callerRole: ctx.callerRole, from: req.query.from || "", to: req.query.to || "" }); });
  app.get("/api/v1/admin/reports/cancellation-rate",  requireStaff, (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportCancellationRate", { callerId: ctx.callerId, callerRole: ctx.callerRole, from: req.query.from || "", to: req.query.to || "" }); });
  app.get("/api/v1/admin/reports/driver-performance", requireStaff, (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportDriverPerf",       { callerId: ctx.callerId, callerRole: ctx.callerRole, from: req.query.from || "", to: req.query.to || "" }); });
}

module.exports = { registerRoutes, targets };
