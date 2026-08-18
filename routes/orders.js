const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const store = require("../data/store");
const { sendOrderNotification } = require("../mailer");

const router = express.Router();

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      })
    : null;

// ---------- shared validation ----------
function validateCustomer(customer = {}) {
  const errors = {};
  if (!customer.name || !customer.name.trim()) errors.name = "Enter your full name.";
  if (!/^[0-9]{10}$/.test((customer.phone || "").trim())) errors.phone = "Enter a 10-digit phone number.";
  if (!customer.address || !customer.address.trim()) errors.address = "Enter your delivery address.";
  if (!customer.city || !customer.city.trim()) errors.city = "Enter your city.";
  if (!/^[0-9]{6}$/.test((customer.pincode || "").trim())) errors.pincode = "Enter a 6-digit pincode.";
  return errors;
}

// Recomputes prices and validates stock server-side. NEVER trust a
// price sent from the client — always look it up here.
function buildLineItems(requestedItems) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { error: "Cart is empty." };
  }
  const products = store.getProducts();
  const lineItems = [];

  for (const req of requestedItems) {
    const product = products.find((p) => p.id === Number(req.id));
    const qty = Number(req.qty);
    if (!product) return { error: `Product ${req.id} does not exist.` };
    if (!Number.isInteger(qty) || qty <= 0) return { error: `Invalid quantity for ${product.name}.` };
    if (product.stock < qty) {
      return { error: `Only ${product.stock} left of "${product.name}".` };
    }
    lineItems.push({ id: product.id, name: product.name, price: product.price, qty });
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = subtotal >= 3000 ? 0 : 149;
  const total = subtotal + shipping;

  return { lineItems, subtotal, shipping, total };
}

function generateOrderNumber() {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(10 + Math.random() * 89);
  return `AS${ts}${rand}`;
}

// ---------- POST /api/orders/cod ----------
router.post("/cod", async (req, res) => {
  const { items, customer } = req.body || {};

  const customerErrors = validateCustomer(customer);
  if (Object.keys(customerErrors).length > 0) {
    return res.status(400).json({ error: "Invalid details", fields: customerErrors });
  }

  const totals = buildLineItems(items);
  if (totals.error) return res.status(400).json({ error: totals.error });

  try {
    await store.decrementStock(totals.lineItems.map((i) => ({ id: i.id, qty: i.qty })));
  } catch (err) {
    return res.status(409).json({ error: err.message });
  }

  const order = {
    internalId: crypto.randomUUID(),
    orderNumber: generateOrderNumber(),
    createdAt: new Date().toISOString(),
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      city: customer.city.trim(),
      pincode: customer.pincode.trim(),
      notes: (customer.notes || "").trim()
    },
    items: totals.lineItems,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    paymentMethod: "cod",
    paymentStatus: "cod_pending",
    fulfillmentStatus: "pending"
  };

  await store.saveOrder(order);
  sendOrderNotification(order); // fire and forget — never blocks the response

  res.json({ orderNumber: order.orderNumber, total: order.total });
});

// ---------- POST /api/orders/razorpay/create ----------
router.post("/razorpay/create", async (req, res) => {
  if (!razorpay) {
    return res
      .status(503)
      .json({ error: "Online payment is not configured on the server yet. Use Cash on Delivery, or ask the store owner to set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET." });
  }

  const { items, customer } = req.body || {};

  const customerErrors = validateCustomer(customer);
  if (Object.keys(customerErrors).length > 0) {
    return res.status(400).json({ error: "Invalid details", fields: customerErrors });
  }

  const totals = buildLineItems(items);
  if (totals.error) return res.status(400).json({ error: totals.error });

  const orderNumber = generateOrderNumber();
  const internalId = crypto.randomUUID();

  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totals.total * 100), // paise
      currency: "INR",
      receipt: orderNumber
    });
  } catch (err) {
    console.error("[razorpay] order creation failed:", err.message);
    return res.status(502).json({ error: "Could not start payment. Please try again." });
  }

  // Save a pending order now so we have a record even if the customer
  // abandons the payment popup. It's only marked "paid" after verify.
  const order = {
    internalId,
    orderNumber,
    createdAt: new Date().toISOString(),
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      city: customer.city.trim(),
      pincode: customer.pincode.trim(),
      notes: (customer.notes || "").trim()
    },
    items: totals.lineItems,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    paymentMethod: "razorpay",
    paymentStatus: "created",
    razorpayOrderId: razorpayOrder.id,
    razorpayPaymentId: null,
    fulfillmentStatus: "pending"
  };
  await store.saveOrder(order);

  res.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    internalOrderId: internalId,
    orderNumber
  });
});

// ---------- POST /api/orders/razorpay/verify ----------
router.post("/razorpay/verify", async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ error: "Online payment is not configured on the server." });
  }

  const { internalOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!internalOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification fields." });
  }

  const order = store.getOrderById(internalOrderId);
  if (!order || order.razorpayOrderId !== razorpay_order_id) {
    return res.status(404).json({ error: "Order not found." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const valid =
    expectedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

  if (!valid) {
    await store.updateOrder(internalOrderId, { paymentStatus: "failed" });
    return res.status(400).json({ error: "Payment verification failed." });
  }

  // Payment is confirmed at this point. Try to decrement stock, but
  // never fail the response over a stock mismatch — the customer has
  // already been charged, so the order must go through; short stock
  // becomes something the store owner resolves manually via the inbox.
  try {
    await store.decrementStock(order.items.map((i) => ({ id: i.id, qty: i.qty })));
  } catch (err) {
    console.error(`[orders] Stock issue on paid order ${order.orderNumber}:`, err.message);
  }

  const updated = await store.updateOrder(internalOrderId, {
    paymentStatus: "paid",
    razorpayPaymentId: razorpay_payment_id
  });

  sendOrderNotification(updated);

  res.json({ success: true, orderNumber: updated.orderNumber, total: updated.total });
});

module.exports = router;
