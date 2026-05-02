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
| **Products** | All clients | View products created through Phyllis |
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

### Order Detail Drill-Down

Each order card should open a detail view. The detail view is required for debugging checkout/provider issues without leaving the dashboard.

The detail view should show:

- Full order ID
- Stripe checkout session ID
- Stripe payment intent ID
- Customer email
- Full shipping address
- Full item list with title, size, quantity, unit price, and provider product/variant IDs
- Product image/mockup URL
- Local order status
- Fulfillment provider, such as `printful` or `theprintspace`
- Provider order ID, if one exists
- Provider status, provider error, and retry count
- Raw failure/blocker message when provider submission fails
- Created and updated timestamps

For the current sprint issue, the detail view must make this obvious:

```text
Payment/order exists in Phyllis, but no Printful order was created.
```

That state should show as a provider submission failure or blocker, not as a successful fulfillment.

### Status Color Reference

| Color | Status | Meaning |
|-------|--------|---------|
| Yellow | `paid` / `submitting_to_provider` | Payment received; Phyllis is submitting the order |
| Emerald | `submitted_to_printful` / `submitted_to_provider` | Sent to provider; production is not guaranteed until provider status confirms it |
| Orange | `provider_pending` / `manual_fulfillment` | Provider path needs manual handling or a future supplier API |
| Light green | `shipped` | In transit |
| Grey | `cancelled` / `refunded` | Terminal states |

---

## Products Tab

The Products tab shows products created through Phyllis for your client account.

Each product card should show:

- Product title
- Status, such as `Active`
- Retail price
- Printful product ID
- Deterministic external ID
- Created date
- Mockup image

Example verified Discount Punk product:

```text
Title: Eat My Donkey
Status: Active
Price: $29.99
Printful ID: 430745217
External ID: discount-punk-4149b8b559c5
```

If the Products tab is empty but product creation succeeded, check for a client slug mismatch. During the sprint, one bug saved products under `discountpunk` while the client slug was `discount-punk`; that prevented dashboard visibility until the product row was corrected/backfilled.

If a product appears without an image, check whether `mockup_urls` were saved. Phyllis should store the generated Printful mockup URL or the S3-persisted mockup URL.

---

## Fulfillment Gate

Phyllis no longer uses a client/admin approval queue for ordinary paid orders.

The current operating model is:

```text
Stripe payment succeeds
-> Phyllis saves the order
-> Phyllis submits the order through the selected provider adapter
-> Printful shirt orders appear in the Printful dashboard
-> Printful/vendor dashboard is the final production gate
```

For Printful, do not automatically call the final confirmation endpoint. The Printful dashboard's **Confirm order** button is enough human review for MVP testing.

For collectible posters or any supplier path without a live API, Phyllis should use `provider_pending` or `manual_fulfillment` and show the blocker clearly.

---

## Usage Tab

Shows your billing usage by month.

Discount Punk is on an unlimited sprint/client plan:

```text
Plan: unlimited
Order limit: none
Per-order Phyllis charge: $0 during the sprint/client proof period
```

For standard future clients, the default usage model is:

- **$1.50 per fulfilled order** (standard)
- **5% capped at $3.00 per fulfilled order** (optional cap plan)

The usage tab displays:
- `fulfilledOrders` — orders sent to the fulfillment provider this month
- `productCreations` — number of times the `/products/create` endpoint was called
- plan name, such as `unlimited`, `free_tier`, or `usage_based`
- `freeOrdersRemaining` only for plans that actually have a free monthly cap

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

## API Keys

API keys are visible only in the secure admin dashboard or Replit Secrets. Do not paste keys into docs, screenshots, shared chat, or public repos.

If an API key appears in chat or committed history, treat it as compromised and rotate it.

---

## API Reference (Dashboard Operations)

All endpoints require `X-Api-Key: pk_...` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/me` | Your account info + current month usage |
| `GET` | `/api/me/orders` | List your orders (up to 50) |
| `GET` | `/api/products?client_slug={slug}` | List products for a client |
| `GET` | `/api/products/content.json?client_slug={slug}` | Static-site-friendly product JSON |
| `GET` | `/api/me/usage` | Monthly usage history |
| `GET` | `/api/me/chat-config` | Your chat embed config |
| `PUT` | `/api/me/chat-config` | Update allowedDomains |
| `GET` | `/api/orders` | Client-scoped order list |
| `GET` | `/api/orders/:id` | Client-scoped order details |
| `PATCH` | `/api/orders/:id/status` | Manual operator status correction |
| `POST` | `/api/phyllis/chat` | SSE chat with Phyllis (dashboard context) |
| `POST` | `/api/phyllis/ask` | Non-streaming chat with Phyllis |

Approval endpoints were removed from the ordinary fulfillment flow. Provider submission happens after payment; the vendor dashboard is the final production gate.

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
