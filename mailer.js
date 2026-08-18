const nodemailer = require("nodemailer");

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, STORE_OWNER_EMAIL } = process.env;

const emailConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS && STORE_OWNER_EMAIL);

let transporter = null;
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

function formatRs(n) {
  return "\u20B9" + Number(n).toLocaleString("en-IN");
}

function orderToHtml(order) {
  const itemRows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 10px 4px 0">${i.name}</td><td style="padding:4px 10px">x${i.qty}</td><td style="padding:4px 0;text-align:right">${formatRs(i.price * i.qty)}</td></tr>`
    )
    .join("");

  return `
    <h2 style="margin:0 0 10px">New order ${order.orderNumber}</h2>
    <p style="margin:0 0 16px;color:#555">Payment: ${order.paymentMethod.toUpperCase()} &middot; Status: ${order.paymentStatus}</p>
    <table style="border-collapse:collapse;margin-bottom:16px">${itemRows}</table>
    <p><strong>Total: ${formatRs(order.total)}</strong> (shipping: ${formatRs(order.shipping)})</p>
    <hr>
    <p>
      <strong>${order.customer.name}</strong><br>
      ${order.customer.phone}<br>
      ${order.customer.address}, ${order.customer.city} - ${order.customer.pincode}
      ${order.customer.notes ? `<br>Note: ${order.customer.notes}` : ""}
    </p>
  `;
}

// Never throws — a failed email should never block an order from
// completing. Errors are logged to the server console instead.
async function sendOrderNotification(order) {
  if (!emailConfigured) {
    console.warn(
      `[mailer] Skipped order email for ${order.orderNumber} — SMTP env vars not set. See .env.example.`
    );
    return { sent: false, reason: "not_configured" };
  }
  try {
    await transporter.sendMail({
      from: MAIL_FROM || SMTP_USER,
      to: STORE_OWNER_EMAIL,
      subject: `New order ${order.orderNumber} — ${formatRs(order.total)}`,
      html: orderToHtml(order)
    });
    return { sent: true };
  } catch (err) {
    console.error(`[mailer] Failed to send order email for ${order.orderNumber}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendOrderNotification, emailConfigured };
