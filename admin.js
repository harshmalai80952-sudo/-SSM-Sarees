const express = require("express");
const store = require("./data/store");

const router = express.Router();

// ---------- GET /admin/api/orders ----------
router.get("/api/orders", (req, res) => {
  const orders = store.getOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

// ---------- POST /admin/api/orders/:internalId/status ----------
router.post("/api/orders/:internalId/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "shipped"].includes(status)) {
    return res.status(400).json({ error: "status must be 'pending' or 'shipped'" });
  }
  const updated = await store.updateOrder(req.params.internalId, { fulfillmentStatus: status });
  if (!updated) return res.status(404).json({ error: "Order not found" });
  res.json(updated);
});

// ---------- POST /admin/api/reseed ----------
// Re-reads data/seed-products.js. Pass ?resetStock=true to also reset
// stock counts back to the seed file's numbers (use with care).
router.post("/api/reseed", async (req, res) => {
  const resetStock = req.query.resetStock === "true";
  const products = await store.reseedProducts(resetStock);
  res.json({ ok: true, count: products.length, resetStock });
});

// ---------- GET /admin/orders.csv ----------
router.get("/orders.csv", (req, res) => {
  const orders = store.getOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const header = [
    "Order Number", "Date", "Customer", "Phone", "Address", "City", "Pincode",
    "Items", "Subtotal", "Shipping", "Total", "Payment Method", "Payment Status", "Fulfillment"
  ];
  const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.createdAt,
      o.customer.name,
      o.customer.phone,
      o.customer.address,
      o.customer.city,
      o.customer.pincode,
      o.items.map((i) => `${i.name} x${i.qty}`).join("; "),
      o.subtotal,
      o.shipping,
      o.total,
      o.paymentMethod,
      o.paymentStatus,
      o.fulfillmentStatus
    ]
      .map(escapeCsv)
      .join(",")
  );
  const csv = [header.map(escapeCsv).join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=anokhi-orders.csv");
  res.send(csv);
});

// ---------- GET /admin — the inbox page itself ----------
router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(ADMIN_HTML);
});

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Inbox — SSM Sarees </title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#1e1420; color:#f3ead8; font-family: Karla, Segoe UI, sans-serif; }
  header { padding:20px 28px; border-bottom:1px solid rgba(201,162,39,0.35); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
  h1 { font-family: Marcellus, Georgia, serif; font-weight:400; font-size:1.5rem; margin:0; }
  a.btn, button.btn { background:#c9a227; color:#241621; border:none; padding:9px 16px; border-radius:2px; text-decoration:none; font-size:0.85rem; cursor:pointer; }
  main { padding:24px 28px; }
  table { width:100%; border-collapse:collapse; font-size:0.88rem; }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid rgba(201,162,39,0.15); vertical-align:top; }
  th { color:#c9a227; font-size:0.72rem; letter-spacing:0.06em; text-transform:uppercase; }
  tr:hover { background:rgba(201,162,39,0.05); }
  .pill { display:inline-block; padding:3px 9px; border-radius:999px; font-size:0.72rem; border:1px solid rgba(201,162,39,0.35); }
  .pill.paid, .pill.shipped { border-color:#3a8f5c; color:#7fd9a0; }
  .pill.pending, .pill.cod_pending, .pill.created { border-color:#c9a227; color:#e2c05c; }
  .pill.failed { border-color:#b23a48; color:#e08d96; }
  .muted { color:#a993a6; font-size:0.82rem; }
  .toggle-btn { background:none; border:1px solid rgba(201,162,39,0.35); color:#f3ead8; padding:6px 10px; border-radius:2px; font-size:0.78rem; cursor:pointer; }
  .toggle-btn:hover { border-color:#c9a227; }
  .empty { padding:60px 0; text-align:center; color:#a993a6; }
  .items-list { margin:0; padding-left:16px; }
</style>
</head>
<body>
<header>
  <h1>Order Inbox</h1>
  <div style="display:flex; gap:10px;">
    <a class="btn" href="/admin/orders.csv">Download CSV</a>
    <button class="btn" id="refreshBtn">Refresh</button>
  </div>
</header>
<main>
  <table id="ordersTable" style="display:none">
    <thead>
      <tr>
        <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Fulfillment</th>
      </tr>
    </thead>
    <tbody id="ordersBody"></tbody>
  </table>
  <div class="empty" id="emptyState" style="display:none">No orders yet.</div>
</main>
<script>
  function formatRs(n) { return "\\u20B9" + Number(n).toLocaleString("en-IN"); }
  function formatDate(iso) { return new Date(iso).toLocaleString("en-IN"); }

  async function loadOrders() {
    const res = await fetch("/admin/api/orders");
    const orders = await res.json();
    const table = document.getElementById("ordersTable");
    const body = document.getElementById("ordersBody");
    const empty = document.getElementById("emptyState");

    if (!orders.length) {
      table.style.display = "none";
      empty.style.display = "block";
      return;
    }
    table.style.display = "table";
    empty.style.display = "none";

    body.innerHTML = orders.map(o => \`
      <tr>
        <td>
          <strong>\${o.orderNumber}</strong><br>
          <span class="muted">\${formatDate(o.createdAt)}</span>
        </td>
        <td>
          \${o.customer.name}<br>
          <span class="muted">\${o.customer.phone}<br>\${o.customer.address}, \${o.customer.city} - \${o.customer.pincode}</span>
        </td>
        <td>
          <ul class="items-list">
            \${o.items.map(i => \`<li>\${i.name} &times; \${i.qty}</li>\`).join("")}
          </ul>
        </td>
        <td><strong>\${formatRs(o.total)}</strong></td>
        <td>
          <span class="pill \${o.paymentStatus}">\${o.paymentMethod} &middot; \${o.paymentStatus}</span>
        </td>
        <td>
          <span class="pill \${o.fulfillmentStatus}">\${o.fulfillmentStatus}</span><br><br>
          <button class="toggle-btn" data-id="\${o.internalId}" data-next="\${o.fulfillmentStatus === 'shipped' ? 'pending' : 'shipped'}">
            Mark \${o.fulfillmentStatus === 'shipped' ? 'pending' : 'shipped'}
          </button>
        </td>
      </tr>
    \`).join("");
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".toggle-btn");
    if (!btn) return;
    await fetch(\`/admin/api/orders/\${btn.dataset.id}/status\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: btn.dataset.next })
    });
    loadOrders();
  });

  document.getElementById("refreshBtn").addEventListener("click", loadOrders);
  loadOrders();
  setInterval(loadOrders, 30000);
</script>
</body>
</html>`;

module.exports = router;
