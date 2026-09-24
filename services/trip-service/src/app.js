const express = require("express");
const cors = require("cors");
const tripRoutes = require("./routes/trip.routes");
const tripCtrl = require("./controllers/trip.controller");
const { authRequired } = require("./middlewares/auth.middleware");
const { requireRole } = require("./middlewares/rbac.middleware");
const errorMiddleware = require("./middlewares/error.middleware");
const notFound = require("./middlewares/notFound.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "trip-service" }));

app.use("/trips", tripRoutes);

// Các route được thiết kế theo ngữ cảnh customer/driver thay vì /trips (FR-05)
app.get("/customers/me/trips", authRequired, requireRole("customer"), tripCtrl.myTripsAsCustomer);
app.get("/drivers/me/trips", authRequired, requireRole("driver"), tripCtrl.myTripsAsDriver);
app.get("/drivers/:id/ratings", tripCtrl.getDriverRatings);

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
