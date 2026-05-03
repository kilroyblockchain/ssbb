# BotButt Print-Prep Integration: Complete ✅

**Date:** May 2, 2026  
**Status:** Ready for Phyllis deployment

## Summary

BotButt can now create real, orderable products from generated artwork **once Replit deploys the Phyllis print-prep endpoint**.

## What's Implemented

### Core Functions (phyllis.ts)

1. **`prepareImageForPrint()`** - Calls Phyllis `/api/print-prep/process`
2. **`findExistingProduct()`** - Checks Phyllis catalog
3. **`ensurePhyllisProduct()`** - On-demand product creation
4. **`generatePrintDesign()`** - Full generate → prep → create flow

### BotButt Tools (provider.ts)

1. **`generate_print_ready_product`** - Generate from scratch
   - User: "Make me a zombie unicorn shirt"
   - BotButt: Generates art → preps for print → creates product

2. **`ensure_product_exists`** - On-demand checkout
   - Customer: Clicks "Buy Now" on web image
   - BotButt: Checks catalog → creates if needed → checkout

3. **`create_product_with_phyllis`** - Existing 300 DPI designs (unchanged)

## How It Works

### Flow 1: Generate New Product

```
User: "Create a punk rock unicorn shirt"
  ↓
BotButt calls: generate_print_ready_product
  ↓
1. Generate 1024×1024 image (GPT Image 2)
2. Upload web preview to S3
3. Call Phyllis print-prep:
   - Remove background
   - Upscale to 3600×4500
   - Stamp 300 DPI metadata
   - Validate quality
   - Upload print-ready file
4. Create Printful product
5. Add to discountpunk.com
  ↓
Product is live and orderable!
```

### Flow 2: On-Demand Checkout

```
Customer: Clicks "Buy Now" on discountpunk.com
  ↓
BotButt calls: ensure_product_exists
  ↓
1. Check Phyllis catalog
2. If exists → return product ID
3. If not exists:
   - Prep web image for print
   - Create product
   - Return new product ID
4. Use product ID for Stripe checkout
  ↓
Checkout proceeds!
```

## Fallback Behavior

If Phyllis print-prep endpoint is **not deployed yet**:

- `generate_print_ready_product` → "Print-prep service isn't live yet. Use existing 300 DPI design."
- `ensure_product_exists` → "Print-prep not available. Use existing 300 DPI design."
- BotButt gracefully falls back to old workflow

## What BotButt Can Do Now

### Before Print-Prep ❌

- ❌ Cannot generate print-ready images
- ❌ Cannot create products from generated art
- ✅ Can use existing 300 DPI designs only

### After Print-Prep ✅

- ✅ Generate web art and make it print-ready
- ✅ Create products from scratch
- ✅ On-demand product creation at checkout
- ✅ Full creative → commerce pipeline

## Testing Prompts

### Test 1: Generate Product
```
"Make me a punk zombie unicorn shirt"
```
**Expected:** Product created and live

### Test 2: Multiple Products
```
"Create 3 different animal punk shirts: zombie cat, vampire dog, ghost rabbit"
```
**Expected:** 3 products created

### Test 3: On-Demand (requires checkout integration)
```
Customer clicks Buy on a web image that's not a real product yet
```
**Expected:** Product created in real-time, checkout proceeds

### Test 4: Idempotency
```
Create product "Zombie Unicorn"
Try to create "Zombie Unicorn" again
```
**Expected:** Uses existing product, no duplicate

## What Replit Needs to Build

**Endpoint:** `POST /api/print-prep/process`

**Input:**
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

**Output:**
```json
{
  "success": true,
  "printReadyUrl": "https://ssbb-media-prod.s3.amazonaws.com/...",
  "width": 3600,
  "height": 4500,
  "dpi": 300,
  "hasAlpha": true,
  "qualityPassed": true,
  "prepMethod": "rembg+pillow-lanczos",
  "warnings": []
}
```

**Implementation:**
1. Download source image
2. Remove background (rembg)
3. Upscale to target dimensions (Pillow Lanczos MVP)
4. Center on transparent canvas
5. Sharpen
6. Save PNG with 300 DPI metadata
7. Upload to S3
8. Validate with existing Phyllis DPI check
9. Return print-ready URL

See: `/Users/karenkilroy/zorro_kilroy/ssbb/docs/printful/handoff_plans.md` for full spec

## Files Changed

### Modified
- `apps/server/src/services/phyllis.ts` - Added 3 new functions, updated generatePrintDesign
- `apps/server/src/services/provider.ts` - Added 2 new tools, updated system prompt

### Created
- `docs/PRINT_PREP_INTEGRATION.md` - Full technical documentation
- `docs/BOTBUTT_300DPI_GUIDE.md` - User guide for BotButt
- `docs/BOTBUTT_PRINT_PREP_READY.md` - This file

## Deployment Steps

1. **Review code** (you're here!)
2. **Replit builds print-prep endpoint**
3. **Test endpoint** with sample image
4. **Deploy to production**
5. **Test end-to-end** with BotButt
6. **Monitor quality** and adjust upscaling if needed

## Cost Estimate

**Per product creation:**
- Image generation: Included in Azure OpenAI
- Print-prep: Free (Phyllis compute)
- S3 storage: ~$0.001
- Printful product sync: Free
- Total: Negligible

**Per order:**
- Stripe: 2.9% + $0.30
- Phyllis: First 10 free, then $1.50
- Printful: ~$15-20
- Total: ~$17-22 COGS

**Margin on $29.99 shirt:**
- Revenue: $29.99
- COGS: ~$17-22
- Margin: ~$8-13 per shirt

## Known Limitations

1. **Source resolution:** 1024×1024 → 3600×4500 (3.5x upscaling)
2. **Upscaling method:** Lanczos (not AI super-resolution)
3. **Background removal:** Basic rembg (may struggle with complex scenes)
4. **Quality:** Good enough for most designs, not photo-quality

## Future Enhancements

1. Real-ESRGAN for better upscaling
2. Higher res generation (GPT Image 2 HD: 2048×2048)
3. Multi-color support
4. Custom placement (front/back)
5. Quality preview before creating product

## Support

**Questions?** See `/Users/karenkilroy/zorro_kilroy/ssbb/docs/PRINT_PREP_INTEGRATION.md` for full technical reference.

**Ready to test?** Once Replit deploys, just ask BotButt: "Make me a [description] shirt"

---

**Status:** ✅ BotButt side complete, awaiting Phyllis endpoint deployment
