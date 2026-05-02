# ✅ Printful Integration - Product Path Verified

**The prepared 300 DPI asset path is now verified through Phyllis product creation, Printful sync product creation, mockup generation, and dashboard visibility.**

---

## Product Image (300 DPI)

**File:** `eat-my-donkey-300dpi.png`  
**S3 URL:** `https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png`

**Specifications:**
- Resolution: 4267 x 4575 pixels
- DPI: 300 x 300 ✅
- Print size: 14.2" x 15.25" at 300 DPI
- Format: PNG with transparency
- File size: 7.87 MB
- **Status:** PASSES BotButt's 300 DPI gate!

---

## Bella+Canvas 3001 (Black) - Variant IDs

**Verified from Printful API:**

```typescript
const VARIANT_MAP: Record<string, number> = {
  'S': 4016,
  'M': 4017,
  'L': 4018,
  'XL': 4019,
  '2XL': 4020,
  '3XL': 5295
};
```

---

## Example Printful Order Payload

```typescript
{
  "recipient": {
    "name": "Karen Kilroy",
    "address1": "[YOUR ADDRESS]",
    "city": "[YOUR CITY]",
    "state_code": "[YOUR STATE]",
    "country_code": "US",
    "zip": "[YOUR ZIP]"
  },
  "items": [{
    "variant_id": 4017,  // M size
    "quantity": 1,
    "files": [{
      "url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png"
    }]
  }]
}
```

---

## Code Snippet for Webhook

```typescript
// In webhook handler after payment succeeds:

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
    variant_id: VARIANT_MAP[item.size],  // Map size to variant ID
    quantity: item.quantity,
    files: [{
      url: 'https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png'
    }]
  }))
};

const printfulResult = await createPrintfulOrderWithRetry(printfulOrder, 3);
console.log('[webhook] Printful order created:', printfulResult.id);
```

---

## No Upscaling Needed!

**Original plan:** Upscale on-demand with Gemini  
**New reality:** Karen provided 300 DPI source file  
**Result:** Just use the image directly, no upscaling needed ✅

---

## Verified Product Path

As of May 2, 2026:

```text
BotButt -> Phyllis -> DPI validation -> Printful sync product -> Printful mockup -> Phyllis dashboard
```

Verified product:

```text
Title: Eat My Donkey
Printful ID: 430745217
External ID: discount-punk-4149b8b559c5
Price: $29.99
Status: Active
```

Implementation notes:

- Printful calls require `X-PF-Store-Id: 18110115` for the Discount Punk store.
- Product creation uses a deterministic external ID so retries do not create duplicates.
- Mockup generation uses the Printful catalog product ID, not the sync product ID.
- The verified catalog product ID for the current shirt path is `71`.
- Mockups are persisted to S3 when IAM allows it; otherwise Phyllis can fall back to Printful CDN URLs.

Remaining storefront task:

```text
Wire the public Discount Punk Buy Now button to the real Stripe checkout flow.
```

---

## What Replit Needs to Know

1. **Image is ready** - Use `eat-my-donkey-300dpi.png` from S3
2. **Variant IDs confirmed** - Use the map above
3. **No upscaling** - Image already meets 300 DPI requirement
4. **DPI verification** - Can still implement, but image will pass
5. **Printful API** - Use v1 (stable production)

---

## Testing Tomorrow

**Local test (without real order):**
```typescript
// Test Printful order creation
const testOrder = {
  recipient: {
    name: "Test Customer",
    address1: "123 Test St",
    city: "Austin",
    state_code: "TX",
    country_code: "US",
    zip: "78701"
  },
  items: [{
    variant_id: 4017,  // M size
    quantity: 1,
    files: [{
      url: "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png"
    }]
  }]
};

const result = await createPrintfulOrder(testOrder);
console.log('Test order created:', result);
```

**End-to-end test:**
1. Complete checkout on discountpunk.com
2. Payment succeeds
3. Webhook creates Printful order
4. Check Printful dashboard for order
5. Verify image looks good in mockup

---

## Karen's Checklist - COMPLETE ✅

- [x] 300 DPI image obtained (from PSD source)
- [x] Image uploaded to S3
- [x] Printful variant IDs verified
- [x] Documentation updated
- [x] Ready for sprint tomorrow

---

**Everything is ready. No image work needed tomorrow. Just code and ship!** 🔥🚀
