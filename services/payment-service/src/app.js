const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/payment.routes");
const paymentCtrl = require("./controllers/payment.controller");
const { authRequired } = require("./middlewares/auth.middleware");
const { requireRole } = require("./middlewares/rbac.middleware");
const errorMiddleware = require("./middlewares/error.middleware");
const notFound = require("./middlewares/notFound.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "payment-service" }));
app.use("/payments", paymentRoutes);
app.get("/customers/me/payments", authRequired, requireRole("customer"), paymentCtrl.getMyPayments);

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
