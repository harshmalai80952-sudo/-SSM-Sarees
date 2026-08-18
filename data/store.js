/*
  Lightweight JSON-file data store.

  Why not a real database? This ships as a zero-dependency, zero-setup
  MVP store: no DB server to provision, no native modules to compile,
  works on any Node host today. It's genuinely fine for a small store's
  order volume. If you outgrow it (concurrent order spikes, need
  reporting/joins, multiple app instances), swap this module for
  Postgres/MySQL — every other file only calls the functions exported
  here, so that's the one place that needs to change.

  IMPORTANT: on most free hosting tiers the filesystem is wiped on
  every redeploy (not on every restart, but on every deploy/rebuild).
  Use a host that gives you a persistent disk (see README) or your
  order history will be lost the next time you deploy. Back up
  data/orders.json periodically regardless.
*/

const fs = require("fs");
const path = require("path");

const DATA_DIR = __dirname;
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SEED_PRODUCTS = require("../seed-products");

// ---------- tiny write queue so concurrent requests don't clobber each other ----------
let writeChain = Promise.resolve();
function queueWrite(fn) {
  writeChain = writeChain.then(fn, fn);
  return writeChain;
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Failed to read ${file}, using fallback.`, e.message);
    return fallback;
  }
}

function writeJSON(file, data) {
  return queueWrite(
    () =>
      new Promise((resolve, reject) => {
        fs.writeFile(file, JSON.stringify(data, null, 2), "utf8", (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
  );
}

// ---------- products ----------
function mergeSeedIntoProducts(existing, resetStock) {
  const byId = new Map(existing.map((p) => [p.id, p]));
  return SEED_PRODUCTS.map((seed) => {
    const current = byId.get(seed.id);
    if (!current || resetStock) {
      return { ...seed };
    }
    // Keep live stock, take everything else fresh from the seed file.
    return { ...seed, stock: current.stock };
  });
}

function initProducts() {
  const existing = readJSON(PRODUCTS_FILE, []);
  const merged = mergeSeedIntoProducts(existing, false);
  writeJSON(PRODUCTS_FILE, merged);
  return merged;
}

function getProducts() {
  return readJSON(PRODUCTS_FILE, SEED_PRODUCTS);
}

function getProductById(id) {
  return getProducts().find((p) => p.id === id);
}

function reseedProducts(resetStock) {
  const existing = readJSON(PRODUCTS_FILE, []);
  const merged = mergeSeedIntoProducts(existing, !!resetStock);
  return writeJSON(PRODUCTS_FILE, merged).then(() => merged);
}

// Decrements stock for a list of {id, qty}. Throws if any item is
// unavailable in the requested quantity, and makes NO changes at all
// if any single item fails (all-or-nothing).
async function decrementStock(items) {
  const products = getProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const p = byId.get(item.id);
    if (!p) throw new Error(`Product ${item.id} not found`);
    if (p.stock < item.qty) {
      throw new Error(`Not enough stock for "${p.name}" (have ${p.stock}, need ${item.qty})`);
    }
  }

  for (const item of items) {
    byId.get(item.id).stock -= item.qty;
  }

  const updated = products.map((p) => byId.get(p.id));
  await writeJSON(PRODUCTS_FILE, updated);
  return updated;
}

// ---------- orders ----------
function getOrders() {
  return readJSON(ORDERS_FILE, []);
}

function getOrderById(internalId) {
  return getOrders().find((o) => o.internalId === internalId);
}

async function saveOrder(order) {
  const orders = getOrders();
  orders.push(order);
  await writeJSON(ORDERS_FILE, orders);
  return order;
}

async function updateOrder(internalId, patch) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.internalId === internalId);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch };
  await writeJSON(ORDERS_FILE, orders);
  return orders[idx];
}

module.exports = {
  initProducts,
  getProducts,
  getProductById,
  reseedProducts,
  decrementStock,
  getOrders,
  getOrderById,
  saveOrder,
  updateOrder
};
