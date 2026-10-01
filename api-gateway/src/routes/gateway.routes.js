const express = require("express");
const {
  customerClient, driverClient, tripClient, dispatchClient,
  locationClient, pricingClient, paymentClient, notificationClient, adminClient,
} = require("../grpc/clients");
const { grpcRequest, authCtx } = require("../grpc/grpcHelper");

// Targets kept for /health/services aggregation
const targets = {
  customer:     process.env.CUSTOMER_SERVICE_URL     || "http://localhost:4001",
  driver:       process.env.DRIVER_SERVICE_URL       || "http://localhost:4002",
  trip:         process.env.TRIP_SERVICE_URL         || "http://localhost:4003",
  dispatch:     process.env.DISPATCH_SERVICE_URL     || "http://localhost:4004",
  location:     process.env.LOCATION_SERVICE_URL     || "http://localhost:4005",
  pricing:      process.env.PRICING_SERVICE_URL      || "http://localhost:4006",
  payment:      process.env.PAYMENT_SERVICE_URL      || "http://localhost:4007",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008",
  admin:        process.env.ADMIN_SERVICE_URL        || "http://localhost:4009",
};

function registerRoutes(app) {
  app.use(express.json());

  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  app.post("/api/v1/customers/register", (req, res) =>
    grpcRequest(res, customerClient, "Register", req.body));

  app.post("/api/v1/customers/login", (req, res) =>
    grpcRequest(res, customerClient, "Login", req.body));

  app.get("/api/v1/customers/me", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, customerClient, "GetProfile", { userId: callerId, callerRole });
  });

  app.put("/api/v1/customers/me", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, customerClient, "UpdateProfile", { userId: callerId, ...req.body });
  });

  app.get("/api/v1/customers/me/trips", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, tripClient, "GetCustomerTrips", {
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

  app.get("/api/v1/customers/:id", (req, res) => {
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

  app.post("/api/v1/drivers", (req, res) => {
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

  app.get("/api/v1/drivers/me/trips", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, tripClient, "GetDriverTrips", {
      userId: callerId, callerRole,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
  });

  app.get("/api/v1/drivers/all", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "ListAll", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.patch("/api/v1/drivers/:id/approve", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "ApproveDriver", { id: req.params.id, ...ctx });
  });

  app.patch("/api/v1/drivers/:id/reject", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, driverClient, "RejectDriver", { id: req.params.id, ...ctx });
  });

  app.patch("/api/v1/drivers/:id/disable", (req, res) => {
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

  // ── TRIP ──────────────────────────────────────────────────────────────────
  app.post("/api/v1/trips", (req, res) => {
    const { callerId } = authCtx(req);
    const pickup  = req.body.pickupLocation  || {};
    const dropoff = req.body.dropoffLocation || {};
    return grpcRequest(res, tripClient, "CreateTrip", {
      customerId:  callerId,
      pickupLat:   pickup.lat  || 0,
      pickupLng:   pickup.lng  || 0,
      dropoffLat:  dropoff.lat || 0,
      dropoffLng:  dropoff.lng || 0,
      vehicleType: req.body.vehicleType || "",
    });
  });

  app.get("/api/v1/trips", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, tripClient, "ListAll", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/trips/:id/status", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, tripClient, "GetTripStatus", { tripId: req.params.id, ...ctx });
  });

  app.patch("/api/v1/trips/:id/status", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, tripClient, "UpdateStatus", { tripId: req.params.id, status: req.body.status, ...ctx });
  });

  app.post("/api/v1/trips/:id/cancel", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, tripClient, "CancelTrip", { tripId: req.params.id, ...ctx });
  });

  app.post("/api/v1/trips/:id/rating", (req, res) => {
    const { callerId } = authCtx(req);
    // AddRatingRequest { tripId, customerId, score, comment }
    return grpcRequest(res, tripClient, "AddRating", {
      tripId: req.params.id, customerId: callerId,
      score: parseInt(req.body.score, 10) || 0, comment: req.body.comment || "",
    });
  });

  app.get("/api/v1/trips/:id", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, tripClient, "GetTripById", { tripId: req.params.id, ...ctx });
  });

  // ── DISPATCH ──────────────────────────────────────────────────────────────
  app.get("/api/v1/dispatch/drivers/me/pending", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    // UserIdRequest { userId, callerRole }
    return grpcRequest(res, dispatchClient, "GetMyPendingOffer", { userId: callerId, callerRole });
  });

  app.post("/api/v1/dispatch/:tripId/accept", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    // OfferRequest { tripId, driverId, callerRole }
    return grpcRequest(res, dispatchClient, "AcceptOffer", { tripId: req.params.tripId, driverId: callerId, callerRole });
  });

  app.post("/api/v1/dispatch/:tripId/decline", (req, res) => {
    const { callerId, callerRole } = authCtx(req);
    return grpcRequest(res, dispatchClient, "DeclineOffer", { tripId: req.params.tripId, driverId: callerId, callerRole });
  });

  app.get("/api/v1/dispatch/:tripId/candidates", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, dispatchClient, "GetCandidates", { tripId: req.params.tripId, ...ctx });
  });

  // ── LOCATION ──────────────────────────────────────────────────────────────
  app.post("/api/v1/locations", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, locationClient, "ReportLocation", {
      driverId: callerId, lat: req.body.lat || 0, lng: req.body.lng || 0,
    });
  });

  app.get("/api/v1/locations/nearby-drivers", (req, res) =>
    grpcRequest(res, locationClient, "FindNearbyDrivers", {
      lat: parseFloat(req.query.lat) || 0, lng: parseFloat(req.query.lng) || 0,
      radiusKm: parseFloat(req.query.radiusKm) || 5,
      limit: parseInt(req.query.limit) || 20, page: parseInt(req.query.page) || 1,
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

  app.get("/api/v1/pricing/rules", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, pricingClient, "GetRules", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  app.post("/api/v1/payments", (req, res) => {
    const { callerId } = authCtx(req);
    return grpcRequest(res, paymentClient, "CreatePayment", {
      customerId: callerId, tripId: req.body.tripId || "", method: req.body.method || "",
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
  app.get("/api/v1/admin/customers", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListCustomers", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/admin/drivers", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListDrivers", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/admin/vehicles", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListVehicles", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.delete("/api/v1/admin/customers/:id", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "DisableCustomer", { id: req.params.id, ...ctx });
  });

  app.get("/api/v1/admin/trips", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListTrips", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.get("/api/v1/admin/drivers/:id/status", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "GetDriverStatus", { id: req.params.id, ...ctx });
  });

  app.get("/api/v1/admin/transactions", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ListTransactions", { callerId: ctx.callerId, callerRole: ctx.callerRole });
  });

  app.post("/api/v1/admin/trips/:id/resolve", (req, res) => {
    const ctx = authCtx(req);
    return grpcRequest(res, adminClient, "ResolveTrip", {
      tripId: req.params.id, resolutionNote: req.body.resolutionNote || "", ...ctx,
    });
  });

  app.get("/api/v1/admin/reports/trips",             (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportTrips",             { callerId: ctx.callerId, callerRole: ctx.callerRole }); });
  app.get("/api/v1/admin/reports/revenue",           (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportRevenue",           { callerId: ctx.callerId, callerRole: ctx.callerRole }); });
  app.get("/api/v1/admin/reports/completion-rate",   (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportCompletionRate",    { callerId: ctx.callerId, callerRole: ctx.callerRole }); });
  app.get("/api/v1/admin/reports/cancellation-rate", (req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportCancellationRate",  { callerId: ctx.callerId, callerRole: ctx.callerRole }); });
  app.get("/api/v1/admin/reports/driver-performance",(req, res) => { const ctx = authCtx(req); return grpcRequest(res, adminClient, "ReportDriverPerf",        { callerId: ctx.callerId, callerRole: ctx.callerRole }); });
}

module.exports = { registerRoutes, targets };
