const express = require("express");
const cors = require("cors");
const locationRoutes = require("./routes/location.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const notFound = require("./middlewares/notFound.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "location-service" }));
app.use("/locations", locationRoutes);

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
