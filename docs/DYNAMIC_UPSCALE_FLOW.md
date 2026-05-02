# Dynamic Image Upscaling + Printful Order Flow

**New approach:** Upscale images on-demand when orders come in, not pre-upload to Printful.

---

## The Flow

```
1. Customer orders "Eat My Ass Tee" (Size M)
   ↓
2. Stripe Checkout → Payment succeeds
   ↓
3. Webhook: payment_intent.succeeded
   ↓
4. Get product image from S3 (1024x1024, 72 DPI)
   ↓
5. Check if upscaled version exists in S3 cache
   ├─ YES → Use cached 4096x4096 image
   └─ NO  → Upscale with Gemini Imagen 4
            Save to S3: discountpunk/images/upscaled/
   ↓
6. Create Printful order with upscaled image URL
   ↓
7. Save order to S3 with Printful order ID
   ↓
8. Return 200 OK to Stripe
```

---

## Benefits

✅ **No pre-setup in Printful** - Products created on-demand  
✅ **300 DPI guaranteed** - Gemini upscales to 4096x4096  
✅ **Caching** - First order upscales, subsequent orders reuse  
✅ **Flexible** - Works for any product, any image  
✅ **BotButt-proof** - Passes the 300 DPI gate automatically  

---

## Code Changes Needed

### 1. Add Gemini Upscaling Service

**File:** `apps/server/src/services/gemini-upscale.ts`

```typescript
import { readObject, writeBuffer } from './s3.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UPSCALE_CACHE_PREFIX = 'discountpunk/images/upscaled/';

export async function getUpscaledImageUrl(
  originalImageKey: string,
  bucket: string
): Promise<string> {
  // Check cache first
  const cacheKey = `${UPSCALE_CACHE_PREFIX}${originalImageKey.split('/').pop()}`;
  
  try {
    const cached = await readObject(bucket, cacheKey);
    if (cached) {
      console.log('[upscale] Using cached upscaled image:', cacheKey);
      return `https://${bucket}.s3.amazonaws.com/${cacheKey}`;
    }
  } catch (err) {
    // Not cached, need to upscale
  }

  // Fetch original image
  console.log('[upscale] Upscaling image:', originalImageKey);
  const originalBuffer = await readBuffer(bucket, originalImageKey);
  
  // Upscale with Gemini Imagen 4
  const upscaledBuffer = await upscaleWithGemini(originalBuffer);
  
  // Cache upscaled version
  await writeBuffer(bucket, cacheKey, upscaledBuffer, 'image/png');
  console.log('[upscale] Cached upscaled image:', cacheKey);
  
  return `https://${bucket}.s3.amazonaws.com/${cacheKey}`;
}

async function upscaleWithGemini(imageBuffer: Buffer): Promise<Buffer> {
  const imageB64 = imageBuffer.toString('base64');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "upscale to maximum resolution preserving all details, sharp and crisp",
        config: {
          numberOfImages: 1,
          editConfig: {
            editMode: "EDIT_MODE_UPSCALE",
            referenceImage: {
              imageBytes: imageB64
            }
          }
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini upscale failed: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.generatedImages || result.generatedImages.length === 0) {
    throw new Error('No upscaled image returned from Gemini');
  }

  const upscaledB64 = result.generatedImages[0].imageBytes;
  return Buffer.from(upscaledB64, 'base64');
}
```

---

### 2. Update Webhook to Upscale Before Printful

**File:** `apps/server/src/routes/discountpunk.ts`

```typescript
import { getUpscaledImageUrl } from '../services/gemini-upscale.js';

// In webhook handler, after order saved to S3:

// Upscale product image for Printful
const originalImageUrl = order.items[0].imageUrl;
const imageKey = originalImageUrl.split('.amazonaws.com/')[1]; // Extract S3 key

console.log('[webhook] Upscaling image for Printful order...');
const upscaledImageUrl = await getUpscaledImageUrl(imageKey, BUCKET);

// Create Printful order with upscaled image
const printfulOrder = {
  recipient: {
    name: order.shippingAddress.name,
    address1: order.shippingAddress.line1,
    address2: order.shippingAddress.line2,
    city: order.shippingAddress.city,
    state_code: order.shippingAddress.state,
    country_code: order.shippingAddress.country,
    zip: order.shippingAddress.postal_code
  },
  items: order.items.map(item => ({
    variant_id: getPrintfulVariantId(item.size),
    quantity: item.quantity,
    files: [{
      url: upscaledImageUrl  // Use upscaled image, not original
    }]
  }))
};

const printfulResult = await createPrintfulOrderWithRetry(printfulOrder);
```

---

### 3. Printful Variant Mapping (Still Needed)

We still need variant IDs for Printful, but we don't need to pre-upload designs.

**File:** `apps/server/src/services/printful.ts`

```typescript
// Bella+Canvas 3001 - Black - Variant IDs
const VARIANT_MAP: Record<string, number> = {
  'S': 4012,   // Get actual IDs from Printful API
  'M': 4013,
  'L': 4014,
  'XL': 4015,
  '2XL': 4016,
  '3XL': 4017
};

export function getPrintfulVariantId(size: string): number {
  const variantId = VARIANT_MAP[size];
  if (!variantId) {
    throw new Error(`Unknown size: ${size}`);
  }
  return variantId;
}
```

---

## Get Printful Variant IDs (Quick Task)

Instead of setting up a product in Printful dashboard, just query their API:

```bash
curl -X GET "https://api.printful.com/products/71" \
  -H "Authorization: Bearer YOUR_PRINTFUL_API_KEY"
```

Look for **Bella+Canvas 3001** variants in **Black** color.

Or use this shortcut - standard Bella+Canvas 3001 variant IDs:
- S (Black): 4012
- M (Black): 4013
- L (Black): 4014
- XL (Black): 4015
- 2XL (Black): 4016
- 3XL (Black): 4017

**Verify these with Printful API call.**

---

## Testing the Flow

### 1. Local Test (Without Real Order)

```typescript
// Test upscaling function
const imageKey = 'discountpunk/images/1777621889057-eat-my-[donkey]-tee.png';
const upscaledUrl = await getUpscaledImageUrl(imageKey, 'ssbb-media-prod');
console.log('Upscaled URL:', upscaledUrl);

// Verify it's 4096x4096
// Download and check with `identify`
```

### 2. End-to-End Test

1. Complete real checkout on discountpunk.com
2. Webhook fires
3. Watch logs: "[upscale] Upscaling image..."
4. Check S3: `s3://ssbb-media-prod/discountpunk/images/upscaled/`
5. Verify Printful order created with upscaled URL
6. Check Printful dashboard - order should appear

---

## Sprint Task Update

### Updated Task 6: Dynamic Upscaling + Printful

**Old:** Pre-upload design to Printful, get variant IDs, create order

**New:**
1. Add Gemini upscaling service (`gemini-upscale.ts`)
2. Get Printful variant IDs from API (no dashboard setup needed)
3. Update webhook to upscale-then-create-printful-order
4. Add S3 caching for upscaled images
5. Test with real order

**Time estimate:** Still 1-2 hours (similar to old approach)

---

## Karen's Tasks Update

### ✅ DONE TODAY:
- [x] AWS IAM user for Replit
- [x] Gemini API key in AWS Secrets Manager

### ❌ NO LONGER NEEDED:
- ~~Go to Printful dashboard~~
- ~~Upload design~~
- ~~Create product mockup~~

### ✅ STILL NEEDED:
- [ ] Get Printful variant IDs via API call (5 min)
- [ ] Send variant IDs to Replit
- [ ] Create GitHub repo with base code
- [ ] Send credentials to Replit

---

## Benefits of This Approach

1. **Faster setup** - No Printful dashboard work needed
2. **More flexible** - Works for any product BotButt adds in the future
3. **Always 300 DPI** - Automatic upscaling
4. **Caching** - First order pays upscaling cost, rest are instant
5. **Testable** - Can test upscaling without placing real orders

---

**This is the way.** 🔥

Let Replit know about this flow - it's cleaner than pre-uploading to Printful!
