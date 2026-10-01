const { loadProto, makeClient } = require("../grpcHelper");

const GRPC_HOSTS = {
  customer:     process.env.CUSTOMER_GRPC_URL     || "localhost:5001",
  driver:       process.env.DRIVER_GRPC_URL       || "localhost:5002",
  trip:         process.env.TRIP_GRPC_URL         || "localhost:5003",
  dispatch:     process.env.DISPATCH_GRPC_URL     || "localhost:5004",
  location:     process.env.LOCATION_GRPC_URL     || "localhost:5005",
  pricing:      process.env.PRICING_GRPC_URL      || "localhost:5006",
  payment:      process.env.PAYMENT_GRPC_URL      || "localhost:5007",
  notification: process.env.NOTIFICATION_GRPC_URL || "localhost:5008",
  admin:        process.env.ADMIN_GRPC_URL        || "localhost:5009",
};

const pkgs = {
  customer:     loadProto("customer.proto"),
  driver:       loadProto("driver.proto"),
  trip:         loadProto("trip.proto"),
  dispatch:     loadProto("dispatch.proto"),
  location:     loadProto("location.proto"),
  pricing:      loadProto("pricing.proto"),
  payment:      loadProto("payment.proto"),
  notification: loadProto("notification.proto"),
  admin:        loadProto("admin.proto"),
};

module.exports = {
  customerClient:     makeClient(pkgs.customer["cab.customer"],     "CustomerService",     GRPC_HOSTS.customer),
  driverClient:       makeClient(pkgs.driver["cab.driver"],         "DriverService",       GRPC_HOSTS.driver),
  tripClient:         makeClient(pkgs.trip["cab.trip"],             "TripService",         GRPC_HOSTS.trip),
  dispatchClient:     makeClient(pkgs.dispatch["cab.dispatch"],     "DispatchService",     GRPC_HOSTS.dispatch),
  locationClient:     makeClient(pkgs.location["cab.location"],     "LocationService",     GRPC_HOSTS.location),
  pricingClient:      makeClient(pkgs.pricing["cab.pricing"],       "PricingService",      GRPC_HOSTS.pricing),
  paymentClient:      makeClient(pkgs.payment["cab.payment"],       "PaymentService",      GRPC_HOSTS.payment),
  notificationClient: makeClient(pkgs.notification["cab.notification"], "NotificationService", GRPC_HOSTS.notification),
  adminClient:        makeClient(pkgs.admin["cab.admin"],           "AdminService",        GRPC_HOSTS.admin),
};
