/* ============================================================
   ANOKHI SILKS — app.js
   Vanilla JS, no build step. Cart persists in localStorage so it
   survives a page refresh. Orders are also saved to localStorage
   under "anokhi_orders" — there is no backend yet, see README.
   ============================================================ */

const CART_KEY = "anokhi_cart";
const ORDERS_KEY = "anokhi_orders";

let cart = loadCart();
let activeCategory = "All";
let activeProductId = null;

// ---------- live product data ----------
// Tries the backend first; if API_BASE is empty or the request fails,
// keeps the bundled PRODUCTS from products.js so the storefront still
// works standalone.
async function loadProducts() {
  if (!API_BASE) return;
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length) PRODUCTS = data;
  } catch (e) {
    console.warn("Could not reach backend, using offline product data.", e.message);
  }
}

// If no backend is configured, don't offer online payment — checkout
// falls back to a local-only "demo" order (same as before the backend
// existed) so the site still fully works with zero setup.
function configurePaymentUI() {
  if (API_BASE) return;
  const razorpayOption = document.getElementById("payOptionRazorpay");
  const codRadio = document.getElementById("payCod");
  const note = document.getElementById("paymentOfflineNote");
  if (razorpayOption) razorpayOption.classList.add("disabled");
  const razorpayRadio = document.getElementById("payRazorpay");
  if (razorpayRadio) razorpayRadio.disabled = true;
  if (codRadio) codRadio.checked = true;
  if (note) note.style.display = "block";
}

// ---------- storage helpers ----------
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function saveOrder(order) {
  const raw = localStorage.getItem(ORDERS_KEY);
  const orders = raw ? JSON.parse(raw) : [];
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

// ---------- utils ----------
function formatRs(n) {
  return "\u20B9" + n.toLocaleString("en-IN");
}

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function swatchStyle(colors) {
  return `background: linear-gradient(160deg, ${colors[0]} 0%, ${colors[0]} 78%, ${colors[1]} 100%);`;
}

function borderStripStyle(colors) {
  return `background: repeating-linear-gradient(90deg, ${colors[1]} 0 8px, ${colors[0]} 8px 16px);`;
}

// ---------- render: product grid ----------
function renderGrid() {
  const grid = document.getElementById("grid");
  const list = PRODUCTS.filter(
    (p) => activeCategory === "All" || p.category === activeCategory
  );

  if (list.length === 0) {
    grid.innerHTML = `<p class="empty-note">No sarees in this category right now.</p>`;
    return;
  }

  grid.innerHTML = list
    .map((p) => {
      const soldOut = p.stock <= 0;
      return `
      <article class="card">
        <div class="card__swatch" data-open="${p.id}" style="cursor:pointer">
          <div class="base" style="${swatchStyle(p.colors)}"></div>
          <div class="border-strip" style="${borderStripStyle(p.colors)}"></div>
          ${soldOut ? '<span class="soldout-tag">Sold out</span>' : ""}
        </div>
        <div class="card__body">
          <span class="card__cat">${p.category}</span>
          <h3 class="card__name" data-open="${p.id}" style="cursor:pointer">${p.name}</h3>
          <span class="card__fabric">${p.fabric}</span>
          <div class="card__price-row">
            <span class="price">${formatRs(p.price)}</span>
            ${p.mrp > p.price ? `<span class="mrp">${formatRs(p.mrp)}</span>` : ""}
          </div>
          <div class="card__actions">
            <button class="btn btn--ghost" data-open="${p.id}">View</button>
            <button class="btn btn--primary" data-quickadd="${p.id}" ${soldOut ? "disabled" : ""}>
              ${soldOut ? "Sold out" : "Add to cart"}
            </button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

function renderFilters() {
  const categories = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
  const el = document.getElementById("filters");
  el.innerHTML = categories
    .map(
      (c) =>
        `<button class="${c === activeCategory ? "active" : ""}" data-filter="${c}">${c}</button>`
    )
    .join("");
}

// ---------- product modal ----------
function openModal(id) {
  const p = findProduct(id);
  if (!p) return;
  activeProductId = id;

  const inCart = cart.find((c) => c.id === id);
  const qty = inCart ? inCart.qty : 1;

  document.getElementById("modalContent").innerHTML = `
    <div class="modal__swatch">
      <div class="base" style="${swatchStyle(p.colors)}"></div>
      <div class="border-strip" style="${borderStripStyle(p.colors)}"></div>
    </div>
    <div class="modal__info">
      <button class="modal__close" data-close-modal>&times;</button>
      <span class="card__cat">${p.category}</span>
      <h2>${p.name}</h2>
      <div class="card__price-row">
        <span class="price">${formatRs(p.price)}</span>
        ${p.mrp > p.price ? `<span class="mrp">${formatRs(p.mrp)}</span>` : ""}
      </div>
      <p class="desc">${p.desc}</p>
      <div class="tag-row">
        ${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
      </div>
      ${
        p.stock > 0
          ? `<div class="qty-row">
              <div class="qty-control">
                <button data-qty-minus>-</button>
                <span id="modalQty">${qty}</span>
                <button data-qty-plus>+</button>
              </div>
              <button class="btn btn--primary" id="modalAddBtn">Add to cart</button>
            </div>
            <p class="stock-note">${p.stock} in stock &middot; ${p.fabric}</p>`
          : `<p class="stock-note" style="margin-top:18px">Currently sold out. Check back soon.</p>`
      }
    </div>
  `;

  document.getElementById("overlay").classList.add("open");
  wireModalQty(p);
}

function wireModalQty(p) {
  const qtyEl = () => document.getElementById("modalQty");
  const minus = document.querySelector("[data-qty-minus]");
  const plus = document.querySelector("[data-qty-plus]");
  const addBtn = document.getElementById("modalAddBtn");

  if (minus)
    minus.addEventListener("click", () => {
      const v = Math.max(1, parseInt(qtyEl().textContent, 10) - 1);
      qtyEl().textContent = v;
    });
  if (plus)
    plus.addEventListener("click", () => {
      const v = Math.min(p.stock, parseInt(qtyEl().textContent, 10) + 1);
      qtyEl().textContent = v;
    });
  if (addBtn)
    addBtn.addEventListener("click", () => {
      const v = parseInt(qtyEl().textContent, 10);
      addToCart(p.id, v);
      closeModal();
      openDrawer();
    });
}

function closeModal() {
  document.getElementById("overlay").classList.remove("open");
  activeProductId = null;
}

// ---------- cart operations ----------
function addToCart(id, qty) {
  const p = findProduct(id);
  if (!p || p.stock <= 0) return;
  const existing = cart.find((c) => c.id === id);
  const maxQty = p.stock;
  if (existing) {
    existing.qty = Math.min(maxQty, existing.qty + qty);
  } else {
    cart.push({ id, qty: Math.min(maxQty, qty) });
  }
  saveCart();
  renderCartCount();
  renderDrawer();
}

function updateCartQty(id, delta) {
  const p = findProduct(id);
  const item = cart.find((c) => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((c) => c.id !== id);
  } else if (p) {
    item.qty = Math.min(item.qty, p.stock);
  }
  saveCart();
  renderCartCount();
  renderDrawer();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== id);
  saveCart();
  renderCartCount();
  renderDrawer();
}

function cartTotal() {
  return cart.reduce((sum, c) => {
    const p = findProduct(c.id);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
}

function cartCount() {
  return cart.reduce((sum, c) => sum + c.qty, 0);
}

function renderCartCount() {
  document.getElementById("cartCount").textContent = cartCount();
}

function renderDrawer() {
  const itemsEl = document.getElementById("drawerItems");
  const footEl = document.getElementById("drawerFoot");

  if (cart.length === 0) {
    itemsEl.innerHTML = `<p class="empty-note">Your cart is empty.<br>Browse the collection to add a saree.</p>`;
    footEl.innerHTML = "";
    return;
  }

  itemsEl.innerHTML = cart
    .map((c) => {
      const p = findProduct(c.id);
      if (!p) return "";
      return `
      <div class="cart-item">
        <div class="cart-item__swatch" style="${swatchStyle(p.colors)}"></div>
        <div class="cart-item__info">
          <div class="cart-item__name">${p.name}</div>
          <div class="cart-item__cat">${p.category} &middot; ${formatRs(p.price)}</div>
          <div class="cart-item__row">
            <div class="qty-control">
              <button data-cart-minus="${p.id}">-</button>
              <span>${c.qty}</span>
              <button data-cart-plus="${p.id}">+</button>
            </div>
            <button class="cart-item__remove" data-cart-remove="${p.id}">Remove</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  footEl.innerHTML = `
    <div class="subtotal-row">
      <span>Subtotal</span>
      <strong>${formatRs(cartTotal())}</strong>
    </div>
    <button class="btn btn--primary btn--full" id="checkoutBtn">Checkout</button>
  `;
}

function openDrawer() {
  document.getElementById("drawer").classList.add("open");
  document.getElementById("scrim").classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("scrim").classList.remove("open");
}

// ---------- routing (hash based, no page reload) ----------
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById("view-" + name);
  if (target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function goCheckout() {
  if (cart.length === 0) return;
  closeDrawer();
  renderCheckoutSummary();
  showView("checkout");
  window.location.hash = "checkout";
}

function goShop() {
  showView("shop");
  window.location.hash = "";
}

// ---------- checkout ----------
function renderCheckoutSummary() {
  const el = document.getElementById("checkoutSummary");
  const lines = cart
    .map((c) => {
      const p = findProduct(c.id);
      if (!p) return "";
      return `<div class="summary-line"><span>${p.name} &times; ${c.qty}</span><span>${formatRs(p.price * c.qty)}</span></div>`;
    })
    .join("");
  const shipping = cartTotal() >= 3000 ? 0 : 149;
  el.innerHTML = `
    ${lines}
    <div class="summary-line"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatRs(shipping)}</span></div>
    <div class="summary-line total"><span>Total</span><span>${formatRs(cartTotal() + shipping)}</span></div>
  `;
}

function validateCheckoutForm(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = "Enter your full name.";
  if (!/^[0-9]{10}$/.test(data.phone.trim())) errors.phone = "Enter a 10-digit phone number.";
  if (!data.address.trim()) errors.address = "Enter your delivery address.";
  if (!data.city.trim()) errors.city = "Enter your city.";
  if (!/^[0-9]{6}$/.test(data.pincode.trim())) errors.pincode = "Enter a 6-digit pincode.";
  return errors;
}

function showFieldErrors(errors) {
  document.querySelectorAll(".field-error").forEach((e) => {
    e.classList.remove("show");
    e.textContent = "";
  });
  Object.entries(errors).forEach(([field, msg]) => {
    const el = document.getElementById("err-" + field);
    if (el) {
      el.textContent = msg;
      el.classList.add("show");
    }
  });
}

function showConfirmation(orderId, total) {
  document.getElementById("confirmOrderId").textContent = orderId;
  document.getElementById("confirmTotal").textContent = formatRs(total);
  showView("confirmation");
  window.location.hash = "confirmation";
}

function clearCartAfterOrder() {
  cart = [];
  saveCart();
  renderCartCount();
  renderDrawer();
}

// ---------- offline/demo order (no backend configured) ----------
function placeOrderLocalFallback(data) {
  const shipping = cartTotal() >= 3000 ? 0 : 149;
  const orderId = "AS" + Date.now().toString().slice(-8);
  const order = {
    orderId,
    date: new Date().toISOString(),
    customer: data,
    items: cart.map((c) => {
      const p = findProduct(c.id);
      return { id: c.id, name: p ? p.name : "Unknown", qty: c.qty, price: p ? p.price : 0 };
    }),
    subtotal: cartTotal(),
    shipping,
    total: cartTotal() + shipping,
    paymentMethod: "Cash on Delivery (offline demo — API_BASE not set)"
  };
  saveOrder(order);
  clearCartAfterOrder();
  showConfirmation(order.orderId, order.total);
}

// ---------- Cash on Delivery via backend ----------
async function submitCodOrder(payload) {
  const res = await fetch(`${API_BASE}/api/orders/cod`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not place order.");
  return data; // { orderNumber, total }
}

// ---------- Razorpay (UPI/Card) via backend ----------
function submitRazorpayOrder(payload) {
  return fetch(`${API_BASE}/api/orders/razorpay/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment.");
      return data;
    })
    .then(
      (data) =>
        new Promise((resolve, reject) => {
          const rzp = new Razorpay({
            key: data.keyId,
            amount: data.amount,
            currency: data.currency,
            order_id: data.razorpayOrderId,
            name: "Anokhi Silks",
            description: `Order ${data.orderNumber}`,
            prefill: { name: payload.customer.name, contact: payload.customer.phone },
            theme: { color: "#c9a227" },
            handler: async function (response) {
              try {
                const verifyRes = await fetch(`${API_BASE}/api/orders/razorpay/verify`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    internalOrderId: data.internalOrderId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });
                const verifyData = await verifyRes.json();
                if (!verifyRes.ok || !verifyData.success) {
                  throw new Error(verifyData.error || "Payment verification failed.");
                }
                resolve(verifyData);
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: function () {
                reject(new Error("Payment was cancelled."));
              }
            }
          });
          rzp.on("payment.failed", function (response) {
            reject(new Error((response.error && response.error.description) || "Payment failed."));
          });
          rzp.open();
        })
    );
}

async function placeOrder(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value,
    phone: form.phone.value,
    address: form.address.value,
    city: form.city.value,
    pincode: form.pincode.value,
    notes: form.notes.value
  };
  const errors = validateCheckoutForm(data);
  showFieldErrors(errors);
  if (Object.keys(errors).length > 0) return;

  const paymentMethod = (form.paymentMethod && form.paymentMethod.value) || "cod";
  const btn = document.getElementById("placeOrderBtn");
  const errBanner = document.getElementById("checkoutError");
  errBanner.style.display = "none";
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = paymentMethod === "razorpay" ? "Opening payment\u2026" : "Placing order\u2026";

  try {
    if (!API_BASE) {
      placeOrderLocalFallback(data);
      form.reset();
      return;
    }

    const payload = { items: cart.map((c) => ({ id: c.id, qty: c.qty })), customer: data };
    const result =
      paymentMethod === "razorpay" ? await submitRazorpayOrder(payload) : await submitCodOrder(payload);

    clearCartAfterOrder();
    showConfirmation(result.orderNumber, result.total);
    form.reset();
  } catch (err) {
    errBanner.textContent = err.message || "Something went wrong. Please try again.";
    errBanner.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

// ---------- event wiring ----------
document.addEventListener("DOMContentLoaded", async () => {
  configurePaymentUI();
  await loadProducts();
  renderFilters();
  renderGrid();
  renderCartCount();
  renderDrawer();

  document.getElementById("filters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    activeCategory = btn.dataset.filter;
    renderFilters();
    renderGrid();
  });

  document.getElementById("grid").addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open]");
    const quickAdd = e.target.closest("[data-quickadd]");
    if (openBtn) openModal(parseInt(openBtn.dataset.open, 10));
    if (quickAdd) addToCart(parseInt(quickAdd.dataset.quickadd, 10), 1);
  });

  document.getElementById("overlay").addEventListener("click", (e) => {
    if (e.target.id === "overlay" || e.target.closest("[data-close-modal]")) closeModal();
  });

  document.getElementById("cartOpenBtn").addEventListener("click", openDrawer);
  document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);
  document.getElementById("scrim").addEventListener("click", closeDrawer);

  document.getElementById("drawerItems").addEventListener("click", (e) => {
    const minus = e.target.closest("[data-cart-minus]");
    const plus = e.target.closest("[data-cart-plus]");
    const remove = e.target.closest("[data-cart-remove]");
    if (minus) updateCartQty(parseInt(minus.dataset.cartMinus, 10), -1);
    if (plus) updateCartQty(parseInt(plus.dataset.cartPlus, 10), 1);
    if (remove) removeFromCart(parseInt(remove.dataset.cartRemove, 10));
  });

  document.getElementById("drawerFoot").addEventListener("click", (e) => {
    if (e.target.id === "checkoutBtn") goCheckout();
  });

  document.getElementById("checkoutForm").addEventListener("submit", placeOrder);
  document.getElementById("backToShopBtn").addEventListener("click", goShop);
  document.getElementById("continueShoppingBtn").addEventListener("click", goShop);
  document.getElementById("navShopBtn").addEventListener("click", goShop);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDrawer();
    }
  });
});
