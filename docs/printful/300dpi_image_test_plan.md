# 300 DPI Image Test Plan

Date: May 2, 2026  
Scope: BotButt, Phyllis, Discount Punk, Printful

## Current Answer

BotButt does not currently generate a new 300 DPI print image from scratch by itself.

Replit has implemented the Python print-prep path on the Phyllis side. That means BotButt should not do the image processing locally; BotButt should ask Phyllis to prepare the image when a product does not already exist.

The verified path today is:

```text
prepared 300 DPI image URL -> BotButt create_product_with_phyllis -> Phyllis DPI gate -> Printful product/mockups
```

The first-order path is now:

```text
displayed/generated 72 DPI image URL
-> BotButt checks for existing product
-> if missing, BotButt calls Phyllis /api/print-prep/process
-> Phyllis returns printReadyUrl
-> BotButt calls /api/products/create with printReadyUrl
-> checkout proceeds with returned product ID
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

That means BotButt can create a real product from an existing 300 DPI URL now. It can also create a real product from a displayed/generated image by asking Phyllis to produce the print-ready file first. The remaining BotButt integration work is to call `/api/print-prep/process` only when no existing product is found, then pass the returned `printReadyUrl` into `/api/products/create`.

## Free Python Print-Prep Path

Decision:

```text
Use Python, not Adobe Photoshop API, for the MVP print-prep pipeline.
```

Reason:

```text
Avoid per-image API costs while we prove the workflow.
```

The target internal utility is:

```text
input web/generated image
-> remove background
-> upscale to real print pixels
-> preserve transparency
-> stamp 300 DPI metadata
-> save PNG
-> upload to S3
-> run Phyllis DPI/quality gate
```

Target API:

```text
POST /api/print-prep/process
```

Implemented request shape:

```json
{
  "clientSlug": "discount-punk",
  "sourceImageUrl": "https://...",
  "productType": "shirt",
  "removeBackground": true,
  "upscale": true,
  "sharpen": true
}
```

Implemented response shape:

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

BotButt usage rule:

```text
Only call print-prep if the product does not already exist.
If the product exists, reuse the existing Phyllis/Printful product ID and skip all image prep.
```

Recommended Python stack:

| Step | Library | Purpose |
|------|---------|---------|
| Background removal | `rembg` | AI background removal using U2-Net/ONNX |
| MVP upscale/canvas | `Pillow` Lanczos | Increase pixel dimensions, preserve aspect ratio, pad to transparent print canvas |
| Sharpen | `Pillow`/image filter | Mild post-resize sharpening |
| Metadata/final PNG | `Pillow` | Save transparent PNG and set 300 DPI metadata |

Future stack:

| Step | Library | Purpose |
|------|---------|---------|
| True super-resolution | `Real-ESRGAN` or similar | Replace MVP Lanczos for generated-from-small-source art before high-volume selling |

Important:

```text
300 DPI metadata alone is not enough.
The file must also have enough pixels for the intended print size.
```

Implementation notes:

- `rembg` uses a U2-Net ONNX model. First call can be slow while the model downloads; later calls should be faster.
- Current MVP resize is Pillow/Lanczos plus mild sharpening, not true AI super-resolution.
- The output S3 key is deterministic, so repeated calls with the same inputs reuse the same print-ready file.
- If Phyllis cannot verify output dimensions, transparency, and 300 DPI metadata, the endpoint returns `422` and does not upload.
- Replit's dev smoke test found a dev IAM upload limitation; production should use the full project credentials path.

For example:

| Product | Target pixels | Meaning |
|---------|---------------|---------|
| T-shirt print area | 3600 x 4500 | 12 x 15 inches at 300 DPI |
| Poster 11x17 | 3300 x 5100 | 11 x 17 inches at 300 DPI |
| Letter | 2550 x 3300 | 8.5 x 11 inches at 300 DPI |

Implementation rule:

```text
Preserve aspect ratio. Do not blindly stretch art to 3600 x 4500.
If needed, upscale proportionally and then pad transparent canvas to the target print area.
```

Example utility shape:

```python
import io
from PIL import Image
from rembg import remove


def fit_on_transparent_canvas(img: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    target_w, target_h = target_size
    img = img.convert("RGBA")

    scale = min(target_w / img.width, target_h / img.height)
    resized = img.resize(
        (round(img.width * scale), round(img.height * scale)),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    x = (target_w - resized.width) // 2
    y = (target_h - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def process_for_print(input_path: str, output_path: str, target_size=(3600, 4500)) -> None:
    with open(input_path, "rb") as source:
        subject_bytes = remove(source.read())

    image = Image.open(io.BytesIO(subject_bytes)).convert("RGBA")

    # MVP fallback. Replace this step with Real-ESRGAN for higher quality.
    print_canvas = fit_on_transparent_canvas(image, target_size)

    print_canvas.save(output_path, format="PNG", dpi=(300, 300))
```

Acceptance criteria:

- Output is PNG.
- Output keeps alpha/transparency.
- Output dimensions match or exceed target print pixels.
- Output metadata reports 300 DPI.
- Phyllis accepts the output through `/api/verify-image-quality`.
- Phyllis rejects the output if dimensions or metadata are insufficient.

MVP warning:

```text
Lanczos resize is acceptable for a quick test utility.
Real-ESRGAN or another true super-resolution model should replace it before selling generated-from-small-source art.
```

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

### Test 6: BotButt Creates First Product Through Phyllis Print Prep

Purpose: verify the new first-order path for a displayed/generated image that is not already a print product.

Prompt to BotButt:

```text
Create a real Discount Punk shirt product from the image currently displayed in chat.
```

Expected result today:

1. BotButt checks whether a Phyllis product already exists for the design.
2. If no product exists, BotButt calls `POST /api/print-prep/process` with the displayed image URL.
3. BotButt waits for `printReadyUrl`.
4. BotButt calls `/api/products/create` with `printReadyUrl`, not the original display image.
5. BotButt starts checkout using the returned product ID.

Pass criteria:

- Phyllis returns a 300 DPI transparent PNG at `discount-punk/images/print-ready/{hash}.png`.
- BotButt never sends the original 72 DPI/display image to `/api/products/create`.
- Product creation succeeds or fails with a clear Phyllis error.
- If Phyllis print prep returns `422`, BotButt does not create a product or start checkout.

Fail criteria:

- BotButt says it created a 300 DPI print file without a real `printReadyUrl`.
- BotButt sends a normal generated image to Phyllis as if it were print-ready.
- BotButt repeats print prep when the product already exists.

### Test 7: Future BotButt Native 300 DPI Generation Acceptance Test

Purpose: define what “implemented” means if BotButt later gets its own true print file generation instead of delegating print prep to Phyllis.

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
Integrate BotButt with Phyllis print prep for first-order product creation.

Requirements:
- before checkout, check whether the product already exists
- if it exists, reuse the existing Phyllis/Printful product ID
- if it does not exist, call POST /api/print-prep/process with the displayed image URL
- pass only the returned printReadyUrl to /api/products/create
- never pass the display/web preview image to Phyllis product creation
- surface 422 quality errors clearly to the user
- add tests proving existing products skip print prep and missing products call print prep exactly once
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
