const express = require("express");
const cors = require("cors");
const bookingRoutes = require("./routes/booking.routes");
const bookingCtrl = require("./controllers/booking.controller");
const { authRequired } = require("./middlewares/auth.middleware");
const { requireRole } = require("./middlewares/rbac.middleware");
const errorMiddleware = require("./middlewares/error.middleware");
const notFound = require("./middlewares/notFound.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "booking-service" }));

app.use("/bookings", bookingRoutes);

app.get("/customers/me/bookings", authRequired, requireRole("customer"), bookingCtrl.myBookingsAsCustomer);

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
