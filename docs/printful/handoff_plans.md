Plan For Replit: Phyllis Print-Prep Endpoint

Goal: Phyllis can accept a low-res/generated image URL, make a print-ready PNG, verify it, upload it, and return a
durable printReadyUrl.

Add endpoint:

POST /api/print-prep/process

Request:

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

Response:

{
"success": true,
"printReadyUrl": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/print-ready/...",
"width": 3600,
"height": 4500,
"dpi": 300,
"hasAlpha": true,
"qualityPassed": true
}

Implementation:

1. Download sourceImageUrl.
2. Remove background with rembg.
3. Upscale to real print dimensions.
    - MVP fallback: Pillow Lanczos.
    - Preferred: Real-ESRGAN if Replit can support it.
4. Preserve aspect ratio.
5. Center image on transparent 3600x4500 canvas for shirts.
6. Apply mild sharpening.
7. Save PNG with dpi=(300, 300).
8. Upload to S3 under:
   discountpunk/images/print-ready/{hash}.png
9. Run existing Phyllis DPI/quality validation against the uploaded URL.
10. Return printReadyUrl only if validation passes.

Important rules:

- Do not just stamp 300 DPI metadata.
- Output must have real pixel dimensions.
- Do not stretch art.
- If prep fails, return a clear error and do not create a product.
- If source image is too ugly/blurry after upscale, return warning if possible.

Also add metadata to response:

{
"sourceImageUrl": "...",
"sourceWidth": 1024,
"sourceHeight": 1024,
"prepMethod": "rembg+pillow-lanczos",
"warnings": ["MVP resize used; not AI super-resolution"]
}

Testing:

1. 72 DPI source -> returns 3600x4500 transparent PNG.
2. Output has alpha channel.
3. Output metadata says 300 DPI.
4. Output passes /api/verify-image-quality.
5. Bad image URL returns 400/422.
6. Failed background removal returns visible error.
7. Same source image + same target creates deterministic output or reuses existing S3 object.

Plan For Claude: BotButt On-The-Fly Product Creation

Goal: BotButt can sell a design even if the product does not exist yet.

Current desired flow:

Customer tries to buy a BotButt design
-> BotButt checks whether product already exists
-> if product exists: use existing Phyllis/Printful product ID
-> if product does not exist:
grab displayed 72 DPI image URL
send to Phyllis print-prep
get 300 DPI transparent printReadyUrl
ask Phyllis to create product
use returned product ID for checkout
-> create Stripe checkout
-> order goes through

BotButt should add a helper like:

ensure_phyllis_product_for_design(design)

Pseudo-flow:

async function ensurePhyllisProductForDesign(design) {
// 1. Check existing product cache/catalog first
const existing = await findExistingProduct({
title: design.title,
sourceImageUrl: design.imageUrl,
clientSlug: "discount-punk"
});

    if (existing?.printful_product_id) {
      return {
        productExisted: true,
        product: existing
      };
    }

    // 2. Product does not exist. Ask Phyllis to prep the displayed image.
    const prep = await fetch(`${PHYLLIS_API}/api/print-prep/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": PHYLLIS_CLIENT_KEY
      },
      body: JSON.stringify({
        clientSlug: "discount-punk",
        sourceImageUrl: design.imageUrl,
        productType: "shirt",
        targetWidth: 3600,
        targetHeight: 4500,
        removeBackground: true,
        upscale: true,
        sharpen: true
      })
    }).then(r => r.json());

    if (!prep.success || !prep.qualityPassed) {
      throw new Error(`Phyllis could not prepare image for print: ${prep.error || prep.warnings?.join(", ")}`);
    }

    // 3. Create the product with the print-ready URL.
    const product = await fetch(`${PHYLLIS_API}/api/products/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": PHYLLIS_CLIENT_KEY
      },
      body: JSON.stringify({
        clientSlug: "discount-punk",
        design_url: prep.printReadyUrl,
        source_image_url: design.imageUrl,
        title: design.title,
        description: design.description,
        product_type: "shirt",
        retail_price: "29.99",
        colors: ["black"]
      })
    }).then(r => r.json());

    if (!product.success) {
      throw new Error(`Phyllis product creation failed: ${product.error}`);
    }

    return {
      productExisted: false,
      product: product.product,
      printReadyUrl: prep.printReadyUrl
    };
}

Then checkout flow:

const ensured = await ensurePhyllisProductForDesign(design);

const checkout = await fetch(`${PHYLLIS_API}/api/discountpunk/checkout/create-session`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
printful_product_id: ensured.product.printful_product_id,
size,
quantity,
successUrl: "https://discountpunk.com/order-confirmed",
cancelUrl: "https://discountpunk.com/shop"
})
}).then(r => r.json());

window.location.href = checkout.url;

BotButt rules:

- Always check for existing product first.
- Never re-prep/recreate product if Phyllis already has it.
- Never use the 72 DPI display image directly for product creation.
- Never claim product is print-ready until Phyllis print-prep and verify-image-quality pass.
- If prep fails, tell user the design needs a better source image.
- Store/cache mapping:
  sourceImageUrl/design hash -> Phyllis product ID -> Printful product ID.

Recommended idempotency key:

clientSlug + sourceImageUrl + title + productType

BotButt should persist:

{
"designId": "botbutt_design_123",
"sourceImageUrl": "https://...",
"printReadyUrl": "https://...",
"phyllisProductId": "...",
"printfulProductId": 430745217,
"externalId": "discount-punk-...",
"createdAt": "..."
}

Failure handling:

If print-prep fails:
do not start checkout
tell user Phyllis could not prepare the image

If product creation fails:
do not start checkout
show Phyllis error

If checkout creation fails:
product can remain created
retry checkout only

The clean mental model:

BotButt owns the creative idea.
Phyllis owns print readiness and fulfillment.
Stripe owns payment.
Printful owns final production confirmation.