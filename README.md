# SSM Sarees — Backend

Express API that gives the storefront real payments and an order inbox:
- `GET /api/products` — live product list (source of truth for price & stock)
- `POST /api/orders/cod` — place a Cash on Delivery order
- `POST /api/orders/razorpay/create` — start a Razorpay payment
- `POST /api/orders/razorpay/verify` — verify payment signature, confirm the order
- `GET /admin` — order inbox (password protected), with CSV export and a
  "mark shipped" toggle
- Emails you on every new order (optional, via SMTP)

Data is stored in JSON files under `data/` — no database server to set
up. See the note in `data/store.js` for when you'd want to graduate to
a real database.

## 1. Install
```
cd saree-backend
npm install
cp .env.example .env
```

## 2. Fill in `.env`

### Razorpay
1. Sign up at https://dashboard.razorpay.com (test mode is free and
   works immediately — no business verification needed to start
   testing).
2. Settings → API Keys → generate a **Test** key first. Put the Key ID
   and Key Secret into `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. Test mode gives you fake UPI/card numbers to test full checkout
   without moving real money (Razorpay's docs list the test card
   numbers). Switch to **Live** keys only once you're ready to accept
   real payments — Razorpay requires basic KYC (PAN, bank account) to
   activate live mode.

### Admin inbox login
Set `ADMIN_USER` and `ADMIN_PASSWORD` to whatever you want to log into
`/admin` with. Don't leave the defaults.

### Order emails
Fill in `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `STORE_OWNER_EMAIL`. For
Gmail: turn on 2-Step Verification, then create an **App Password**
(Google Account → Security → App passwords) and use that as
`SMTP_PASS`, not your normal Gmail password. If you skip this section
entirely, orders still work fine — you just won't get emailed, and
you'd rely on checking `/admin` instead.

## 3. Run it
```
npm start
```
Server starts on `http://localhost:4000` (or `PORT` from `.env`).
Visit `http://localhost:4000/api/health` — should return
`{"ok":true,...}`.

## 4. Deploy it today — Render (recommended)
Render's free/starter tier is the simplest path for a small Node API
and gives you a persistent disk option, which this app needs (see
below).

1. Push this `saree-backend` folder to a GitHub repo.
2. Go to https://dashboard.render.com → New → Web Service → connect
   the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all the variables from your `.env` under Environment.
5. **Important — persistent storage:** Render's free web services use
   an ephemeral filesystem, meaning `data/orders.json` and
   `data/products.json` are wiped on every redeploy. Add a Render
   **Disk** (Render dashboard → your service → Disks → Add Disk),
   mount it at `/opt/render/project/src/data`, even 1GB is plenty.
   This makes your order history and stock counts survive redeploys.
   (Railway's persistent volumes work the same way, if you'd rather
   use Railway.)
6. Once deployed, you'll get a URL like
   `https://anokhi-silks-backend.onrender.com`. Note it down — the
   frontend needs it next.
7. Set `FRONTEND_ORIGIN` to your deployed frontend's URL (e.g. your
   Netlify URL) so CORS allows it to call this API.

Render's free tier spins the service down after inactivity and takes
~30–60 seconds to wake up on the next request — fine for a small
store, but the first checkout after a quiet period may feel slow.
Upgrade to a paid instance later if that matters.

## 5. Connect the frontend
Open `saree-store/config.js` and set:
```js
const API_BASE = "https://anokhi-silks-backend.onrender.com";
```
Redeploy the frontend (drag the folder into Netlify again, or push if
using Git-based deploy). The storefront will now show live products,
offer real UPI/Card payment via Razorpay, and both payment methods
will land in `/admin`.

## Managing products
Edit `data/seed-products.js` (name, price, description, starting
stock, etc.), then restart/redeploy the backend — it merges your
changes in automatically on boot. Existing products keep their live
stock; only new products use the stock number you set in the seed
file. To force stock back to the seed numbers, call:
```
curl -u admin:yourpassword -X POST "https://your-backend-url/admin/api/reseed?resetStock=true"
```

## The order inbox
Visit `https://your-backend-url/admin`, log in with `ADMIN_USER` /
`ADMIN_PASSWORD`. You'll see every order, newest first, with a "mark
shipped" toggle and a "Download CSV" button for bulk record-keeping.

## Limitations to know about
- **Storage is JSON files, not a real database.** Fine for a small
  store's order volume; if you need concurrent-write safety at scale,
  reporting, or multiple server instances, migrate `data/store.js` to
  Postgres/MySQL — it's the only file that touches storage.
- **No stock reservation during checkout.** Stock is checked and
  decremented at order time, not reserved the moment someone starts
  checkout. Under heavy simultaneous demand for the same low-stock
  item, two people could both get through if their requests race —
  unlikely for a small store, but worth knowing.
- **Basic Auth for admin**, not a full user/role system. Fine for one
  store owner; if you add staff accounts later, build proper auth.
