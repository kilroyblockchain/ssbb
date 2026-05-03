# Phyllis Fills — Technical Reference

Complete technical documentation for developers working on or integrating with Phyllis Fills.

---

## Repository Structure

```
phyllis-fills/
├── artifacts/
│   ├── api-server/          # Express API (Node.js + TypeScript)
│   ├── phyllis-dashboard/   # React + Vite client dashboard
│   └── phyllis-marketing/   # React + Vite marketing site
├── lib/
│   ├── db/                  # Drizzle ORM schema + migrations (PostgreSQL)
│   └── integrations-openai-ai-server/  # OpenAI client singleton
├── docs/                    # This documentation
├── pnpm-workspace.yaml      # pnpm monorepo + catalog pins
└── tsconfig.base.json       # Shared strict TypeScript config
```

All packages use the `@workspace/` prefix. Package management is via **pnpm workspaces**. Do not use `npm` or `yarn`.

---

## Running Locally

Each artifact is a separate workflow. Do **not** run `pnpm dev` at the root — each service needs its own `PORT` and `BASE_PATH` env vars set by the workflow runner.

| Workflow | Command | Port |
|----------|---------|------|
| API Server | `pnpm --filter @workspace/api-server run dev` | `$PORT` |
| Dashboard | `pnpm --filter @workspace/phyllis-dashboard run dev` | `$PORT` |
| Marketing | `pnpm --filter @workspace/phyllis-marketing run dev` | `$PORT` |

A reverse proxy routes all traffic through `localhost:80`:
- `/api` → API Server
- `/` → Dashboard
- `/phyllis-marketing` → Marketing Site

To test API routes: `curl localhost:80/api/healthz`

---

## API Server

**Location:** `artifacts/api-server/`  
**Entry point:** `src/index.ts`  
**Framework:** Express 4 + pino logging  
**Auth:** custom `X-Api-Key` middleware

### Current Verified Sprint State

As of May 2, 2026:

```text
BotButt -> Phyllis product tool: verified
Phyllis -> Printful product creation: verified
Printful mockup generation: verified
Product idempotency: verified
Discount Punk dashboard Products tab: verified
Public Discount Punk checkout UI: new look visible in Phyllis dashboard
Latest paid order reached Printful: verified after follow-up
Discount Punk billing plan: unlimited sprint/client plan
Python print-prep endpoint: implemented and tested
API test suite: 188/188 passing after print-prep work
```

Verified Discount Punk product:

```text
Title: Eat My Donkey
Printful ID: 430745217
External ID: discount-punk-4149b8b559c5
Price: $29.99
Dashboard status: Active
```

### Startup Sequence

1. `hydrateSecrets()` — loads secrets from AWS Secrets Manager into a module-level cache
2. `runMigrations()` — applies any pending Drizzle migrations
3. `app.listen()` on `$PORT`

If `hydrateSecrets()` fails (e.g., bad AWS credentials), the server starts but all secret-dependent routes return `503 Service not ready`.

### Route Registry

Defined in `src/routes/index.ts`. **Order matters** — named routes must come before wildcard routes:

```
chatEmbedRouter      (named: /api/chat/:clientSlug)
phyllisRouter        (named: /api/phyllis/chat, /api/phyllis/ask)
queryRouter          (wildcard catch-all)
adminRouter
clientDashboardRouter
```

---

## Authentication Middleware

Located in `src/middleware/apiKey.ts`.

### `requireApiKey`

Reads `X-Api-Key` header, looks up the `clients` table, and attaches to `req`:

```typescript
req.clientId: string        // UUID from DB
req.clientSlug: string      // e.g. "discount-punk"
req.isAdmin: boolean        // from clients.is_admin
```

Returns `401` if missing, `403` if not found or inactive.

### `requireAdmin`

Middleware that checks `req.isAdmin === true`. Returns `403` if not admin. Must be used after `requireApiKey`.

### `optionalApiKey`

Same as `requireApiKey` but does not reject unauthenticated requests. Sets `req.clientId` to `undefined` if no key is provided.

### Extending `Request` (TypeScript)

```typescript
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      clientId?: string;
      clientSlug?: string;
      isAdmin?: boolean;
    }
  }
}
```

---

## All API Endpoints

Base path: `/api`

### Health

```
GET /api/healthz
Response: { ok: true, uptime: number }
```

### Print Prep

```
POST /api/print-prep/process
Auth: X-Api-Key
```

Prepares a low-resolution/generated/display image for print. This endpoint belongs on the Phyllis side because Phyllis is the print-readiness and fulfillment gate.

Request:

```json
{
  "clientSlug": "discount-punk",
  "sourceImageUrl": "https://...",
  "productType": "shirt",
  "targetWidth": 3600,
  "targetHeight": 4500,
  "removeBackground": true,
  "upscale": true,
  "sharpen": true
}
```

Response:

```json
{
  "success": true,
  "printReadyUrl": "https://ssbb-media-prod.s3.amazonaws.com/discount-punk/images/print-ready/{hash}.png",
  "width": 3600,
  "height": 4500,
  "dpi": 300,
  "hasAlpha": true,
  "qualityPassed": true,
  "sourceImageUrl": "https://...",
  "sourceWidth": 1024,
  "sourceHeight": 1024,
  "prepMethod": "rembg+pillow-lanczos+sharpen",
  "warnings": ["MVP resize used; not AI super-resolution"]
}
```

Processing:

```text
download source image
-> remove background with rembg
-> upscale to real print pixels
-> preserve aspect ratio
-> center on transparent canvas
-> apply mild sharpening
-> save PNG with 300 DPI metadata
-> upload to S3
-> run existing Phyllis quality validation
```

Rules:

- 300 DPI metadata alone is not enough; the output must also have enough pixels.
- Do not stretch source art to the target shape.
- Do not create a product if print prep or quality validation fails.
- Reuse deterministic output when source image + target size + product type are unchanged.
- The default shirt canvas is `3600 x 4500`.
- The output S3 path is `discount-punk/images/print-ready/{sha256}.png`.
- `removeBackground: true` uses Python `rembg`/U2-Net through ONNX Runtime. The first call may take roughly 30 seconds while the model downloads; later calls should be faster.
- If output dimensions, alpha channel, or DPI fail validation, return `422` and do not upload the file.
- Dev smoke testing proved the image pipeline. A dev-only S3 IAM limitation may block upload with restricted credentials; production should use the full project credentials path.

BotButt should call this only when a product does not already exist. Existing products skip print prep and go straight to checkout.

### Products

```
POST /api/products/create
Auth: optional (X-Api-Key)

Request:
{
  "design_url": "https://...",          // publicly accessible URL
  "title": "My Tee",
  "description": "optional",
  "colors": ["black"],                  // optional
  "product_type": "shirt" | "poster",   // default: "shirt"
  "retail_price": "29.99"               // optional
}

Response 201:
{
  "success": true,
  "idempotent": false,
  "printful_product_id": 12345,
  "mockup_urls": ["https://s3.../mockup-0.png"],
  "mockups": ["https://s3.../mockup-0.png"],
  "external_id": "discount-punk-4149b8b559c5",
  "product": {
    "printful_id": 12345,
    "title": "My Tee",
    "design_url": "https://...",
    "dpi": 300,
    "dpi_warning": null,
    "mockup_urls": ["https://s3.../mockup-0.png", ...],
    "variants": [...]
  }
}

Response 422: DPI below minimum
{
  "error": "Image DPI too low: 72 DPI. Minimum required: 300 DPI.",
  "dpi": 72,
  "product_type": "shirt"
}
```

Idempotent response for an already-created product:

```json
{
  "success": true,
  "idempotent": true,
  "printful_product_id": 430745217,
  "mockups": ["https://ssbb-media-prod.s3.amazonaws.com/discountpunk/mockups/eat-my-donkey-mockup-0.png"],
  "external_id": "discount-punk-4149b8b559c5"
}
```

**DPI rules:**
- Shirts: 300 DPI minimum (hard reject below 300)
- Posters: 300 DPI minimum (hard reject below 300)

DPI is validated using the `sharp` library by fetching the image and checking metadata.

### Product Catalog

```
GET /api/products?client_slug=discount-punk
Auth: optional/read-only, depending on deployment policy
```

Returns products stored in Phyllis's products table, using BotButt-compatible field names:

```json
{
  "success": true,
  "products": [
    {
      "title": "Eat My Donkey",
      "printful_product_id": 430745217,
      "mockup_urls": ["https://ssbb-media-prod.s3.amazonaws.com/discountpunk/mockups/eat-my-donkey-mockup-0.png"],
      "mockups": ["https://ssbb-media-prod.s3.amazonaws.com/discountpunk/mockups/eat-my-donkey-mockup-0.png"],
      "retail_price": "29.99"
    }
  ]
}
```

Static-site-friendly product JSON:

```
GET /api/products/content.json?client_slug=discount-punk
```

This endpoint is shaped for static site generation:

```json
[
  {
    "slug": "discount-punk-4149b8b559c5",
    "title": "Eat My Donkey",
    "printful_product_id": 430745217,
    "mockup_url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/mockups/eat-my-donkey-mockup-0.png",
    "retail_price": "29.99"
  }
]
```

If Discount Punk remains static, a build step can write:

```bash
curl https://phyllis-fills.replit.app/api/products/content.json?client_slug=discount-punk > src/content/products.json
```

### Orders

```
POST /api/orders/submit
Auth: none (legacy direct-submit route)

⚠️ **Internal/dev-only:** This route is unauthenticated and must not be exposed to public production traffic. Require `X-Api-Key`, firewall it, or remove it before public launch.

Request:
{
  "recipient": {
    "name": "Jane Smith",
    "address1": "123 Main St",
    "city": "Austin",
    "state_code": "TX",         // 2-letter US state
    "country_code": "US",       // default: "US"
    "zip": "78701",
    "email": "jane@example.com" // optional
  },
  "items": [
    {
      "variant_id": 4017,       // Printful variant ID, OR
      "size": "M",              // size string maps via PRINT_PRESET_VARIANT_IDS
      "quantity": 1,
      "design_url": "https://..."
    }
  ]
}

Response 201:
{
  "success": true,
  "printful_order_id": 99999,
  "status": "draft"
}
```

**Printful variant IDs (Bella+Canvas 3001 Black):**

| Size | Variant ID |
|------|-----------|
| XS | 9527 |
| S | 4016 |
| M | 4017 |
| L | 4018 |
| XL | 4019 |
| 2XL | 4020 |
| 3XL | 5295 |
| 4XL | 5310 |
| 5XL | 12871 |

### Order Detail

```
GET /api/orders/:orderId
Auth: X-Api-Key
```

Returns the complete order record for dashboard drill-down views.

Required response fields for debugging:

```json
{
  "id": "uuid",
  "clientSlug": "discount-punk",
  "status": "submitted_to_provider | provider_pending | printful_failed | ...",
  "stripeSessionId": "cs_...",
  "stripePaymentIntentId": "pi_...",
  "customerEmail": "customer@example.com",
  "shippingAddress": {
    "name": "Customer Name",
    "line1": "...",
    "city": "...",
    "state": "...",
    "postal_code": "...",
    "country": "US"
  },
  "items": [
    {
      "title": "Eat My Donkey",
      "size": "XL",
      "quantity": 1,
      "unitPrice": "29.99",
      "printfulProductId": 430745217,
      "providerProductId": "430745217",
      "providerVariantId": "..."
    }
  ],
  "fulfillmentProvider": "printful",
  "providerOrderId": null,
  "providerStatus": "failed",
  "providerError": "Printful error message or adapter failure",
  "retryCount": 0,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

If the payment/order exists in Phyllis but no Printful order exists, the API must expose the exact provider blocker. Do not hide this behind a generic dashboard status.

### Checkout (Discount Punk)

```
POST /api/discountpunk/checkout/create-session
Auth: optional

Request:
{
  "items": [
    {
      "productTitle": "Anarchist Tee",
      "productType": "tshirt" | "poster",
      "imageUrl": "https://...",
      "size": "L",
      "quantity": 1,
      "price": 29.99
    }
  ],
  "successUrl": "https://discountpunk.com/checkout/success.html",  // optional
  "cancelUrl": "https://discountpunk.com/shop.html"                 // optional
}

Response 200:
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_live_..."
}
```

Redirect the customer to `url`. Stripe handles payment collection. On success, Stripe fires a `checkout.session.completed` webhook.

### Webhooks

```
POST /api/discountpunk/webhooks/stripe
POST /api/webhooks/stripe
Headers: stripe-signature (required — HMAC validation)
Body: raw bytes (do NOT parse as JSON before passing to stripe.webhooks.constructEvent)
Response: { "received": true }
```

**Handled events:**
- `checkout.session.completed` → saves order to S3 and submits through the selected provider adapter
- `payment_intent.succeeded` → legacy fallback only; checkout sessions should be handled by `checkout.session.completed`
- All other events → logged and ignored

Order JSON is saved to S3 at `{clientSlug}/orders/{uuid}.json`.

### Fulfillment Submission

All require `X-Api-Key`.

```
GET /api/orders
  → Client-scoped order list

GET /api/orders/:orderId
  → Client-scoped order details

PATCH /api/orders/:orderId/status
  → Manual status correction / operator update
```

Phyllis no longer uses a two-stage client/admin approval queue for ordinary paid orders. After payment, the webhook submits through the selected `FulfillmentAdapter`.

Printful shirt orders should be created as provider/draft orders. Do not automatically call Printful's final confirm endpoint. The Printful dashboard remains the human production gate.

Provider-aware statuses:

- `submitting_to_provider`
- `submitted_to_printful`
- `submitted_to_provider`
- `provider_pending`
- `manual_fulfillment`
- `in_production`
- `shipped`

### Phyllis AI

```
POST /api/phyllis/chat        (streaming SSE)
POST /api/phyllis/ask         (blocking JSON)
Auth: optional (role determined by auth state)

Request:
{
  "message": "What orders are pending?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "customerEmail": "optional — scopes order lookup for unauthenticated requests"
}

SSE stream format:
data: {"content":"Hi there!..."}
data: {"content":" more tokens..."}
data: {"done":true}

JSON response (ask):
{
  "response": "Status: ...\nBlocker: ...\nNext action: ...",
  "role": "admin" | "client" | "customer"
}
```

**Roles:**
- `admin` — `isAdmin: true` — sees all clients' orders
- `client` — authenticated, `isAdmin: false` — sees own orders only
- `customer` — unauthenticated — scoped by provided email

**Model:** `gpt-5.1` (both chat and ask endpoints)

**Tools available:**

| Tool | Signature | Scope |
|------|-----------|-------|
| `list_orders` | `(filter?: string)` | All orders for client (or all clients if admin) |
| `get_order` | `(orderId: string)` | Single order by ID |
| `get_printful_status` | `(orderId: string)` | Live Printful status + tracking via API |

Tool context object:
```typescript
{
  clientId: string | null,
  isAdmin: boolean,
  customerEmail: string | null,
  clientSlug: string | null
}
```

### Chat Embed (Public)

```
POST /api/chat/:clientSlug
Auth: Origin header validated against client.allowedDomains[]

Request: same as /api/phyllis/chat
Response: same SSE stream

403 if Origin is not in allowedDomains (and Origin header is present)
```

**Model:** `gpt-4.1`

Origin validation logic: if `Origin` header is present AND `allowedDomains` is non-empty AND the parsed hostname is not in the list → `403`.

### Client Dashboard

All require `X-Api-Key`.

```
GET /api/me
Response: { client: { id, name, slug, contactEmail, active, createdAt }, currentMonth: MonthlyUsage }

GET /api/me/orders
Response: { orders: OrderRecord[] }   // up to 50, from S3 prefix {slug}/orders/

GET /api/me/usage
Response: { usage: MonthlyUsage[] }   // all months, ordered by yearMonth

GET /api/me/chat-config
Response: { slug: string, allowedDomains: string[] }

PUT /api/me/chat-config
Body: { "allowedDomains": ["example.com", "www.example.com"] }   // max 20
Response: { "ok": true }
```

Discount Punk plan requirement:

```json
{
  "client": {
    "slug": "discount-punk",
    "plan": "unlimited"
  },
  "currentMonth": {
    "fulfilledOrders": 12,
    "productCreations": 4,
    "freeOrdersRemaining": null,
    "billableOrders": 0
  }
}
```

For `plan: "unlimited"`, the dashboard should not show "10 free remaining" as a limit, should not block order submission based on count, and should not charge per order during the sprint/client proof period.

---

## Database Schema

**ORM:** Drizzle ORM  
**DB:** PostgreSQL (Replit-managed)  
**Schema location:** `lib/db/src/schema/index.ts`  
**Migrations:** `lib/db/drizzle/` (auto-run at startup)

### `clients`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | Auto-generated |
| `name` | `text` | Display name |
| `slug` | `text` UNIQUE | URL-safe identifier, used as S3 prefix |
| `api_key` | `text` UNIQUE | `pk_` prefixed hex string |
| `is_admin` | `boolean` | `false` by default |
| `contact_email` | `text` nullable | |
| `active` | `boolean` | `true` by default; `false` blocks auth |
| `allowed_domains` | `text[]` | Chat embed Origin allowlist |
| `printful_store_id` | `text` nullable | Per-client Printful store ID; null falls back to platform default |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

### `products`

Stores Phyllis-created product metadata for dashboard and catalog views.

Important fields include:

| Column | Notes |
|--------|-------|
| `client_id` / `client_slug` | Client ownership and lookup scope |
| `title` | Product title |
| `printful_product_id` | Printful sync product ID |
| `external_id` | Deterministic idempotency key, e.g. `discount-punk-4149b8b559c5` |
| `mockup_urls` | Stored mockup URLs from S3 or Printful fallback |
| `retail_price` | Display price |
| `status` | Product status, e.g. `active` |

### `usage_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK → `clients.id` | |
| `event_type` | `text` | `product_created`, `order_fulfilled` |
| `order_id` | `text` nullable | |
| `product_id` | `text` nullable | |
| `metadata` | `text` nullable | JSON string |
| `created_at` | `timestamp` | |

### `monthly_usage`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK | |
| `year_month` | `text` | Format: `2025-05` |
| `fulfilled_orders` | `integer` | Incremented on each `order_fulfilled` event |
| `product_creations` | `integer` | Incremented on each `product_created` event |
| `updated_at` | `timestamp` | |

Unique constraint: `(client_id, year_month)` — one row per client per month.

### `conversations` and `messages`

Defined in `lib/db/src/schema/conversations.ts` and `messages.ts`. Used for persisting chat history if enabled.

---

## S3 Storage Layout

Bucket is configured via `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets. Region: `us-east-1`.

```
{clientSlug}/
  orders/
    {uuid}.json          ← full OrderRecord
  mockups/
    {product-slug}-mockup-0.png
    {product-slug}-mockup-1.png
    {product-slug}-mockup-2.png
```

**OrderRecord JSON schema:**

```typescript
{
  id: string;                    // UUID
  clientId?: string;             // UUID — from Stripe metadata
  customerEmail: string | null;
  items: Array<{
    productTitle: string;
    productType: string;
    imageUrl: string;
    size: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
  total: number;                 // USD, e.g. 29.99
  status: string;                // see state machine below
  statusNote?: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  printfulOrderId: number | null;
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

---

## Order State Machine

```
                    ┌──────────────────────────────────┐
                    │         paid (Stripe)            │
                    └─────────────┬────────────────────┘
                                  │ webhook: checkout.session.completed
                                  ▼
                    submitting_to_provider
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      submitted_to_printful   provider_pending/manual_fulfillment
              │                     │
      vendor dashboard        manual supplier workflow
      final confirmation
              │
              ▼
        in_production
              │
           shipped
```

Stripe checkout completion is the canonical order-creation event. Provider submission writes back to S3 immediately with the provider order ID/status when available.

---

## Secrets Management

Secrets are loaded once at startup via `src/lib/secrets.ts` using `hydrateSecrets()`, which reads from AWS Secrets Manager. After loading they are cached in a module-level object accessible via `getSecrets()`.

**Required secrets:**

| Secret Name | Used by |
|-------------|---------|
| `PRINTFUL_API_KEY` | `lib/printful.ts` — all Printful API calls |
| `STRIPE_SECRET_KEY` | `routes/checkout.ts`, `routes/webhooks.ts` |
| `STRIPE_PUBLISHABLE_KEY` | Dashboard frontend (Stripe.js) |
| `STRIPE_WEBHOOK_SECRET` | Webhook HMAC validation |
| `AWS_ACCESS_KEY_ID` | S3 read/write |
| `AWS_SECRET_ACCESS_KEY` | S3 read/write |
| `SESSION_SECRET` | Express session signing |
| `OPENAI_API_KEY` | Phyllis AI agent — handled by Replit integration |

If `getSecrets()` is called before `hydrateSecrets()` completes, it throws. Routes catch this and return `503`.

---

## Logging

**Never use `console.log` in server code.**

- In route handlers: `req.log.info(...)`, `req.log.error(...)`, `req.log.warn(...)`
- Outside of request context: use the singleton `import { logger } from '../lib/logger.js'`

pino structured JSON logs. Each log line is a JSON object with `level`, `time`, `msg`, and any extra fields passed as the first argument.

---

## OpenAI Integration

The `@workspace/integrations-openai-ai-server` package exposes a pre-configured `openai` client that routes through Replit's AI proxy.

```typescript
const { openai } = await import("@workspace/integrations-openai-ai-server");

const response = await openai.chat.completions.create({
  model: "gpt-5.1",           // internal Phyllis: gpt-5.1
  // model: "gpt-4.1",         // public chat embed: gpt-4.1
  messages: [...],
  tools: [...],
  tool_choice: "auto",
  max_completion_tokens: 1024,
});
```

The client is imported dynamically (`await import(...)`) to avoid circular dependency issues with the secrets loading order.

---

## Multi-Tenancy

Each client is isolated by their `slug`:

| Resource | Isolation mechanism |
|----------|---------------------|
| S3 orders | `{slug}/orders/` path prefix |
| S3 mockups | `{slug}/mockups/` path prefix |
| DB usage | `client_id` FK on all usage tables |
| API auth | `clientId` scoping in all middleware |
| Chat embed | `allowedDomains` per client |
| Phyllis tools | `clientId` context filters all S3 reads |

Admin users (`isAdmin: true`) bypass client scoping and see all records.

---

## Adding a New Client

1. **Insert a DB row** in the `clients` table:
   ```sql
   INSERT INTO clients (name, slug, api_key, is_admin, contact_email, allowed_domains)
   VALUES ('New Store', 'new-store', 'pk_<hex>', false, 'owner@newstore.com', '{}');
   ```

2. **Generate an API key** — use any secure random hex generator:
   ```bash
   node -e "console.log('pk_' + require('crypto').randomBytes(24).toString('hex'))"
   ```

3. **Create S3 prefixes** — they are created on first write; no manual setup needed.

4. **For checkout**: Add a new route in `routes/checkout.ts` mirroring the Discount Punk route, or generalize the existing one to use `req.clientSlug`.

5. **For webhooks**: Add a new `router.post('/{slug}/webhooks/stripe', ...)` entry pointing to `makeWebhookHandler('{slug}')`.

6. **Configure Stripe**: Add the new webhook endpoint in the Stripe dashboard pointing to `https://phyllis-fills.replit.app/api/{slug}/webhooks/stripe`. Use `STRIPE_WEBHOOK_SECRET` for signature verification.

---

## Printful Integration

Located in `artifacts/api-server/src/lib/printful.ts`.

**Key functions:**

| Function | Description |
|----------|-------------|
| `createSyncProduct(apiKey, storeId, opts)` | Creates a Printful sync product with variants |
| `findSyncProductByExternalId(apiKey, storeId, externalId)` | Finds an existing product before creating a duplicate |
| `generateMockups(apiKey, storeId, catalogProductId, designUrl)` | Fetches mockup image URLs using the Printful catalog product ID |
| `createOrder(apiKey, storeId, { recipient, items })` | Submits a fulfillment order |
| `getPrintfulOrder(apiKey, printfulOrderId)` | Fetches live order status + tracking |

Mockups are fetched and saved to S3. If S3 upload fails, the original Printful CDN URLs are returned as a fallback.

**Printful API base URL:** `https://api.printful.com`

**Store context:** Printful account-level tokens require:

```http
X-PF-Store-Id: 18110115
```

For Discount Punk, the current default Printful store ID is `18110115`. Long term this belongs in `clients.printful_store_id`.

**Idempotency:** Product creation uses a deterministic external ID:

```text
{client_slug}-{12-char MD5 of designUrl::title}
```

The code checks Printful for that external ID before creating a new sync product. Retries should return the existing product instead of creating duplicates.

**Mockup ID namespace:** Printful mockup generation requires the catalog product ID, not the sync product ID. After creating a sync product, fetch the full sync product detail and extract:

```text
sync_variants[0].product.product_id
```

For the verified Discount Punk shirt path, the catalog product ID was `71`.

---

## DPI Validation

Located in `artifacts/api-server/src/lib/dpi.ts`.

Uses `sharp` (Node.js image processing) to:
1. Fetch the image at `design_url` (streams to avoid memory issues on large files)
2. Read pixel dimensions from metadata
3. Check `sharp` reported DPI; falls back to pixel/inch calculation if metadata DPI is not set

**Thresholds:**

| Product | Minimum DPI | Notes |
|---------|-------------|-------|
| `shirt` | 300 DPI | Hard reject below 300 |
| `poster` | 300 DPI | Hard reject below 300 |

Known-good sprint asset:

```text
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png
```

Specs:

```text
4267 x 4575 px
300 DPI
PNG with transparency
```

---

## TypeScript

Root typecheck command: `pnpm run typecheck`

This runs `tsc --build` for composite libs, then `tsc --noEmit` for each artifact.

Leaf packages (artifacts) must NOT be added to the root `tsconfig.json` references — that file is for libs only.

When adding a new shared lib:
1. Add `composite: true` and `emitDeclarationOnly: true` to `lib/{name}/tsconfig.json`
2. Add it to the root `tsconfig.json` references
3. Add it to any artifact's package.json as a `workspace:*` dependency

---

## Deployment

The project deploys to **phyllis-fills.replit.app** via Replit's built-in deployment system.

Production environment:
- All secrets come from the same Replit Secrets store (not AWS Secrets Manager in dev)
- PostgreSQL is the same Replit-managed DB (shared dev/prod unless explicitly separated)
- S3 bucket is the same (dev and prod share order data — be aware of this in testing)

To deploy: click **Publish** in the Replit workspace header. The platform handles TLS, health checks, and routing.

**Checking production logs:** Use the deployment logs viewer in the Replit workspace, or query `fetch_deployment_logs` if automated.

---

## Common Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| `503 Service not ready — secrets not loaded` | `hydrateSecrets()` failed at startup | Check AWS credentials; verify secrets exist in AWS Secrets Manager or Replit Secrets |
| `422 DPI validation failed — could not process image` | Image URL is inaccessible or malformed | Ensure `design_url` is a publicly reachable URL with no auth |
| Order remains `provider_pending` | Supplier API is not wired or returned a manual handling state | Check provider adapter result and manual fulfillment notes |
| `403 Forbidden` on chat embed | Origin not in `allowedDomains` | Add domain to the Chat API tab in the dashboard |
| Route wildcard catching named routes | `queryRouter` or `adminRouter` before named routes | Keep `chatEmbedRouter` above `queryRouter` in `routes/index.ts` |
| Orders visible to wrong client | `clientSlug` mismatch | Verify `clients.slug` exactly matches the S3 prefix used at order creation time |
| `401 Unauthorized` | API key missing or inactive client | Ensure `active: true` in clients table; confirm `X-Api-Key` header is set |
