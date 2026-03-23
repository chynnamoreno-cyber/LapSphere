const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const config = require("./config");
const userRoutes = require("./routes/users");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const stockAlertRoutes = require("./routes/stockAlerts");
const promoRoutes = require("./routes/promos");
const notificationRoutes = require("./routes/notifications");

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));
app.use(`/${config.uploadDir}`, express.static(path.resolve(process.cwd(), config.uploadDir)));

app.use(`${config.apiPrefix}/users`, userRoutes);
app.use(`${config.apiPrefix}/categories`, categoryRoutes);
app.use(`${config.apiPrefix}/products`, productRoutes);
app.use(`${config.apiPrefix}/orders`, orderRoutes);
app.use(`${config.apiPrefix}/stock-alerts`, stockAlertRoutes);
app.use(`${config.apiPrefix}/promos`, promoRoutes);
app.use(`${config.apiPrefix}/notifications`, notificationRoutes);

app.get("/", (req, res) => {
  const forwardedProto = String(req.get("x-forwarded-proto") || "").trim();
  const protocol = forwardedProto || req.protocol || "https";
  const base = `${protocol}://${req.get("host")}`;
  return res.status(200).json({
    ok: true,
    message: "LapSphere backend is running.",
    apiBase: `${base}${config.apiPrefix}`,
    health: `${base}${config.apiPrefix}/health`,
  });
});

app.get(`${config.apiPrefix}/health`, (_req, res) => {
  res.status(200).json({ ok: true, message: "Backend config scaffold is running." });
});

module.exports = app;
