/*
  SEED PRODUCTS
  -------------
  This is the file you edit to add or change sarees. It's the backend's
  source of truth for name, category, price, fabric, description, tags
  and colors. Live STOCK is tracked separately in data/products.json
  (created automatically) so that stock correctly goes down as orders
  come in, without your edits here accidentally resetting it.

  How updates apply:
    - New product (new id) -> added with the stock you set here.
    - Existing product (id already seen before) -> name/price/etc. are
      updated from this file, but live stock is left untouched, UNLESS
      you also call POST /admin/api/reseed?resetStock=true.

  After editing, restart the server (or redeploy) to pick up changes —
  it re-merges this file into data/products.json automatically on boot.
*/

const SEED_PRODUCTS = [
  {
    id: 1,
    name: "Kanchi Vermillion",
    category: "Kanjivaram Silk",
    price: 18500,
    mrp: 22000,
    stock: 4,
    colors: ["#8c1c2b", "#c9a227"],
    fabric: "Pure mulberry silk, temple zari border",
    desc: "A classic Kanjivaram in deep vermillion with a wide temple-motif gold zari border and contrast pallu. Woven in Kanchipuram, this piece carries the weight and sheen traditional silk is prized for.",
    tags: ["Handloom", "Bridal"]
  },
  {
    id: 2,
    name: "Mysore Peacock",
    category: "Kanjivaram Silk",
    price: 15900,
    mrp: 15900,
    stock: 6,
    colors: ["#123a4d", "#c9a227"],
    fabric: "Pure silk, peacock-motif pallu",
    desc: "Ink-teal body with a hand-detailed peacock motif pallu and fine gold zari checks throughout. A statement piece for weddings and formal occasions.",
    tags: ["Handloom"]
  },
  {
    id: 3,
    name: "Benaras Ivory Bloom",
    category: "Banarasi Silk",
    price: 12400,
    mrp: 14000,
    stock: 5,
    colors: ["#f3ead8", "#b23a48"],
    fabric: "Banarasi silk brocade",
    desc: "Ivory Banarasi silk with an all-over floral brocade and a maroon contrast border. Lightweight for a silk saree, drapes softly.",
    tags: ["Brocade", "Wedding"]
  },
  {
    id: 4,
    name: "Benaras Midnight Rani",
    category: "Banarasi Silk",
    price: 13800,
    mrp: 13800,
    stock: 3,
    colors: ["#3a2438", "#c9a227"],
    fabric: "Banarasi silk, jaal weave",
    desc: "Deep plum Banarasi with a dense gold jaal weave running the full length. Comes with a matching unstitched blouse piece.",
    tags: ["Handloom", "Bridal"]
  },
  {
    id: 5,
    name: "Coimbatore Everyday Cotton",
    category: "Cotton",
    price: 1650,
    mrp: 1950,
    stock: 18,
    colors: ["#8c7a8a", "#f3ead8"],
    fabric: "Handloom cotton",
    desc: "A breathable everyday handloom cotton in soft mauve with an ivory border. Easy to starch and iron, holds shape well through the day.",
    tags: ["Handloom", "Daily wear"]
  },
  {
    id: 6,
    name: "Madurai Sunrise Cotton",
    category: "Cotton",
    price: 1800,
    mrp: 1800,
    stock: 14,
    colors: ["#c9622a", "#f3ead8"],
    fabric: "Handloom cotton, checks weave",
    desc: "Rust-orange handloom cotton with a fine ivory check weave. Comfortable for long wear, colours are yarn-dyed so they hold up over years.",
    tags: ["Handloom", "Daily wear"]
  },
  {
    id: 7,
    name: "Chiffon Blush Drape",
    category: "Chiffon",
    price: 2900,
    mrp: 3400,
    stock: 9,
    colors: ["#e3b7c2", "#c9a227"],
    fabric: "Pure chiffon, sequin border",
    desc: "Featherlight blush chiffon with a delicate sequin-and-gota border. Falls close to the body, easy to pleat quickly before an event.",
    tags: ["Party wear"]
  },
  {
    id: 8,
    name: "Georgette Emerald Cascade",
    category: "Georgette",
    price: 3450,
    mrp: 3450,
    stock: 7,
    colors: ["#1f5c4d", "#c9a227"],
    fabric: "Georgette, embroidered border",
    desc: "Emerald georgette with a thread-embroidered scalloped border and a lightly embellished pallu. Comes with a stitching-ready blouse piece.",
    tags: ["Party wear"]
  },
  {
    id: 9,
    name: "Kanchi Bridal Maroon",
    category: "Wedding",
    price: 24500,
    mrp: 28000,
    stock: 2,
    colors: ["#5c0f1a", "#c9a227"],
    fabric: "Pure Kanjivaram silk, heavy zari",
    desc: "Our heaviest bridal piece — deep maroon Kanjivaram silk with dense gold zari work across the body and an elaborately woven pallu. Made to order pairs available on request.",
    tags: ["Handloom", "Bridal", "Heavy zari"]
  }
];

module.exports = SEED_PRODUCTS;
