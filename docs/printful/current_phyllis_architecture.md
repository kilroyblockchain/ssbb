# Current Phyllis Architecture

Date: May 2, 2026  
Status: product creation path verified; public checkout/provider routing live; Python print-prep endpoint implemented and tested

## One-Line Summary

Phyllis is fulfillment infrastructure for bot-built commerce: agents create products, Phyllis validates print files, routes each product to the right fulfillment provider, generates mockups, stores product metadata, and submits paid orders to the provider path. The vendor dashboard remains the final human production gate.

## Current System

```text
BotButt
  creative/site agent for Discount Punk
  sees create_product_with_phyllis
  checks whether a design already has a Phyllis product
  if missing, asks Phyllis to print-prep the displayed/generated image
  then calls Phyllis with title, description, colors, and a print-ready URL

    -> Phyllis API
       authenticates/scopes the client
       accepts 72 DPI/generated source images through /api/print-prep/process
       removes background, upscales, sharpens, preserves transparency, and stamps 300 DPI
       uploads print-ready PNG to S3
       validates image DPI
       computes deterministic Printful external_id
       checks for existing Printful product
       creates Printful sync product if missing
       fetches full sync product detail
       extracts catalog product ID for mockups
       generates Printful mockup
       stores product record
       exposes product in dashboard/catalog endpoints

    -> Printful
       store ID 18110115 for Discount Punk
       receives X-PF-Store-Id header
       creates sync product
       generates mockup using catalog product ID 71 for current shirt path

    -> Discount Punk
       first client/storefront
       client dashboard can see the active product
       public storefront Buy Now button still needs real checkout wiring

    -> Stripe Checkout
       intended shopper payment flow
       webhook saves paid order and submits it through the provider adapter

    -> Provider Adapter
       Printful for shirts/general merch
       theprintspace/creativehub stub for collectible posters
       provider_pending/manual_fulfillment when no live supplier API is wired

    -> Printful Fulfillment
       draft order appears in Printful
       Printful dashboard "Confirm order" button is the final production gate
       physical production, shipping, and tracking happen after vendor confirmation
```

## Verified

```text
BotButt -> Phyllis tool visibility: PASS
BotButt -> Phyllis product request: PASS
Phyllis print-prep endpoint: PASS
Phyllis -> Printful auth/store access: PASS
Phyllis -> Printful product creation: PASS
Printful mockup generation: PASS
Product idempotency: PASS
Dashboard Products tab visibility: PASS
Broken duplicate storefront entries removed: PASS
API unit/regression suite: PASS, 188/188
```

Verified product:

```text
Title: Eat My Donkey
Printful ID: 430745217
External ID: discount-punk-4149b8b559c5
Price: $29.99
Status: Active
```

## Still Pending

```text
Public Discount Punk Buy Now button -> Stripe checkout
Stripe webhook -> Phyllis order saved and submitted through provider adapter
Printful shirt order -> draft order visible in Printful dashboard
Collectible poster order -> provider_pending/manual_fulfillment until second supplier is live
Checkout success/results page
BotButt first-order path -> call print-prep only when product is missing
```

## Print-Prep Endpoint

Replit implemented the free Python print-prep path on the Phyllis side.

Target endpoint:

```text
POST /api/print-prep/process
```

Purpose:

```text
Take the 72 DPI/display image BotButt is already showing,
turn it into a transparent 300 DPI print-ready PNG,
upload it to S3,
then run Phyllis quality validation before product creation.
```

Verified response shape:

```json
{
  "success": true,
  "printReadyUrl": "https://ssbb-media-prod.s3.amazonaws.com/discount-punk/images/print-ready/{hash}.png",
  "width": 3600,
  "height": 4500,
  "dpi": 300,
  "hasAlpha": true,
  "qualityPassed": true,
  "prepMethod": "rembg+pillow-lanczos+sharpen",
  "warnings": ["MVP resize used; not AI super-resolution"]
}
```

Implementation notes:

- `rembg`/U2-Net removes the background. First production call may be slow while the ONNX model is downloaded.
- Pillow/Lanczos fits the artwork into the target canvas while preserving aspect ratio.
- The shirt target is `3600 x 4500`; poster targets can use their own configured print dimensions.
- The output is centered on a transparent PNG canvas and saved with 300 DPI metadata.
- The S3 key is deterministic from client, source URL, product type, and prep flags, so repeated calls reuse the same print-ready asset.
- The endpoint returns `422` and does not upload when the prepared file fails the quality gate.
- Dev smoke tests exposed an IAM-only S3 upload limitation in the dev environment; production uses the project credentials path.

Provider split:

```text
BotButt owns the creative/design object and knows what is being sold.
Phyllis owns print readiness, S3 durability, DPI validation, product creation, and fulfillment.
```

Expected first-order flow:

```text
Customer tries to buy design
-> BotButt checks Phyllis/its cache for an existing product
-> if product exists: use existing product ID and skip prep
-> if product is missing: send displayed 72 DPI image to /api/print-prep/process
-> Phyllis returns printReadyUrl after background removal/upscale/sharpen/DPI validation
-> BotButt calls /api/products/create with printReadyUrl
-> checkout proceeds with the returned product ID
```

Rules:

- Do not use Adobe Photoshop API for MVP; avoid per-image cost.
- Do not use the 72 DPI image directly for product creation.
- Do not claim a product is print-ready until Phyllis validates the prepared PNG.
- Do not re-run print-prep when the product already exists.
- Preserve aspect ratio; pad on a transparent canvas instead of stretching.
- Treat Pillow/Lanczos as MVP fallback; Real-ESRGAN or similar super-resolution can replace it later.

Detailed handoff:

```text
docs/printful/handoff_plans.md
```

## Provider Strategy

Phyllis should not stay a Printful-only wrapper. Printful is the verified first provider for shirts and general merch, but collectible posters need provenance, edition control, and certificate support.

Current routing target:

```text
Apparel / shirts -> Printful
Collectible posters / fine-art drops -> theprintspace / creativehub
General wall art fallback -> Prodigi, PrintShrimp, Pwinty, or another API-capable provider
```

Strategic rule:

```text
product type + quality needs + provenance needs + geography + cost
  -> fulfillment provider
```

The leading candidate for collectible posters is `theprintspace / creativehub` because Certificate of Authenticity support can make bot-generated limited editions credible. The supplier decision should remain behind a provider adapter instead of being hard-coded into product or order routes.

Sprint target:

```text
Do not derail the Printful/Stripe checkout sprint.
Do make product/order records provider-aware.
Do preserve fields for fulfillmentProvider, providerProductId, edition metadata, and certificate metadata.
If the second supplier API cannot be wired today, support a provider_pending/manual_fulfillment state for collectible posters.
```

Detailed plan:

```text
docs/printful/collectible_poster_fulfillment_plan.md
```

## Product Catalog Endpoints

Product catalog:

```text
GET /api/products?client_slug=discount-punk
```

Static-site-friendly catalog:

```text
GET /api/products/content.json?client_slug=discount-punk
```

These endpoints are now the clean source for Discount Punk products created through Phyllis. The old static `discountpunk/content.json` duplicate placeholder entries were cleaned.

## Printful Notes

Printful account-level tokens require store context:

```http
X-PF-Store-Id: 18110115
```

Product creation uses deterministic external IDs:

```text
{client_slug}-{12-char MD5 of designUrl::title}
```

Mockup generation uses the Printful catalog product ID, not the sync product ID:

```text
sync product ID: store product created by Printful
catalog product ID: blank product family ID used by mockup generator
```

For the verified shirt path, the catalog product ID is:

```text
71
```

## Safety Rules

Do not call Printful's final confirmation endpoint automatically.

Phyllis may create a provider order after payment, but Printful draft orders should remain unconfirmed until a human reviews them in the vendor dashboard. The vendor-side "Confirm order" control is the production gate.

For providers without a live API integration, use `provider_pending` or `manual_fulfillment` rather than pretending the order was fulfilled.

Do not publish a storefront product if Phyllis fails before returning a valid mockup/product record. Failed product creation attempts should remain draft/broken_review, not public.
