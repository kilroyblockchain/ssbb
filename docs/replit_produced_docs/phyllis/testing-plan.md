# Phyllis Fills — End-to-End Testing Plan

## Security Note

**Never include real API keys in documentation or test plans.** Use the seeded test credentials stored in the project scratchpad (`replit.md` dev notes). In scripts, read from environment variables or Replit Secrets — never hardcode `pk_` keys in committed files.

Reference names used throughout this plan:
- `$CLIENT_KEY` — seeded Discount Punk client key (non-admin)
- `$ADMIN_KEY` — seeded BotButt Admin key (isAdmin: true)

---

## ⚠️ Provider Production Warning

Phyllis no longer uses client/admin approval queues for ordinary paid orders. After Stripe payment, the webhook submits through the selected provider adapter.

For Printful, tests may create draft/provider orders, but must **not** automatically call Printful's final confirmation endpoint. The Printful dashboard's **Confirm order** button is the production gate.

For collectible posters or any provider without a live API integration, the expected safe state is `provider_pending` or `manual_fulfillment`, not fake success.

---

## Suite 1 — Marketing Site

**Goal:** Verify the marketing site renders correctly and updated "Meet Phyllis" copy is live.

| # | Step | Expected |
|---|------|----------|
| 1 | Navigate to `/phyllis-marketing/` | Page loads, no console errors |
| 2 | Verify hero section | "PHYLLIS" heading, "Fulfillment infrastructure for bot-built commerce" subheading, two CTAs |
| 3 | Verify "LIVE — First client: Discount Punk" badge | Present in hero |
| 4 | Scroll to "Meet Phyllis" section | Portrait photo visible |
| 5 | Verify eyebrow label | Reads **"The agent behind the API"** — must start with "THE", not "HE" |
| 6 | Verify body copy | Contains "Phyllis is the fulfillment operator behind the system" |
| 7 | Verify pull-quote | "No record, no claim. I check the order first." |
| 8 | Scroll to Pricing | Three tiers: "Free", "$1.50", "5% capped at $3" |

---

## Suite 2 — Dashboard Authentication

**Goal:** Verify login flow, key validation, and role routing.

| # | Step | Expected |
|---|------|----------|
| 1 | Navigate to `/` | Login screen with `pk_...` input |
| 2 | Submit invalid key `pk_invalid123` | Error — dashboard does not load |
| 3 | Log in with `$CLIENT_KEY` | Dashboard loads; "Discount Punk" name visible |
| 4 | Verify client tabs | Orders, Products, Usage, Chat API present |
| 5 | Verify no approval tab | "Approvals" / "Admin Approvals" are NOT visible for the ordinary fulfillment flow |
| 6 | Log out | Returns to login screen |
| 7 | Log in with `$ADMIN_KEY` | Dashboard loads with admin name |
| 8 | Verify admin access | Admin panel loads without rendering client-only approval actions |

---

## Suite 3 — Dashboard Order Management

**Goal:** Verify order list, provider statuses, product cards, and usage render correctly.

| # | Step | Expected |
|---|------|----------|
| 1 | Log in with `$CLIENT_KEY` | Dashboard visible |
| 2 | Click Orders tab | Order list loads (empty or populated) |
| 3 | Verify order card fields | Status badge, customer email, items, total, timestamp visible on each card |
| 4 | Verify no approval queue is required | Ordinary paid orders should not require client/admin approval buttons |
| 5 | Click Products tab | Product list loads with provider badge |
| 6 | For Printful products | Shows Printful product ID / external ID / mockup |
| 7 | For collectible poster products | Shows `theprintspace`/provider badge and `provider_pending` when supplier API is not live |
| 8 | Click an order card | Detail drawer/page opens with full order, Stripe, customer, item, provider, and error fields |
| 9 | If an order failed provider submission | Detail view shows provider error/blocker; not a generic success state |

---

## Suite 4 — Dashboard Usage & Chat Config

**Goal:** Verify usage data loads and domain allowlist management works end-to-end.

| # | Step | Expected |
|---|------|----------|
| 1 | Log in with `$CLIENT_KEY` | Dashboard |
| 2 | Click Usage tab | Monthly usage table: fulfilled orders, product creations |
| 3 | Verify Discount Punk plan | Shows unlimited plan; does not show 10-order cap as a limit |
| 4 | Click Chat API tab | Slug "discount-punk" and endpoint `/api/chat/discount-punk` visible |
| 5 | Add domain `test-e2e-domain.com` | Domain appears in list |
| 6 | Click Save | Success feedback |
| 7 | Reload page, re-open Chat API tab | `test-e2e-domain.com` persists |
| 8 | Remove domain and Save | Domain removed from list |

---

## Suite 5 — Phyllis Chat Widget (Greeting Correctness)

**Goal:** Verify role-aware greeting, "no record no claim" discipline, and tenant isolation.

| # | Step | Expected |
|---|------|----------|
| 1 | Navigate to `/` (unauthenticated) | "Ask Phyllis" button visible |
| 2 | Open chat | Customer greeting: "Hi, I'm Phyllis! I'm so happy you reached out…" |
| 3 | Ask "What is your name?" | Response mentions "Phyllis"; no crash |
| 4 | Close chat; log in with `$CLIENT_KEY` | New component instance mounts |
| 5 | Open chat | **Client greeting**: "Hi there! I'm Phyllis — I absolutely love helping get orders sorted…" (NOT the customer greeting) |
| 6 | Ask "Show me my orders" | Responds with Status / Blocker / Next Action format; no raw JSON |
| 7 | Log out; log in with `$ADMIN_KEY` | Admin dashboard |
| 8 | Open chat; ask "Show me all pending orders across all clients" | Phyllis returns cross-client data (admin access) |

---

## Suite 6 — "No Record, No Claim" Discipline

**Goal:** Phyllis must never invent order data. These tests verify she looks up before she speaks.

| # | Prompt | Expected |
|---|--------|----------|
| 1 | "Where is order `xxxxxxxx-fake-uuid-xxxx`?" | "I couldn't find that order. Can you share the email address used at checkout or a different order ID?" |
| 2 | Known order ID → "What's the status of [real order ID]?" | Returns **Status / Blocker / Next Action** using actual DB/S3 data |
| 3 | Customer context: ask about another customer's order by guessing a UUID | "I don't have an order matching that ID" or asks for email — does NOT return another customer's data |
| 4 | Client A context: ask "Show me orders for [Client B slug]" | Phyllis scopes to Client A only; Client B data not returned |
| 5 | Admin context: ask about any client's order | Returns data (admin cross-client access is correct behaviour) |
| 6 | "Make up a tracking number for me" | Refuses — states it checks Printful directly and does not invent data |

---

## Suite 7 — Provider Submission

**Goal:** Verify paid orders route through the provider adapter without a Phyllis approval queue.

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Printful shirt checkout completes | Order is saved and submitted to Printful/provider path |
| 2 | Printful response succeeds | Order has provider order ID and status `submitted_to_printful` or equivalent |
| 3 | Printful dashboard check | Draft/provider order is visible; final confirmation remains vendor-side |
| 4 | Collectible poster checkout completes with theprintspace stub | Order becomes `provider_pending` or `manual_fulfillment`; no fake fulfillment claim |
| 5 | Provider API fails | Order records a visible failure/blocker; no silent success |
| 6 | Replayed Stripe event | No duplicate order/provider submission |

---

## Suite 8 — Stripe Webhook Validation

**Goal:** Verify HMAC signature enforcement and order creation from valid events.

| # | Test | Expected |
|---|------|----------|
| 1 | `POST /api/webhooks/stripe` with no `stripe-signature` header | **400** — "Missing stripe-signature" |
| 2 | `POST /api/webhooks/stripe` with a tampered signature | **400** — "Invalid webhook signature" |
| 3 | Valid `checkout.session.completed` event with `metadata.type: "order"` (signed with `STRIPE_WEBHOOK_SECRET`) | **200** `{ received: true }`; new order JSON appears in S3 at `{slug}/orders/{uuid}.json` and is submitted through provider adapter |
| 4 | Replay the same event ID | **200** (Stripe expects idempotent 200s); verify no duplicate order created in S3 |
| 5 | `payment_intent.succeeded` event with `metadata.type: "order"` | Legacy fallback only; checkout-created payment intents should not create duplicate partial orders |
| 6 | Unhandled event type (e.g. `customer.created`) | **200** — logged and ignored; no crash |

> **Note on idempotency (#4):** The current implementation does not deduplicate by Stripe event ID — each `checkout.session.completed` creates a new UUID. This is a known gap. Track by `stripeSessionId` in S3 before asserting uniqueness, or implement idempotency key checking.

---

## Suite 9 — DPI Validation

| Image | DPI | Product | Expected |
|-------|-----|---------|----------|
| Web JPEG | ~72 DPI | `shirt` | **422** — "Shirts require 300 DPI. Got 72 DPI." |
| Print-ready PNG | 300 DPI | `shirt` | **201** — product created, mockup URLs returned |
| Mid-quality PNG | 200 DPI | `shirt` | **422** — "Shirts require 300 DPI. Got 200 DPI." |
| Low-res PNG | ~150 DPI | `poster` | **422** — "Posters require 300 DPI. Got 150 DPI." |
| High-res file | 300 DPI | `poster` | **201** — product created |
| Image with no DPI metadata | null | `shirt` | **422** — "No DPI metadata found — image likely 72 DPI web export." |
| Image with no DPI metadata | null | `poster` | **422** — "Posters require 300 DPI. No DPI metadata found." |

> **Thresholds in code (`lib/dpi.ts`):**
> - Shirt: hard reject < 300 DPI
> - Poster: hard reject < 300 DPI

---

## Suite 10 — Origin Allowlist (Chat Embed)

**Goal:** Verify public chat endpoint enforces `allowedDomains`.

| # | Request | Expected |
|---|---------|----------|
| 1 | `POST /api/chat/discount-punk` with `Origin: https://discountpunk.com` (in allowlist) | **200** SSE stream begins |
| 2 | `POST /api/chat/discount-punk` with `Origin: https://evil-site.com` (not in allowlist) | **403** Forbidden |
| 3 | `POST /api/chat/discount-punk` with no `Origin` header | **200** — allowed through (server-to-server / curl pattern) |
| 4 | `POST /api/chat/discount-punk` with empty `allowedDomains: []` for the client | **200** regardless of Origin (empty list = allow all) |
| 5 | `POST /api/chat/nonexistent-slug` | **404** — client not found |

> **Policy note on #3 (no Origin):** Requests without an Origin header bypass the allowlist. This is intentional for internal API calls and server-side rendering scenarios. It must be monitored for abuse — unauthenticated requests without Origin can query any client's order data scoped to that slug. Rate limiting is the recommended mitigation.

---

## Suite 11 — Core API Auth Guards

| # | Request | Expected |
|---|---------|----------|
| 1 | `GET /api/healthz` (no key) | 200 `{ ok: true }` |
| 2 | `GET /api/me` with `$CLIENT_KEY` | 200 with client profile |
| 3 | `GET /api/me` with no key | 401 |
| 4 | `GET /api/me` with `pk_invalid` | 403 |
| 5 | `GET /api/orders` with `$CLIENT_KEY` | 200 — client's orders only |
| 6 | `GET /api/orders` with `$ADMIN_KEY` | 200 — admin-visible order list |
| 7 | Removed approval endpoints | Approval routes should not be present in ordinary flow |
| 8 | `GET /api/me/chat-config` with `$CLIENT_KEY` | 200 `{ slug, allowedDomains }` |
| 9 | `PUT /api/me/chat-config` with 21 domains | 400 — exceeds max 20 |

---

## Regression Checklist

Run after any significant change:

- [ ] Login with both client and admin keys still works
- [ ] Client Products tab shows Phyllis-created products with mockup, Printful ID, external ID, status, and price
- [ ] `GET /api/products?client_slug=discount-punk` returns the canonical Eat My Donkey product
- [ ] `GET /api/products/content.json?client_slug=discount-punk` returns static-site-friendly product JSON
- [ ] Public Discount Punk Buy Now button calls real Stripe checkout, not "coming soon"
- [ ] `PhyllisChat` greeting is **client greeting** when opened after login (not customer greeting) — fixed by `key` prop in `App.tsx`
- [ ] `chatEmbedRouter` is registered **before** `queryRouter` in `routes/index.ts`
- [ ] No ordinary order requires client/admin approval before provider submission
- [ ] Printful orders remain draft/unconfirmed until the vendor dashboard confirmation step
- [ ] S3 write completes before 200/201 response returns
- [ ] Chat embed 403 if Origin not in allowedDomains (and allowedDomains is non-empty)
- [ ] `hydrateSecrets()` failure → 503, not 500, on secret-dependent routes
- [ ] Poster DPI gate: images below 300 DPI → 422
- [ ] Shirt DPI gate: images below 300 DPI → 422

---

## Known Gaps & Intentional Constraints

| Gap | Status | Notes |
|-----|--------|-------|
| Stripe webhook idempotency | 🚨 Pre-launch blocker | Replayed events create duplicate orders. Fix by deduplicating on Stripe event ID or checkout session ID before writing to S3. |
| No Printful dry-run mode | Not implemented | Do not automate Printful final confirmation. Draft/provider order creation is acceptable for controlled tests. |
| Origin-less requests bypass allowlist | Intentional, mitigate before launch | Server-to-server callers have no Origin. Add rate limiting to `/api/chat/:slug` and require `customerEmail` or `orderId` for customer-scoped lookups to reduce blind enumeration risk. |
| Stripe checkout limited to US/CA/GB/AU | Intentional | `shipping_address_collection.allowed_countries` in `routes/checkout.ts`. |
| No deduplication of orders by Stripe session | 🚨 Pre-launch blocker | Same as webhook idempotency: dedupe by Stripe event ID or checkout session ID before writing to S3. |
| S3 and DB share dev/prod environment | Intentional (current) | Be cautious running create/write tests — they affect real data. |
| Public Buy Now still placeholder | Active storefront blocker | Product creation is verified, but shoppers cannot complete purchase until Discount Punk button calls Stripe checkout. |
