require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const basicAuth = require("express-basic-auth");

const store = require("./data/store");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./admin");
const { emailConfigured } = require("./mailer");

const app = express();
const PORT = process.env.PORT || 4000;

// Seed/merge products.json from data/seed-products.js on every boot.
store.initProducts();

// ---------- CORS ----------
// FRONTEND_ORIGIN can be a comma-separated list. If unset, allow all
// origins (fine for getting started; tighten this before real launch).
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true
  })
);

app.use(express.json());
app.use(express.static(__dirname));

// ---------- public API ----------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    emailConfigured
  });
});

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

// ---------- admin (protected) ----------
if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
  console.warn(
    "[server] ADMIN_USER / ADMIN_PASSWORD not set — /admin will use the insecure defaults admin/admin. Set these before deploying for real."
  );
}
app.use(
  "/admin",
  basicAuth({
    users: { [process.env.ADMIN_USER || "admin"]: process.env.ADMIN_PASSWORD || "8050025477" },
    challenge: true,
    realm: "SSM sarees Admin"
  }),
  adminRouter
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`SSM Sarees backend listening on port ${PORT}`);
  if (!emailConfigured) {
    console.warn("[server] SMTP env vars not set — order emails are disabled. See .env.example.");
  }
});
