# Justin's Printful Advice

Date: May 2, 2026  
Scope: Phyllis fulfillment API / Discount Punk / Replit contest prep

## Executive Summary

Phyllis can and should create Printful products on the fly. She should not be designed as a BotButt-only helper. She should be a reusable fulfillment API that can fill orders for Discount Punk first, then other sites later.

That means every product, variant, order, webhook event, and Printful operation should carry a site/client context, such as `site_id`.

## Current Verified Status

As of May 2, 2026, the durable product creation path is verified:

```text
BotButt -> Phyllis -> DPI validation -> Printful sync product -> Printful mockup -> Phyllis products table -> Discount Punk dashboard
```

Verified product:

```text
Title: Eat My Donkey
Printful ID: 430745217
External ID: discount-punk-4149b8b559c5
Price: $29.99
Dashboard status: Active
```

Verified implementation details:

- BotButt can see and call `create_product_with_phyllis`.
- Printful requires `X-PF-Store-Id: 18110115` for the Discount Punk store.
- Product creation is idempotent through a deterministic external ID.
- Mockup generation uses the Printful catalog product ID, not the sync product ID.
- The current shirt path resolves to catalog product ID `71`.
- Phyllis now exposes product catalog endpoints for dashboard/static-site use.

Still pending:

- Public Discount Punk **Buy Now** button must call the real Stripe checkout flow.
- Stripe webhook must save a paid order and submit it through the provider adapter.
- A checkout success/results page should show payment/order/provider state.

The system needs two clearly separated flows:

1. **Durable shop-product flow**: create a Printful Sync Product once, store the returned Sync Product and Sync Variant IDs, then use those IDs for future orders.
2. **One-off direct-order flow**: create an order directly with catalog `variant_id` plus `files[].url`, without first creating a stored product.

For Discount Punk's long-term creative-to-commerce pipeline, use the durable shop-product flow. For the first contest money-loop test, the one-off direct-order flow is acceptable if time gets tight.

Most important advice:

- Do not let Stripe success depend on Printful being healthy.
- Save our order record first, then submit to Printful.
- If Printful fails after payment, mark the order `printful_failed` and make it visible to Phyllis.
- Do not use expiring presigned URLs for print files.
- Do not soften the image-quality gate.
- Be very careful with Printful `confirm=true`; it turns a draft into a fulfillment submission.
- Rotate and scrub any exposed credentials before sharing sprint docs outside trusted workspace.

## Printful API Basics

Base URL:

```text
https://api.printful.com/
```

Authentication:

```http
Authorization: Bearer {PRINTFUL_API_KEY}
```

If the token is account-level instead of single-store, include store context:

```http
X-PF-Store-Id: {store_id}
```

Recommended token setup for tomorrow:

- Prefer a single-store private token scoped to the relevant Manual order/API store.
- Required scopes:
  - `orders`
  - `sync_products`
- Nice-to-have later:
  - `file_library`

Response shape:

```json
{
  "code": 200,
  "result": {}
}
```

Error shape:

```json
{
  "code": 400,
  "result": "Bad Request",
  "error": {
    "reason": "BadRequest",
    "message": "..."
  }
}
```

Log all of these on failures:

- HTTP status
- Printful `code`
- `error.reason`
- `error.message`
- local product/order ID
- Stripe session/payment intent ID when relevant
- Printful request type, but not secret headers

Rate limit note:

- General Printful rate limit is 120 calls/minute.
- Resource-heavy endpoints such as mockup generation can have lower limits.
- Do not run mockup generation inside a Stripe webhook critical path.

## Core Concepts

Printful uses a few terms that matter:

- **Catalog Product**: a blank product family, like Bella+Canvas 3001.
- **Catalog Variant**: an exact blank item, like Bella+Canvas 3001 black medium. This has a `variant_id`.
- **Sync Product**: a product created in a Printful store. This is the thing that represents a sellable product in Printful.
- **Sync Variant**: a sellable variant under a Sync Product. This has a `sync_variant_id`.
- **Print file**: the design file Printful prints. For us this should be a public S3 URL to a print-ready PNG.

Rule of thumb:

- Use `variant_id` when creating products or one-off orders from catalog blanks.
- Use `sync_variant_id` when ordering an already-created store product.

## Phyllis Service Model

Phyllis is a fulfillment service, not a single-site feature.

Her job:

- receive product creation requests from approved sites/agents
- validate print assets
- create Printful Sync Products and Sync Variants
- store fulfillment metadata
- receive paid-order submission requests
- create/confirm Printful orders
- expose operational status and retry endpoints
- answer grounded operational questions from admins, staff, customers, and bots

Initial client:

```text
site_id: discountpunk
site_name: Discount Punk
creative_source: BotButt
```

Later clients might be other merch sites, portfolio shops, campaign microsites, or agent-built storefronts.

Design implication:

- Do not hard-code `discountpunk` into Phyllis core logic.
- Do keep Discount Punk defaults in config/seed data for tomorrow.
- Every API request that creates or submits site-owned data should include `site_id`.
- Every storage key should include `site_id`.
- Every Printful external ID should include `site_id` or a site prefix to avoid collisions.

Example site config:

```json
{
  "site_id": "discountpunk",
  "name": "Discount Punk",
  "public_base_url": "https://discountpunk.com",
  "default_currency": "USD",
  "default_country_scope": ["US"],
  "printful": {
    "store_id": "18110115",
    "default_confirm_orders": false
  },
  "storage": {
    "bucket": "ssbb-media-prod",
    "prefix": "sites/discountpunk"
  }
}
```

## Conversational Agent Layer

Phyllis should eventually be talkable.

Example:

```text
Phyllis, where is the Eat My Donkey order for Discount Punk for Joe Smith?
```

This should be an agent layer over the same records that power the API and dashboard.

Do not let the agent invent fulfillment answers. It should query structured records and then explain them.

Supported user groups:

- admins: can query across clients and sites
- staff: can query assigned clients/sites
- customers: can query their own orders only
- bots: can query through API/tool calls with scoped credentials

Data model requirements for future conversational lookup:

- store normalized customer name
- store customer email
- store site ID
- store product title
- store local order ID
- store Stripe session/payment intent IDs
- store Printful order ID
- store current status
- store status history with timestamps
- store last known tracking/shipping info when available

Search/query capabilities to plan for:

- by customer name + site
- by email
- by product title
- by local order ID
- by Printful order ID
- by Stripe payment/session ID
- by failed status

Example grounded response:

```text
I found Joe Smith's Eat My Donkey Tee order for Discount Punk.
Status: submitted_for_fulfillment.
Printful order: 123456789.
Last update: May 2, 2026 08:42 CDT.
Next step: waiting for Printful production update.
```

If something failed:

```text
I found the order, but Printful submission failed after 3 attempts.
Status: printful_failed.
Last error: invalid recipient zip.
Next action: update address and retry fulfillment.
```

## Architecture Recommendation

Phyllis owns fulfillment. BotButt owns creative generation and shop storytelling for Discount Punk. Other future agents or sites can use the same Phyllis API.

Recommended boundary:

```text
BotButt
  - generates design
  - uploads print file and web image
  - asks Phyllis to create product
  - publishes returned product data to Discount Punk

Phyllis
  - authenticates the calling site/client
  - scopes all operations by site_id
  - validates print file
  - maps product/color/size to Printful catalog variant IDs
  - creates Printful Sync Product
  - stores local product fulfillment metadata
  - submits paid orders to Printful
  - exposes order/product status tools
```

Phyllis should never need to invent brand copy. BotButt or another site client can send title/description. Phyllis should validate and fulfill.

## Recommended Phyllis API

API base:

```text
https://phyllis.ssbb.pretendo.tv
```

Current sprint API base:

```text
https://phyllis-fills.replit.app
```

For tomorrow, this may be local or under the existing SSBB server. The API shape should still be Phyllis-shaped so it can move later.

Authentication:

- Use server-to-server API keys initially.
- Send keys in `Authorization: Bearer {PHYLLIS_API_KEY}` or `X-Phyllis-Api-Key`.
- Store per-site/client keys hashed if Phyllis has her own database later.
- For the sprint, a single shared internal key in AWS Secrets Manager is enough.

Every write request should include:

- `site_id`
- stable local ID or `external_id`
- authenticated client identity

Suggested route namespace:

```text
/api/sites/:siteId/products
/api/sites/:siteId/orders
/api/sites/:siteId/webhooks/stripe
```

Sprint-compatible simpler namespace:

```text
/api/products/create
/api/orders/submit
/api/webhooks/stripe
```

If using the simpler namespace, still include `site_id` in the body.

### `GET /api/health`

Use for deploy checks.

Response:

```json
{
  "status": "ok",
  "service": "phyllis",
  "time": "2026-05-02T12:00:00.000Z"
}
```

### `POST /api/products/create`

Creates a durable Printful Sync Product on the fly.

Input:

```json
{
  "site_id": "discountpunk",
  "title": "Spanky I Love You Tee",
  "description": "Punk typography shirt",
  "design_url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/designs/spanky-300dpi.png",
  "web_image_url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/designs/spanky-web.png",
  "product_type": "tshirt",
  "base_product": "bella_canvas_3001",
  "colors": ["black"],
  "sizes": ["S", "M", "L", "XL", "2XL", "3XL"],
  "price": "29.99",
  "external_id": "spanky-i-love-you-tee"
}
```

Required validation:

- `title` is present and sane.
- `design_url` is HTTPS and points to a durable public URL.
- `product_type` is known.
- requested colors/sizes are supported.
- print file passes image-quality rules.
- no existing active local product already uses the same `external_id`, unless explicitly updating.

Output:

```json
{
  "site_id": "discountpunk",
  "local_product_id": "spanky-i-love-you-tee",
  "printful_sync_product_id": 123456789,
  "printful_external_id": "spanky-i-love-you-tee",
  "status": "ready",
  "variants": [
    {
      "size": "M",
      "color": "black",
      "catalog_variant_id": 4017,
      "sync_variant_id": 987654321,
      "retail_price": "29.99"
    }
  ],
  "design_url": "https://...",
  "web_image_url": "https://..."
}
```

Persist the returned data in our own storage. Printful is not our CMS.

### `POST /api/orders/submit`

Submits a paid local order to Printful. This can be called by the Stripe webhook processor or manually by Phyllis.

Input:

```json
{
  "site_id": "discountpunk",
  "local_order_id": "ord_123",
  "confirm": false
}
```

Behavior:

- Load local order from S3/storage.
- Verify order is paid.
- Verify it has not already been successfully submitted.
- Build Printful payload from local order data.
- Submit with retry.
- Save Printful ID and status.
- If Printful fails, save `printful_failed`.

### `GET /api/orders`

Return local orders, optionally filtered.

Query examples:

```text
GET /api/orders?status=printful_failed
GET /api/orders?limit=25
```

### `GET /api/orders/:id`

Return full local order details.

### `POST /api/orders/:id/retry-printful`

Manual recovery endpoint for failed Printful submissions.

Important: this must be idempotent. If an order already has a Printful order ID, do not create a duplicate unless the caller passes an explicit force flag and the UI warns clearly.

### `POST /api/webhooks/stripe`

Receives Stripe events. This route must use raw-body signature validation.

Suggested behavior:

1. Validate Stripe signature.
2. Acknowledge only after the paid order is safely persisted, or use a queue/background worker if available.
3. Save local order as `paid`.
4. Attempt Printful submission.
5. On Printful success, save Printful ID/status.
6. On Printful failure, save `printful_failed` and log loudly.

Do not let a Printful outage erase or hide a paid order.

## Durable Product Creation Flow

Use this when BotButt generates a new product that should appear in the shop.

```text
1. BotButt generates art.
2. BotButt writes:
   - 300 DPI print PNG
   - smaller web PNG/JPG
3. BotButt calls Phyllis POST /api/products/create with site_id=discountpunk.
4. Phyllis downloads/inspects print file.
5. Phyllis maps requested variants to Printful catalog variant IDs.
6. Phyllis POSTs /store/products to Printful.
7. Phyllis stores returned Sync Product and Sync Variant IDs.
8. BotButt publishes product to Discount Punk with those IDs.
9. Customer checkout sends the selected local variant.
10. Paid order submits using sync_variant_id.
```

Why this is the right long-term flow:

- We create product metadata once.
- Future orders are simpler.
- Printful has stable product/variant records.
- Discount Punk can show products independent of Printful downtime.
- Phyllis can report product status and retry failed operations.

## Printful Create Sync Product

Endpoint:

```http
POST https://api.printful.com/store/products
```

Payload shape:

```json
{
  "sync_product": {
    "name": "Spanky I Love You Tee",
    "thumbnail": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/designs/spanky-web.png",
    "external_id": "discountpunk-spanky-i-love-you-tee"
  },
  "sync_variants": [
    {
      "variant_id": 4017,
      "retail_price": "29.99",
      "external_id": "discountpunk-spanky-i-love-you-tee-black-m",
      "files": [
        {
          "type": "default",
          "url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/designs/spanky-300dpi.png"
        }
      ]
    }
  ]
}
```

Notes:

- `sync_product.name` is required.
- Each `sync_variants[]` item needs a Printful catalog `variant_id` and print `files`.
- `retail_price` should be a string.
- Use `external_id` values so we can look things up idempotently.
- Keep names deterministic and short enough to be operationally usable.

For shirts, build `sync_variants` from a local catalog mapping.

Example local mapping:

```ts
type ProductType = 'bella_canvas_3001';
type ShirtColor = 'black';
type ShirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

const PRINTFUL_VARIANTS: Record<ProductType, Record<ShirtColor, Record<ShirtSize, number>>> = {
  bella_canvas_3001: {
    black: {
      S: 4016,
      M: 4017,
      L: 4018,
      XL: 4019,
      '2XL': 4020,
      '3XL': 5295
    }
  }
};
```

The values above match the current sprint notes in `docs/PRINTFUL_READY.md`. Verify against Printful before production because catalog IDs are business-critical.

## Direct One-Off Order Flow

Use this if product creation becomes a time risk during the contest.

```text
1. Stripe checkout succeeds.
2. Save local paid order.
3. Build Printful order with catalog variant_id and files[].url.
4. Create Printful draft order.
5. Confirm only when intentionally submitting for fulfillment.
```

This is simpler but less durable:

- It does not create a reusable Sync Product.
- Each order must include print file details.
- Product reporting is weaker.
- It is acceptable for the first MVP order.

## Printful Create Order

Endpoint:

```http
POST https://api.printful.com/orders
```

For a durable Sync Product order:

```json
{
  "external_id": "ord_123",
  "recipient": {
    "name": "Karen Kilroy",
    "address1": "123 Test St",
    "city": "Austin",
    "state_code": "TX",
    "country_code": "US",
    "zip": "78701",
    "email": "customer@example.com"
  },
  "items": [
    {
      "sync_variant_id": 987654321,
      "quantity": 1,
      "retail_price": "29.99"
    }
  ],
  "retail_costs": {
    "currency": "USD",
    "subtotal": "29.99",
    "discount": "0.00",
    "shipping": "0.00",
    "tax": "0.00"
  }
}
```

For a direct catalog order:

```json
{
  "external_id": "ord_123",
  "recipient": {
    "name": "Karen Kilroy",
    "address1": "123 Test St",
    "city": "Austin",
    "state_code": "TX",
    "country_code": "US",
    "zip": "78701",
    "email": "customer@example.com"
  },
  "items": [
    {
      "variant_id": 4017,
      "quantity": 1,
      "retail_price": "29.99",
      "files": [
        {
          "type": "default",
          "url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png"
        }
      ]
    }
  ]
}
```

Draft versus confirmed:

```http
POST /orders
POST /orders?confirm=true
POST /orders/{id}/confirm
```

Recommended tomorrow:

- During tests: create draft orders.
- For the actual intentional fulfillment test: confirm one real order.
- Store whether the Printful order is `draft`, `pending`, `failed`, etc.

## Local Product Record

Store this outside Printful, likely in S3 for sprint speed.

Suggested key:

```text
sites/{site_id}/products/{local_product_id}.json
```

Suggested JSON:

```json
{
  "siteId": "discountpunk",
  "id": "spanky-i-love-you-tee",
  "title": "Spanky I Love You Tee",
  "description": "Punk typography shirt",
  "status": "ready",
  "productType": "tshirt",
  "baseProduct": "bella_canvas_3001",
  "designUrl": "https://...",
  "webImageUrl": "https://...",
  "price": "29.99",
  "currency": "USD",
  "printful": {
    "syncProductId": 123456789,
    "externalId": "discountpunk-spanky-i-love-you-tee"
  },
  "variants": [
    {
      "id": "spanky-i-love-you-tee-black-m",
      "size": "M",
      "color": "black",
      "catalogVariantId": 4017,
      "syncVariantId": 987654321,
      "price": "29.99",
      "enabled": true
    }
  ],
  "createdAt": "2026-05-02T12:00:00.000Z",
  "updatedAt": "2026-05-02T12:00:00.000Z"
}
```

## Local Order Record

Suggested key:

```text
sites/{site_id}/orders/{local_order_id}.json
```

Suggested JSON:

```json
{
  "siteId": "discountpunk",
  "id": "ord_123",
  "status": "printful_draft",
  "customerEmail": "customer@example.com",
  "stripe": {
    "checkoutSessionId": "cs_test_123",
    "paymentIntentId": "pi_123",
    "mode": "test"
  },
  "printful": {
    "orderId": 123456789,
    "externalId": "ord_123",
    "status": "draft",
    "lastSubmitAttemptAt": "2026-05-02T12:00:00.000Z",
    "submitAttempts": 1
  },
  "items": [
    {
      "localProductId": "spanky-i-love-you-tee",
      "localVariantId": "spanky-i-love-you-tee-black-m",
      "title": "Spanky I Love You Tee",
      "size": "M",
      "color": "black",
      "quantity": 1,
      "unitPrice": "29.99",
      "syncVariantId": 987654321
    }
  ],
  "shippingAddress": {
    "name": "Karen Kilroy",
    "line1": "123 Test St",
    "line2": "",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "totals": {
    "currency": "USD",
    "subtotal": "29.99",
    "shipping": "0.00",
    "tax": "0.00",
    "total": "29.99"
  },
  "statusHistory": [
    {
      "status": "paid",
      "at": "2026-05-02T12:00:00.000Z",
      "note": "Stripe checkout completed"
    }
  ],
  "createdAt": "2026-05-02T12:00:00.000Z",
  "updatedAt": "2026-05-02T12:00:00.000Z"
}
```

Use strings for money values to avoid floating point surprises.

## Status Model

Product statuses:

- `validating`
- `rejected_quality`
- `creating_printful`
- `ready`
- `printful_failed`
- `disabled`

Order statuses:

- `pending_checkout`
- `paid`
- `rejected`
- `printful_submitting`
- `printful_failed`
- `printful_draft`
- `submitted_for_fulfillment`
- `printing`
- `shipped`
- `delivered`
- `cancelled`
- `refunded`

Critical invariant:

```text
paid Stripe order + no Printful order = visible operational problem, never silent success
```

## Provider Gate

The sprint decision changed: Phyllis should not keep a separate client/admin approval queue for ordinary paid orders.

Recommended sprint flow:

```text
Stripe webhook
  -> save paid order
  -> submit through FulfillmentAdapter
  -> if Printful: create draft/provider order
  -> if supplier API is not live: mark provider_pending/manual_fulfillment
```

Why this is better:

- The vendor dashboard already provides the final human production gate.
- Printful draft orders can be reviewed before anyone confirms production.
- Removing Phyllis's approval queue removes a fragile duplicate workflow.
- Provider-specific blockers can still be visible without pretending fulfillment succeeded.

Critical rule:

```text
Do not automatically call Printful's final confirm endpoint.
```

Agent behavior:

- If asked where an order is, Phyllis should mention payment state, provider submission state, provider blocker, and next action.
- If an order is a Printful draft, Phyllis should say it is in the vendor dashboard awaiting provider confirmation.
- If a supplier path is not automated, Phyllis should say `provider_pending` or `manual_fulfillment` and identify the manual next step.
- If refund is manual, Phyllis should say "refund has not been automated; check Stripe" rather than imply it happened.

## Retry And Idempotency

Use external IDs everywhere.

Printful product external IDs:

```text
{site_id}-{local_product_id}
{site_id}-{local_product_id}-{color}-{size}
```

Printful order external ID:

```text
{site_id}-{local_order_id}
```

Retry policy for Printful writes:

- 3 total attempts.
- Backoff: 1 second, then 3 seconds.
- Retry network errors, 429, and 5xx.
- Do not blindly retry hard 4xx validation failures.
- On final failure, persist failure status and full error summary.

Pseudo-code:

```ts
async function withPrintfulRetry<T>(
  label: string,
  run: () => Promise<T>,
  shouldRetry = isRetryablePrintfulError
): Promise<T> {
  const waits = [0, 1000, 3000];
  let lastError: unknown;

  for (let attempt = 0; attempt < waits.length; attempt += 1) {
    if (waits[attempt]) await sleep(waits[attempt]);

    try {
      const result = await run();
      console.log(`[printful] ${label} succeeded on attempt ${attempt + 1}`);
      return result;
    } catch (err) {
      lastError = err;
      console.error(`[printful] ${label} failed on attempt ${attempt + 1}:`, summarizeError(err));

      if (attempt === waits.length - 1 || !shouldRetry(err)) {
        throw err;
      }
    }
  }

  throw lastError;
}
```

Idempotency advice:

- Before creating a new Printful product, check local storage for the product ID.
- If local storage says the product was already created, reuse it.
- If a previous attempt failed after Printful succeeded but before local save, use Printful external IDs to recover.
- Before submitting an order, check whether local order already has `printful.orderId`.
- Never let webhook retries create duplicate Printful orders.

## Image Quality Gate

Do not soften this under time pressure.

Recommended rules:

- Shirts: hard reject below 150 DPI, warn below 300 DPI.
- Posters: hard reject below 300 DPI.
- Limited editions: hard reject below 300 DPI.

The gate should check both metadata and pixel dimensions.

For a 12 inch by 15 inch shirt print:

```text
150 DPI minimum: 1800 x 2250
300 DPI ideal:   3600 x 4500
```

For the prepared hero file:

```text
eat-my-donkey-300dpi.png
4267 x 4575
300 DPI metadata
passes
```

Quality validation output:

```json
{
  "valid": true,
  "dpi": 300,
  "width": 4267,
  "height": 4575,
  "warnings": []
}
```

If DPI metadata is missing but pixels are large enough, choose a policy and log it clearly. My recommendation:

- Accept for shirts if pixel dimensions satisfy print area at 150 DPI.
- Warn if metadata is missing.
- Require explicit operator approval for posters/limited editions.

## File URL Rules

Printful must be able to fetch the file.

Use:

```text
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/...
```

Avoid:

- local file paths
- private S3 URIs like `s3://...`
- expiring presigned URLs
- URLs requiring cookies/auth headers
- temporary Replit URLs

Before sending to Printful, Phyllis should perform a `HEAD` or small `GET` check:

- status is 200
- content type is image-ish
- content length is nonzero

## Mockups

Mockups are important for product pages, but not the payment critical path.

Suggested product creation sequence:

1. Create Sync Product.
2. Persist product as `ready_for_ordering`.
3. Kick off mockup generation separately.
4. Persist mockup URLs when ready.
5. If mockup generation fails, product can still be sold with our own web image.

Relevant endpoints:

```http
POST /mockup-generator/create-task/{product_id}
GET /mockup-generator/task?task_key={task_key}
```

Operational notes:

- Mockup generation is asynchronous.
- Poll with a cap.
- Do not hammer the endpoint.
- Do not block Stripe webhook on mockups.

## Shipping And Taxes

For MVP:

- US only is simplest.
- Stripe Tax can be explicitly deferred.
- If tax/shipping are deferred, say so in docs and product pricing.

Printful shipping rates:

```http
POST /shipping/rates
```

This can calculate available shipping options before order placement. However, live shipping can change. Do not over-cache dynamic rates.

For a clean MVP:

- Use a flat shipping policy or include shipping in price if business accepts it.
- Submit the shipping method consistently.
- Keep customer-facing copy honest.

For later:

- Calculate shipping at checkout.
- Store the selected Printful shipping method.
- Add Printful webhooks for shipment updates.

## Stripe Webhook Warning

Stripe signature validation requires raw request body. If the Express app globally uses `express.json()`, the webhook route needs special handling before JSON middleware or a route-specific raw parser.

Bad:

```ts
app.use(express.json());
app.post('/api/discountpunk/webhooks/stripe', handlerThatNeedsRawBody);
```

Better:

```ts
app.post(
  '/api/discountpunk/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

app.use(express.json({ limit: '20mb' }));
```

Or mount webhook route before global JSON middleware.

Webhook success criteria:

- Invalid signature returns 400.
- Duplicate Stripe events do not duplicate orders.
- Printful failure does not hide paid orders.
- Loud logs include event ID and local order ID.

## Security Notes

Urgent:

- Some local sprint docs appear to include real AWS credentials inline.
- Rotate those credentials before sharing externally.
- Scrub the docs and git history if they were committed/pushed.

Do not log:

- Stripe secret key
- Printful API key
- AWS secret access key
- full customer address in broad logs unless needed for debugging

Do log:

- local order ID
- Stripe event ID
- Printful order/product ID
- error summaries
- retry counts

AWS Secrets Manager:

- Use `ssbb/stripe-printful` for Stripe and Printful secrets.
- Hydrate process env at server startup.
- Fail loudly if required keys are missing in production.

## Tomorrow's Build Order

If I were steering the contest build, I would sequence it this way:

1. Rotate/scrub exposed credentials.
2. Confirm Printful token scopes and store type.
3. Confirm catalog variant IDs for Bella+Canvas 3001 black S-3XL.
4. Implement `printful.ts` wrapper:
   - request helper
   - create sync product
   - create order
   - confirm order
   - retry/error handling
5. Implement local product/order persistence.
6. Implement Stripe checkout.
7. Implement Stripe webhook with raw-body signature validation.
8. Save paid order before Printful submission.
9. Submit draft Printful order.
10. Add Phyllis order lookup tools.
11. Add manual retry for `printful_failed`.
12. Only then add mockup generation if time remains.

## Minimum Viable Contest Scope

Must have:

- Stripe checkout creates a session.
- Stripe webhook saves a paid order.
- Paid order is visible in S3/local storage.
- Printful order submission works or fails visibly.
- Variant IDs are correct.
- The hero image passes the quality gate.
- One intentional real order can be fulfilled.

Can defer:

- full mockup automation
- Printful shipment webhooks
- international shipping
- Stripe Tax
- product editing
- admin dashboard
- multi-product carts beyond what current UI needs

Do not defer:

- raw-body Stripe signature validation
- durable order persistence
- loud Printful failure handling
- credential cleanup

## Testing Checklist

Printful token:

```bash
curl -s https://api.printful.com/oauth/scopes \
  -H "Authorization: Bearer $PRINTFUL_API_KEY"
```

Catalog sanity:

```bash
curl -s https://api.printful.com/products/71 \
  -H "Authorization: Bearer $PRINTFUL_API_KEY"
```

Create draft order first. Do not use `confirm=true` until ready.

Manual test cases:

- valid product creation succeeds
- low-res image is rejected
- invalid variant ID fails loudly
- Printful 401 fails loudly
- Printful 5xx/timeout retries
- duplicate Stripe webhook does not duplicate Printful order
- paid order with Printful failure is visible as `printful_failed`
- retry endpoint submits a failed order exactly once

End-to-end test:

```text
shop -> Stripe checkout -> webhook -> local paid order -> Printful draft -> optional confirm
```

## Implementation Sketch

Printful request helper:

```ts
type PrintfulResponse<T> = {
  code: number;
  result: T;
  error?: {
    reason?: string;
    message?: string;
  };
};

async function printfulRequest<T>(
  path: string,
  storeId: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<T> {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) throw new Error('PRINTFUL_API_KEY is not configured');
  if (!storeId) throw new Error('Printful storeId is required');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'X-PF-Store-Id': storeId
  };

  if (options.body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`https://api.printful.com${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = (await response.json().catch(() => null)) as PrintfulResponse<T> | null;

  if (!response.ok || !data || data.code >= 400) {
    const message = data?.error?.message || data?.result || response.statusText;
    throw new Error(`Printful ${response.status}: ${message}`);
  }

  return data.result;
}
```

Create Sync Product:

```ts
async function createSyncProduct(input: CreateProductInput): Promise<CreateProductResult> {
  const syncVariants = buildSyncVariants(input);

  return printfulRequest('/store/products', {
    method: 'POST',
    body: {
      sync_product: {
        name: input.title,
        thumbnail: input.web_image_url,
        external_id: input.external_id
      },
      sync_variants: syncVariants
    }
  });
}
```

Submit order:

```ts
async function submitPrintfulOrder(order: LocalOrder, confirm: boolean): Promise<PrintfulOrder> {
  const path = confirm ? '/orders?confirm=true' : '/orders';

  return withPrintfulRetry('create order', () =>
    printfulRequest(path, {
      method: 'POST',
      body: buildPrintfulOrderPayload(order)
    })
  );
}
```

## Open Decisions For Karen

These should be explicit before the sprint starts:

- Are we testing Printful in draft mode first? My vote: yes.
- When exactly do we send `confirm=true`? My vote: only for one intentional real order.
- Are we US-only for MVP? My vote: yes.
- Is Stripe Tax deferred? My vote: defer and document.
- Is Phyllis a new repo or inside `apps/server` for the contest? The docs mention both patterns; choose one before coding.
- Does BotButt add products directly to Discount Punk, or does Phyllis return a complete product JSON for BotButt to publish? My vote: Phyllis returns fulfillment data, BotButt publishes.

## Second Provider Roadmap

Printful is now the verified first provider for shirts and general merch. The next provider target should be collectible posters and fine-art drops, where provenance matters as much as print quality.

Leading candidate:

```text
theprintspace / creativehub
```

Reason:

```text
Collectible posters need Certificates of Authenticity, edition numbers, and verification.
Commodity poster pricing is less important than buyer trust.
```

Implementation guidance:

- Keep Phyllis provider-agnostic.
- Route by product type, quality requirements, provenance needs, geography, and cost.
- Add provider-aware fields to products and orders before hard-wiring another vendor.
- Preserve room for `fulfillmentProvider`, `providerProductId`, edition metadata, certificate metadata, and public certificate verification.
- If the second supplier cannot be fully integrated during the sprint, create a `provider_pending` or `manual_fulfillment` path for collectible posters rather than pretending Printful is the only long-term provider.

Detailed plan:

```text
docs/printful/collectible_poster_fulfillment_plan.md
```

## Sources

- Official Printful API docs: https://developers.printful.com/docs/
- Local OpenAPI snapshot: `docs/printful/openapi.json`
- Local Printful notes: `docs/printful/printful_documentation.md`
- Sprint notes: `docs/PRINTFUL_READY.md`
- Replit sprint docs: `docs/REPLIT_START_HERE_V2.md`, `docs/replit_handoff.md`, `docs/REPLIT_PREBRIEFING_TODAY.md`
