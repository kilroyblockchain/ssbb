# Phyllis — Client & Admin Dashboard Guide

This guide covers everything you need to operate the Phyllis dashboard — both as a **merchant client** managing your own storefront and as a **Phyllis admin** with access to all clients.

**Note:** Marketing uses "Phyllis" — in chat she introduces herself as "Phyllis"

---

## Logging In

Go to your Phyllis dashboard URL. On the login screen, enter your **API key** (it starts with `pk_`). Click **Enter Dashboard**.

Your API key was issued when your account was created. Keep it secret — it grants full access to your account. If it is compromised, contact your Phyllis administrator to have it rotated.

> **Admin users** have a special flag (`isAdmin: true`) in the database. Their API key unlocks additional tabs and capabilities described below.

---

## Dashboard Overview

After logging in you will see your account name, slug, and current month's usage summary in the header. The dashboard has the following tabs:

| Tab | Who sees it | Purpose |
|-----|-------------|---------|
| **Orders** | All clients | View all your orders |
| **Approvals** | All clients | Orders awaiting your review |
| **Admin Approvals** | Admins only | Orders awaiting final admin check |
| **Usage** | All clients | Monthly billing and usage metrics |
| **Chat API** | All clients | Embed chat config and domain allowlist |

---

## Orders Tab

Shows all orders associated with your client slug (up to 50 most recent). Each order card shows:

- **Order ID** (truncated UUID)
- **Status** (color-coded — see status reference below)
- **Items** — product title, size, quantity
- **Customer email** and **shipping address**
- **Order total**
- **Printful order ID** (once submitted to Printful)
- **Timestamps** — created and last updated

### Status Color Reference

| Color | Status | Meaning |
|-------|--------|---------|
| Yellow | `pending_client_approval` | Needs your approval |
| Blue | `pending_admin_approval` | Waiting for admin final check |
| Emerald | `submitted_to_printful` | In production |
| Light green | `shipped` | In transit |
| Red | `rejected_by_client` | You rejected it |
| Dark red | `rejected_by_admin` | Admin rejected it |
| Grey | `cancelled` / `refunded` | Terminal states |

---

## Approvals Tab (Client Stage 1)

This tab shows orders in `pending_client_approval` status — orders that have been paid but not yet reviewed by you.

**Your job at this stage:** Check the design, size, and shipping address for obvious problems. You are the first line of defense before the order goes to Printful.

### Approving an Order

1. Click **Approve** on any pending order.
2. Optionally add a note (e.g., "Design looks great, confirmed color").
3. The order moves to `pending_admin_approval` and disappears from your queue.

### Rejecting an Order

1. Click **Reject** on the order.
2. You will be prompted for a reason note. Be specific — this note is stored and visible to the admin and to Phyllis. Example: "Design file is blurry — needs 300 DPI version."
3. The order moves to `rejected_by_client`. No further action is taken until the underlying issue is resolved.

> **Important:** You can only act on orders in `pending_client_approval`. If an order is already in `pending_admin_approval` or beyond, it is no longer in your approval queue.

---

## Admin Approvals Tab (Admin Only)

Admins see a second approval queue: orders in `pending_admin_approval` status.

**Admin's job:** Final quality gate before the order is physically sent to Printful. At this point the client has already signed off.

### Admin Approve

Click **Admin Approve**. The system immediately:
1. Calls the Printful API to create a production order.
2. Stores the Printful order ID on the order record in S3.
3. Updates the order status to `submitted_to_printful`.
4. Logs a `order_fulfilled` usage event for the client.

This action is **irreversible** — once submitted to Printful, the order goes into production.

### Admin Reject

Click **Admin Reject** and enter a specific reason. The order moves to `rejected_by_admin`. The client will see this in their order list. You should reach out directly to explain next steps.

---

## Usage Tab

Shows your billing usage by month. The free tier covers the **first 10 fulfilled orders per month** at no charge. After that:

- **$1.50 per fulfilled order** (standard)
- **5% capped at $3.00 per fulfilled order** (optional cap plan)

The usage tab displays:
- `fulfilledOrders` — orders that have been admin-approved and sent to Printful this month
- `productCreations` — number of times the `/products/create` endpoint was called
- `freeOrdersRemaining` — how many free orders you have left this month (max 10)

Usage resets on the first of each calendar month. Historical months are also shown.

---

## Chat API Tab

This tab lets you embed Phyllis into your storefront so your customers can ask order status questions directly on your website.

### Your Chat Embed Endpoint

```
POST https://phyllis-fills.replit.app/api/chat/{your-slug}
```

Replace `{your-slug}` with your client slug (shown in the tab).

**Request body:**
```json
{
  "message": "Where is my order?",
  "customerEmail": "customer@example.com",
  "history": []
}
```

**Response** (Server-Sent Events stream):
```
data: {"content":"Hi! I'm Phyllis..."}
data: {"done":true}
```

### Allowed Domains

The chat endpoint validates the `Origin` header of incoming requests against your allowed domains list. Requests from unlisted origins receive a `403 Forbidden` response.

**To add a domain:**
1. Type the domain in the input field (e.g., `discountpunk.com` or `www.discountpunk.com`).
2. Click **Add**. The domain appears in your list.
3. Click **Save** to persist the change.

**To remove a domain:** Click the × next to any domain and then Save.

You can have up to **20 allowed domains**. Include both `example.com` and `www.example.com` if your storefront uses both.

> The Origin header is set automatically by browsers. Server-to-server calls without an Origin header are allowed through (for testing). Add your domains before going live.

### Embedding Example (HTML/JS)

```html
<script>
async function askPhyllis(message, email) {
  const resp = await fetch('https://phyllis-fills.replit.app/api/chat/discount-punk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, customerEmail: email, history: [] })
  });

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value);
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = JSON.parse(line.slice(6));
      if (data.content) process(data.content); // append to your UI
      if (data.done) break;
    }
  }
}
</script>
```

---

## Asking Phyllis in the Dashboard

The floating **Ask Phyllis** button (bottom-right corner) opens a chat panel. In dashboard context, Phyllis has full access to your order data and responds with operator-level detail.

**As a client**, you can ask:
- "Show me all orders awaiting my approval"
- "What's the status of order abc-1234?"
- "How many orders did I fulfill this month?"
- "Is anything blocked right now?"

**As an admin**, Phyllis also has access to:
- All orders across all clients
- Printful order statuses via live API lookup
- Usage data per client

Phyllis always responds in the **Status → Blocker → Next Action** format for order questions. This is intentional — it forces every answer to be actionable.

---

## Seeded Credentials (Reference)

| Account | API Key | Notes |
|---------|---------|-------|
| BotButt Admin | `pk_b97bfe...` | `isAdmin: true` — full access |
| Discount Punk | `pk_ed02eb...` | Standard client account |

(Full keys are in the project scratchpad — do not commit them to public repos.)

---

## API Reference (Dashboard Operations)

All endpoints require `X-Api-Key: pk_...` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/me` | Your account info + current month usage |
| `GET` | `/api/me/orders` | List your orders (up to 50) |
| `GET` | `/api/me/usage` | Monthly usage history |
| `GET` | `/api/me/chat-config` | Your chat embed config |
| `PUT` | `/api/me/chat-config` | Update allowedDomains |
| `GET` | `/api/orders/pending` | Pending orders for your approval stage |
| `POST` | `/api/orders/:id/client-approve` | Approve at client stage |
| `POST` | `/api/orders/:id/client-reject` | Reject at client stage |
| `POST` | `/api/orders/:id/admin-approve` | Admin final approve → submits to Printful |
| `POST` | `/api/orders/:id/admin-reject` | Admin reject |
| `POST` | `/api/phyllis/chat` | SSE chat with Phyllis (dashboard context) |
| `POST` | `/api/phyllis/ask` | Non-streaming chat with Phyllis |

For approve/reject endpoints, the request body is optional: `{ "note": "reason string" }`.

---

## Troubleshooting

**Dashboard shows no orders.**
Check that your `clientSlug` matches the S3 prefix. Orders are stored at `{slug}/orders/{uuid}.json`. If the slug changed, old orders are at the old prefix.

**Approve button gives a 409 error.**
The order is no longer in the expected status (e.g., someone already acted on it). Refresh the approvals tab.

**Admin Approve returns a 502.**
Printful submission failed. Check the API server logs. Common causes: invalid design URL (404), artwork DPI below minimum, Printful API outage.

**Chat embed returns 403.**
Your storefront domain is not in the allowedDomains list. Add it in the Chat API tab and save.
