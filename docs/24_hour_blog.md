# 24 Hours With Phyllis

Date: May 2-3, 2026  
Sprint window: 24 hours  
Project: Phyllis, an LLM-to-customer fulfillment API

## Working Thesis

What if a bot could make a product and a customer could receive it without a human stitching together the boring middle?

That is the point of Phyllis.

BotButt can create the product. Phyllis can fill the order. A customer can buy the thing. Printful can print and ship it. The site can stay weird, loud, and alive while the operations layer behaves like infrastructure.

The contest build is not only a checkout integration. It is the first version of an automated creative-to-commerce pipeline:

```text
LLM creates product -> Phyllis validates it -> storefront sells it -> customer pays -> Phyllis submits fulfillment -> Printful ships
```

First client: Discount Punk.  
Longer vision: any bot-built shop can use Phyllis.

## One-Line Description

Phyllis enables end-to-end LLM-to-customer fulfillment: bots create products, Phyllis validates them, creates print-ready variants, and routes paid orders to production and shipping.

## Characters

**Karen**  
Project owner, builder, taste filter, and the person pushing the sprint forward.

**BotButt**  
Creative agent for Discount Punk. Generates products, voice, chaos, and commerce energy.

**Phyllis**  
Fulfillment API. She validates print files, creates Printful products, tracks orders, retries failures, and fills orders for bot-built shops.

**Discount Punk**  
The first storefront using Phyllis.

## Why Phyllis Exists

Bot-generated products are easy to imagine and hard to operationalize. The missing layer is not the product page. The missing layer is the boring but critical work:

- checking that the file can actually print
- creating the right Printful product and variants
- connecting paid orders to fulfillment
- tracking failures
- retrying recoverable operations
- keeping humans informed when automation needs help

Phyllis is that layer.

She is designed for bots like BotButt, but not limited to BotButt. She should be able to serve other sites and agents through an API.

## Sprint Goal

Build the full enchilada:

- API key structure
- `client_id` and `site_id` tracking
- product creation endpoint
- image/DPI validation
- Printful product/order integration
- Stripe checkout
- Stripe webhooks
- order persistence
- usage event logging
- visual dashboard
- failed-order visibility and retry

Deferred only if necessary:

- full Stripe Billing for Phyllis itself
- polished self-serve onboarding
- advanced teams/roles

## Pricing Direction

The intended pricing model is usage-based.

Rationale:

- no barrier to entry
- customers pay when they are making money
- aligns with fulfillment economics
- works for bots, developers, and small shops

Initial pricing idea:

```text
First 10 fulfilled orders/month: free
After that: $1.50 per fulfilled order
Possible later model: 5% of order value capped at $3/order
```

For the sprint, billing collection is out of scope. The important thing is to track usage events now so billing can be added later.

## Product Access Direction

Phyllis should eventually offer both:

1. API key access for bots, developers, and automated shops.
2. A dashboard for humans to inspect products, orders, failures, retries, and usage.

For this sprint, Karen decided to go for both. The dashboard should be operational, not decorative.

The dashboard needs to show:

- what came in
- what got created
- what got paid
- what got sent to Printful
- what failed
- what can be retried
- how much usage each client/site generated

## Technical Shape

Phyllis should be site-agnostic.

Every important record should carry:

- `client_id`
- `site_id`
- local product ID
- local variant ID
- local order ID
- Printful product/order IDs when available
- usage event IDs

Example future API shape:

```text
POST /api/sites/:siteId/products
POST /api/sites/:siteId/orders
POST /api/sites/:siteId/checkout/create-session
POST /api/sites/:siteId/webhooks/stripe
GET  /api/sites/:siteId/orders
GET  /api/sites/:siteId/usage
```

Sprint routes may be simpler, but the data model should already know about sites and clients.

## Critical Build Principles

1. Save local order records before relying on Printful.
2. Never let a paid Stripe order disappear.
3. If Printful fails, mark the order `printful_failed`.
4. Keep retry paths visible and operator-friendly.
5. Keep the 300 DPI gate.
6. Avoid putting mockup generation in the payment critical path.
7. Use durable public URLs for print files, not expiring presigned URLs.
8. Do not accidentally use `confirm=true` on Printful until intentionally fulfilling a real order.

## Timeline

### 2026-05-02 07:59 CDT

The sprint is underway.

Karen has Phyllis open in Replit. The first visible dashboard exists: black terminal-style design, live badge, endpoint list, DPI gate, and stack summary. It is still Discount Punk-centered, but the architecture conversation shifted Phyllis into something bigger:

```text
Phyllis is not only for Discount Punk.
Phyllis is fulfillment infrastructure for bot-built commerce.
```

Key naming decision:

- Stocky Butt became Phyllis.
- Meaning: "fill us."
- Job: fill orders.

Key domain decision:

- Use `phyllis.pretendo.tv` for now.
- Research a dedicated domain later.

Key positioning decision:

```text
LLM-to-customer fulfillment API
```

Key pricing decision:

- intended model: usage-based
- first 10 orders/month free
- then around $1.50/order
- no billing implementation today unless fulfillment core is already solid

Key product decision:

- Paying customers eventually get both API key access and a visual dashboard.
- Karen overrode the smaller phased plan and chose the full build for the sprint.

Current advice to Replit agent:

```text
Build the full enchilada, but layer it:
1. Fulfillment core works by API.
2. Every action logs client/site/order usage.
3. Dashboard reads those same records.
4. Retry failed orders from the dashboard.
5. Polish only after the loop is real.
```

### 2026-05-02 08:00 CDT

The Replit agent accepted the bigger Phyllis scope and mapped the build as a real multi-client product, not a single Discount Punk integration.

Current planned build:

- usage tracking with `site_id` and `client_id` on every product and order
- billable usage events logged to the database
- monthly usage counts per client
- super admin panel to add and manage clients
- Discount Punk as the first client
- client dashboard with API key, product creation, and order tracking
- dashboard cleanup, including removing the alternate visible webhook path
- footer/copy cleanup so Phyllis reads like infrastructure

The agent inspected the current files, then formed an implementation plan:

```text
DB schema:
  clients
  usage_events
  monthly_usage

API:
  API key middleware
  client_id attachment
  admin client-management routes
  client dashboard routes
  usage logging helpers

Dashboard:
  public landing page
  client login/API key entry
  client dashboard
  super admin panel
```

First implementation issue surfaced:

```text
drizzle-kit bundler could not resolve .js extensions from .ts schema files
```

Planned fix:

```text
Use .ts extensions in schema imports for the Drizzle schema push path.
```

This is a good sign. The agent is not just adding a pretty screen; it is laying the data model Phyllis needs to become reusable:

```text
client -> site -> product -> order -> usage event
```

The main thing to watch now is sequencing. The dashboard can grow quickly, but the source of truth must stay the API and database records. If the dashboard is reading real order/product/usage state, it helps the sprint. If it becomes static demo polish, it should wait.

### 2026-05-02 08:08 CDT

Phyllis has a production Replit deployment target:

```text
https://phyllis-fills.replit.app
```

Production settings visible at publish time:

- visibility: public
- geography: North America
- type: autoscale
- resources: 2 vCPU / 4 GiB RAM / 3 max
- production database connected

This is the first public home for Phyllis. The name works: `phyllis-fills` says what she does without locking her to Discount Punk.

Current dashboard positioning:

```text
PHYLLIS
Fulfillment infrastructure for bot-built commerce
```

That line is now stronger than the earlier Discount Punk-specific framing. Discount Punk remains the first client, not the product boundary.

## Decisions Log

### Name

Chosen: Phyllis

Reason:

- memorable
- sounds human
- joke works: Phyllis fills orders
- better than Stocky Butt for a reusable SaaS/API product

### Domain

Chosen for now:

```text
phyllis.pretendo.tv
```

Dedicated domain research deferred.

### Product Category

Chosen:

```text
LLM-to-customer fulfillment API
```

### First Client

Chosen:

```text
discountpunk.com
```

### Pricing Model

Chosen direction:

```text
usage-based per fulfilled order
```

Billing implementation deferred, but usage tracking should be built now.

### Access Model

Chosen:

```text
API key + visual dashboard
```

## Running Notes

- Phyllis should feel like reliable infrastructure with a wink.
- Discount Punk can keep the full punk voice.
- "We ASS-cept" belongs on Discount Punk checkout pages, not necessarily on Phyllis's API dashboard.
- Phyllis dashboard copy should be clear, operational, and credible.
- Do not over-polish a dashboard that cannot retry failed orders.

## Blog Draft Angle

Possible title:

```text
We Built an LLM-to-Customer Fulfillment API in 24 Hours
```

Possible opening:

```text
At 8 AM, Phyllis was a joke about filling orders. By the end of the sprint, she was becoming the infrastructure layer for bot-built commerce.
```

Core story:

```text
The hard part of AI commerce is not making a weird shirt. The hard part is making sure the shirt can print, the customer can pay, the order does not vanish, the fulfillment provider gets the right file, and a human can recover the system when something fails. Phyllis is our answer to that middle layer.
```

## Next Updates To Capture

- Replit app URL once published
- first successful health check
- first product creation request
- first DPI validation result
- first Printful product created
- first Stripe checkout session created
- first webhook received
- first order saved
- first Printful order submitted
- first dashboard retry/failure path
- screenshots of dashboard
- final architecture diagram
