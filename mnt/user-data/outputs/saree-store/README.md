# Anokhi Silks — Saree Store

A ready-to-deploy e-commerce storefront: product catalog, filters,
product detail view, cart (persisted in the browser), and a checkout
flow that supports Razorpay (UPI/card) and Cash on Delivery via the
companion backend in `../saree-backend`. Plain HTML/CSS/JS, no build
step, so any static host works — and it also runs standalone in an
offline demo mode with zero setup if you haven't deployed the backend
yet.

## What's included
- `index.html` — the whole site (home, shop, checkout, confirmation)
- `styles.css` — all styling
- `app.js` — cart logic, filtering, checkout, payment, order handling
- `config.js` — set your backend's URL here once deployed
- `products.js` — offline fallback product data (see "Managing products" below)

## Run it locally right now
No install needed. From this folder:
```
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser. (Or just double-click
`index.html` — it works from the filesystem too, since there's no server
code.)

## Deploy it today (pick one)

### Option A — Netlify (easiest, ~2 minutes)
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. Netlify gives you a live URL immediately (e.g. `random-name.netlify.app`).
4. Optional: claim a free subdomain or connect a custom domain in Site settings.

### Option B — Vercel
1. Install the CLI: `npm i -g vercel`
2. From this folder, run `vercel` and follow the prompts (choose "no
   framework" / static).
3. `vercel --prod` for the production URL.

### Option C — GitHub Pages
1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → set source to the `main` branch, root folder.
3. Your site is live at `https://<username>.github.io/<repo>`.

Any of the three gets you a public, working URL today — no server to manage.

## Backend now available — real payments + order inbox
There's now a companion backend in `../saree-backend` that adds:
- Real payment via **Razorpay** (UPI/card/netbanking), verified server-side
- An **order inbox** at `/admin` (password protected) with CSV export
- **Email notification** to you on every order
- Products served live from the backend, so stock actually decreases as orders come in

To connect this frontend to it: deploy the backend (see
`../saree-backend/README.md`), then set `API_BASE` in `config.js` to
its URL. Until you do that, the site keeps working exactly as before —
`config.js` defaults to offline mode: bundled products, Cash on
Delivery only, orders saved to the browser only.

## Managing products
If you've connected a backend, edit `../saree-backend/data/seed-products.js`
instead — that becomes the live source of truth. `products.js` in this
folder is only the offline fallback shown when the backend is unreachable.

If you're running in offline mode (no backend), edit `products.js` in
this folder directly: each saree is one object in the `PRODUCTS` array —
name, category, price, stock, colors, fabric, description, tags.

## Remaining limitations
1. **No image uploads.** Product visuals are CSS color swatches (by
   design, so the site works instantly with zero assets). Swap in real
   photos by adding an `<img>` in the card/modal markup once you have
   product photography.
2. **No inventory sync without the backend.** In offline mode, stock
   numbers in `products.js` don't decrease automatically. Connect the
   backend to fix this.
3. Backend-specific limitations (storage model, stock reservation,
   admin auth) are documented in `../saree-backend/README.md`.
