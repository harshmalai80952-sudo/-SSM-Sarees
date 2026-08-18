const express = require("express");
const store = require("../data/store");

const router = express.Router();

// GET /api/products
// Returns all products
router.get("/", (req, res) => {
  try {
    const products = store.getProducts();
    res.json(products);
  } catch (error) {
    console.error("[products] Failed to load products:", error);
    res.status(500).json({ error: "Could not load products." });
  }
});

// GET /api/products/:id
// Returns one product
router.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid product ID." });
    }

    const product = store.getProductById(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json(product);
  } catch (error) {
    console.error("[products] Failed to load product:", error);
    res.status(500).json({ error: "Could not load product." });
  }
});

module.exports = router;