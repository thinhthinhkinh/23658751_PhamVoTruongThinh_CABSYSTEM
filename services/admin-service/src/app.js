const express = require("express");
const cors = require("cors");
const adminRoutes = require("./routes/admin.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const notFound = require("./middlewares/notFound.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "admin-service" }));
app.use("/admin", adminRoutes);

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
