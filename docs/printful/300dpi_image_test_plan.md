# 300 DPI Image Test Plan

Date: May 2, 2026  
Scope: BotButt, Phyllis, Discount Punk, Printful

## Current Answer

BotButt does not currently generate a new 300 DPI print image from scratch.

The working path today is:

```text
prepared 300 DPI image URL -> BotButt create_product_with_phyllis -> Phyllis DPI gate -> Printful product/mockups
```

The known-good Discount Punk asset is:

```text
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png
```

Known specs:

- File: `eat-my-donkey-300dpi.png`
- Source: exported from PSD/source artwork and uploaded to S3
- Resolution: 4267 x 4575 pixels
- Density: 300 DPI
- Format: PNG with transparency
- Status: ready for Phyllis and Printful

In the BotButt code, `generatePrintDesign` exists but is not implemented yet. It currently returns failure with:

```text
Image generation not yet implemented. Please use an existing 300 DPI design URL with Phyllis directly.
```

That means BotButt can create a real product from an existing 300 DPI URL, but cannot yet create the new 300 DPI file itself.

## Current Verified Product Path

As of May 2, 2026, the existing-asset path is verified end to end through product creation:

```text
BotButt -> create_product_with_phyllis -> Phyllis -> DPI validation -> Printful sync product -> Printful mockup -> Phyllis products table -> Discount Punk dashboard
```

Verified product:

```text
Title: Eat My Donkey
Printful ID: 430745217
External ID: discount-punk-4149b8b559c5
Price: $29.99
Dashboard status: Active
```

Verified behavior:

- Phyllis creates or finds the Printful sync product.
- Mockup generation returns a real shirt PNG.
- Product creation is idempotent: same title + same design URL returns the existing product.
- Discount Punk can see the product in the Phyllis Products tab.

Still pending for full shopper E2E:

- Public Discount Punk **Buy Now** button must call the real Stripe checkout flow instead of showing "coming soon."
- Stripe webhook must save the paid order and submit it through the provider adapter.
- Printful should show a draft/provider order; the vendor dashboard remains the final production gate.

## What Is Implemented Today

### BotButt

BotButt has a tool named `create_product_with_phyllis`.

It requires:

- `design_url`: public S3 URL for an already prepared 300 DPI image
- `title`: product title
- `description`: product description
- `colors`: optional shirt colors

Expected behavior:

1. BotButt sends the design URL to Phyllis.
2. Phyllis validates DPI.
3. Phyllis creates the Printful product.
4. Phyllis fetches Printful mockups.
5. BotButt adds the product to Discount Punk with the returned mockup.

### Phyllis

Phyllis is responsible for the production gate:

- shirts: reject below 150 DPI, warn below 300 DPI
- posters: reject below 300 DPI
- collectible/limited editions: reject below 300 DPI

The gate belongs in Phyllis because Phyllis is the fulfillment operator. BotButt can ask for products, but Phyllis decides whether a print file is safe to sell.

## Test Plan

### Test 1: Known 300 DPI Asset Is Publicly Reachable

Purpose: confirm the source image is reachable before BotButt or Phyllis uses it.

Input:

```text
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png
```

Steps:

1. Run a `HEAD` or small download check against the URL.
2. Confirm response status is `200`.
3. Confirm content type is image-like, preferably `image/png`.
4. Confirm the URL is not presigned or expiring.

Pass criteria:

- URL returns `200`.
- Image can be fetched by the server.
- URL is durable enough for Printful to fetch later.

Fail criteria:

- URL returns `403`, `404`, timeout, or redirects to an authenticated page.

### Test 2: Image Metadata Confirms Print Readiness

Purpose: confirm the asset is actually print-ready, not merely named `300dpi`.

Steps:

1. Download the image in a safe test environment.
2. Inspect metadata with Sharp or Phyllis's image quality endpoint.
3. Record width, height, density, format, and alpha/transparency.

Expected result:

```text
width: 4267
height: 4575
density: 300
format: png
alpha: true
```

Pass criteria:

- Density is 300.
- Dimensions are large enough for the intended print area.
- File is PNG and keeps transparency.

Fail criteria:

- Density is missing or defaults to 72.
- Dimensions are too small for the target product.
- Transparency is lost.

### Test 3: Phyllis Accepts Known-Good Shirt Asset

Purpose: confirm Phyllis accepts the real Discount Punk image for product creation.

Endpoint:

```text
POST /api/products/create
```

Request shape:

```json
{
  "design_url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png",
  "title": "Eat My Donkey Test Shirt",
  "description": "Test product for the 300 DPI print flow.",
  "colors": ["black"],
  "client_id": "discountpunk"
}
```

Pass criteria:

- Phyllis returns success.
- Response includes Printful product ID or product creation reference.
- Response includes mockup URLs when mockup generation is enabled.
- Product record is associated with the correct client/site.

Fail criteria:

- Phyllis rejects the file for DPI.
- Phyllis creates a product without recording the source design URL.
- Product is created under the wrong client.

### Test 4: Phyllis Rejects Low-DPI Poster Asset

Purpose: protect collectible posters from weak print files.

Steps:

1. Use a known low-DPI image or a test image with 72 DPI metadata.
2. Submit it as a poster product.
3. Confirm Phyllis rejects it before Printful product creation.

Pass criteria:

- Phyllis returns `422`.
- Error says posters require 300 DPI.
- No Printful product is created.
- No customer-facing product goes live.

Fail criteria:

- Phyllis warns but allows the poster.
- Product or mockup creation starts before rejection.

### Test 5: BotButt Creates Real Product Using Existing 300 DPI URL

Purpose: verify the currently implemented BotButt-to-Phyllis path.

Prompt to BotButt:

```text
Create a real Discount Punk product called Eat My Donkey Test Shirt using this 300 DPI design URL:
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png
```

Expected BotButt behavior:

1. BotButt uses `create_product_with_phyllis`.
2. BotButt passes the exact design URL.
3. Phyllis validates DPI.
4. Phyllis creates the Printful product and mockups.
5. BotButt adds the product to Discount Punk.

Pass criteria:

- BotButt does not invent a design URL.
- BotButt does not use the fake `add_product` path for a real product.
- The final response includes product link and Printful product reference.

Fail criteria:

- BotButt claims it generated a 300 DPI file when it did not.
- BotButt uses a web/preview image for fulfillment.
- Product appears without Phyllis validation.

### Test 6: BotButt Must Not Claim New 300 DPI Generation Works Yet

Purpose: avoid false confidence and bad orders.

Prompt to BotButt:

```text
Generate a brand new 300 DPI print-ready shirt design and create it as a real product.
```

Expected result today:

- BotButt should either ask for an existing 300 DPI URL or clearly report that print design generation is not implemented yet.
- BotButt must not claim the product is print-ready unless it has a real 300 DPI URL.

Pass criteria:

- BotButt refuses or redirects to the existing-asset flow.
- No product is created from a low-res generated preview.

Fail criteria:

- BotButt says it created a 300 DPI print file without a real file.
- BotButt sends a normal generated image to Phyllis as if it were print-ready.

### Test 7: Future BotButt 300 DPI Generation Acceptance Test

Purpose: define what “implemented” means when BotButt gets true print file generation.

Future implementation must:

1. Generate or receive high-resolution source art.
2. Place it on the correct print canvas for the target product.
3. Export a PNG at the target pixel dimensions.
4. Stamp metadata with 300 DPI.
5. Save both files to S3:
   - print file: `*-300dpi.png`
   - web preview: `*-web.png`
6. Return durable URLs for both files.
7. Submit only the 300 DPI URL to Phyllis.

Target presets:

| Product | Pixel Dimensions | Physical Size |
| --- | ---: | --- |
| T-shirt | 3600 x 4500 | 12 x 15 inches at 300 DPI |
| Poster 11x17 | 3300 x 5100 | 11 x 17 inches at 300 DPI |
| Letter | 2550 x 3300 | 8.5 x 11 inches at 300 DPI |

Acceptance criteria:

- Output image metadata reports 300 DPI.
- Output dimensions match the selected preset.
- Transparent artwork remains transparent.
- Phyllis accepts the print URL.
- Phyllis rejects the web preview if it is accidentally submitted for poster/collectible fulfillment.
- BotButt stores the returned print URL and preview URL separately.

## Replit Implementation Task

Recommended task text:

```text
Implement BotButt's generatePrintDesign path for real 300 DPI print assets.

Requirements:
- generate or receive high-resolution source art
- composite onto product preset canvas with Sharp
- export a 300 DPI PNG via Sharp metadata
- upload the print file and web preview to S3
- return design_300dpi and design_web URLs
- never pass design_web to Phyllis fulfillment endpoints
- add unit tests for dimensions, density, URL shape, and failure paths
- add an integration test proving Phyllis accepts design_300dpi and rejects low-DPI files
```

## Go/No-Go Rule

Before an item can become a real product:

```text
No durable 300 DPI URL, no product creation.
```

For customer-facing orders:

```text
No Phyllis DPI pass, no checkout.
```
