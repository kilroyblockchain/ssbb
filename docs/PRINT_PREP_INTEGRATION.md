# Print-Prep Integration: BotButt Side

**Status:** ✅ Implemented (awaiting Phyllis endpoint)  
**Date:** May 2, 2026

## Overview

This integration enables BotButt to create real, orderable products from scratch by:
1. Generating web-quality images (GPT Image 2: 1024×1024)
2. Sending to Phyllis print-prep service for background removal + upscaling to 300 DPI
3. Creating Printful products with verified print-ready files
4. Making products immediately orderable on discountpunk.com

## Architecture

```
BotButt (SSBB)                 Phyllis (Replit)              Printful
─────────────                  ─────────────                 ────────
                                                             
Generate image                                              
  (GPT Image 2)                                             
  1024x1024                                                 
       │                                                    
       ↓                                                    
Upload to S3                                                
  (web preview)                                             
       │                                                    
       ↓                                                    
Call print-prep  ────────→  Remove background               
                            Upscale to 3600x4500            
                            Stamp 300 DPI metadata          
                            Validate quality                
                            Upload to S3                    
                            Return printReadyUrl            
       │                           │                        
       ↓                           ↓                        
Create product   ────────→  Create Printful product  ───→  Sync product
                            Generate mockups          ←───  Return mockups
       │                           │                        
       ↓                           ↓                        
Add to website                Return product data           
Product is live!                                            
```

## New Functions in phyllis.ts

### 1. `prepareImageForPrint()`

Prepares a web/low-res image for print production.

**Input:**
```typescript
{
  source_image_url: string;        // Web image URL (can be 72 DPI)
  product_type?: 'shirt' | 'poster' | 'letter';
  remove_background?: boolean;     // default: true
  upscale?: boolean;               // default: true
  sharpen?: boolean;               // default: true
}
```

**Output:**
```typescript
{
  success: boolean;
  printReadyUrl?: string;          // S3 URL of 300 DPI file
  width?: number;                  // 3600 for shirts
  height?: number;                 // 4500 for shirts
  dpi?: number;                    // 300
  hasAlpha?: boolean;              // true (transparent)
  qualityPassed?: boolean;         // Phyllis validation result
  prepMethod?: string;             // "rembg+pillow-lanczos" or "rembg+real-esrgan"
  warnings?: string[];             // Quality warnings
  error?: string;
}
```

**Calls:**
```
POST https://phyllis-fills.replit.app/api/print-prep/process
```

### 2. `findExistingProduct()`

Checks if a product already exists in Phyllis catalog.

**Input:**
```typescript
{
  title: string;
  source_image_url?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  product?: {
    id: string;
    printful_product_id: number;
    external_id: string;
    title: string;
    design_url: string;
    retail_price: string;
    mockup_urls: string[];
    active: boolean;
  };
  error?: string;
}
```

### 3. `ensurePhyllisProduct()`

**Main entry point for on-demand product creation.**

Checks if product exists. If not, preps the image and creates it.

**Input:**
```typescript
{
  title: string;
  description: string;
  source_image_url: string;        // Can be web-quality
  product_type?: 'shirt' | 'poster' | 'letter';
  colors?: string[];
  retail_price?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  product_existed: boolean;        // true if found existing
  printful_product_id?: number;
  external_id?: string;
  print_ready_url?: string;
  mockup_urls?: string[];
  retail_price?: string;
  prep_warnings?: string[];
  error?: string;
}
```

**Logic:**
1. Call `findExistingProduct(title)`
2. If found → return existing product
3. If not found:
   - Call `prepareImageForPrint(source_image_url)`
   - Call `createProductWithPhyllis(printReadyUrl)`
   - Return new product

### 4. `generatePrintDesign()` (updated)

Now fully implemented! Generates image → preps for print → creates product.

**Input:**
```typescript
{
  prompt: string;
  title: string;
  description?: string;
  preset?: 't-shirt' | 'poster-11x17' | 'letter';
}
```

**Output:**
```typescript
{
  success: boolean;
  product_url: string;
  design_300dpi: string;           // Print-ready S3 URL
  design_web: string;              // Web preview S3 URL
  printful_product_id?: number;
  mockups?: Record<string, string>;
  error?: string;
}
```

## New BotButt Tools

### 1. `generate_print_ready_product`

Generate brand new product from text prompt.

**When to use:** "Make me a zombie unicorn shirt"

**Parameters:**
- `prompt`: Image generation prompt
- `title`: Product title
- `description`: Product description
- `product_type`: "shirt", "poster", or "letter" (optional)

**Example:**
```javascript
{
  "prompt": "punk zombie unicorn character design for t-shirt, vibrant colors, isolated on white background, print-ready",
  "title": "Zombie Unicorn Tee",
  "description": "Punk rock zombie unicorn design",
  "product_type": "shirt"
}
```

**Flow:**
1. Generates 1024×1024 image via GPT Image 2
2. Uploads web preview to S3
3. Calls Phyllis print-prep
4. Creates Printful product
5. Adds to discountpunk.com

### 2. `ensure_product_exists`

On-demand product creation for checkout.

**When to use:** Customer clicks "Buy Now" on a design that may not be a real product yet

**Parameters:**
- `title`: Product title
- `description`: Product description
- `source_image_url`: Web image URL (can be low-res)
- `product_type`: "shirt", "poster", or "letter" (optional)
- `retail_price`: Price (optional, default "29.99")

**Example:**
```javascript
{
  "title": "BotButt Face Tee",
  "description": "BotButt character portrait",
  "source_image_url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/botbutt-web.png",
  "product_type": "shirt",
  "retail_price": "29.99"
}
```

**Flow:**
1. Check Phyllis catalog
2. If exists → return product ID
3. If not:
   - Prep image for print
   - Create product
   - Return new product ID
4. Use product ID for Stripe checkout

### 3. `create_product_with_phyllis` (unchanged)

Still available for pre-made 300 DPI designs.

**When to use:** You have a known 300 DPI design URL

**Example:**
```javascript
{
  "design_url": "https://ssbb-media-prod.s3.amazonaws.com/discount-punk/designs/botbutt-300dpi.png",
  "title": "BotButt",
  "description": "Multi-armed purple robot",
  "colors": ["black"]
}
```

## Fallback Behavior

If Phyllis print-prep endpoint is not available:

**`generate_print_ready_product` →** Returns error: "Print-prep service isn't live yet. Please use create_product_with_phyllis with an existing 300 DPI image URL."

**`ensure_product_exists` →** Returns error: "Print-prep service isn't available yet. Cannot create product on-demand."

**`generatePrintDesign()` →** Falls back to old error: "Image generation not yet implemented."

## Quality Gates

### Phyllis Validation

- **Shirts:** Reject < 150 DPI, warn < 300 DPI
- **Posters:** Reject < 300 DPI
- **Collectibles:** Reject < 300 DPI

### Prep Method

**MVP:** `rembg + Pillow Lanczos`
- Basic background removal
- Lanczos resampling for upscaling
- Mild sharpening

**Future:** `rembg + Real-ESRGAN`
- AI super-resolution
- Better edge preservation
- Higher quality upscaling

Warnings are returned in prep result and passed through to user.

## Testing

### Test 1: Generate New Product

```
User: "Make me a punk zombie unicorn shirt"
BotButt: Calls generate_print_ready_product
Result: Product created, ready for orders
```

### Test 2: On-Demand Product Creation

```
Customer: Clicks "Buy Now" on web image
BotButt: Calls ensure_product_exists
Result: Product created in real-time, checkout proceeds
```

### Test 3: Idempotency

```
Customer 1: Buys "Zombie Unicorn" → product created
Customer 2: Buys "Zombie Unicorn" → uses existing product
Result: No duplicate products
```

### Test 4: Quality Rejection

```
User: "Make a poster from this 100px image"
Phyllis: Rejects for insufficient DPI
BotButt: Reports error, suggests higher res source
```

### Test 5: Fallback (print-prep not available)

```
User: "Generate a new shirt design"
BotButt: Reports print-prep not available, asks for 300 DPI URL
Result: Graceful degradation
```

## Error Handling

| Error | Response |
|-------|----------|
| Print-prep endpoint 404/500 | "Print-prep service isn't live yet. Use existing 300 DPI design." |
| Quality check failed | "Image quality insufficient: {reasons}" |
| Upscaling warnings | "Product created with MVP upscaling. Consider higher res source for best quality." |
| Product creation failed | "Phyllis product creation failed: {error}" |
| Duplicate product | "Product already exists (ID: {id}). Ready for checkout!" |

## Deployment Checklist

### BotButt Side (Complete ✅)

- [x] `prepareImageForPrint()` implemented
- [x] `findExistingProduct()` implemented
- [x] `ensurePhyllisProduct()` implemented
- [x] `generatePrintDesign()` updated
- [x] `generate_print_ready_product` tool added
- [x] `ensure_product_exists` tool added
- [x] Tool execution handlers added
- [x] System prompt documentation updated
- [x] Fallback behavior for missing endpoint

### Phyllis Side (Pending Replit)

- [ ] `POST /api/print-prep/process` endpoint
- [ ] `rembg` background removal
- [ ] Image upscaling (Pillow Lanczos MVP)
- [ ] 300 DPI metadata stamping
- [ ] Quality validation
- [ ] S3 upload for print-ready files
- [ ] Deterministic/cached output

### Integration Testing (After Phyllis Deploy)

- [ ] End-to-end: prompt → product creation
- [ ] On-demand: checkout → product creation
- [ ] Idempotency: same design → same product
- [ ] Quality gate: reject insufficient DPI
- [ ] Fallback: graceful degradation

## Usage Patterns

### Pattern 1: Creative Session

```
User: "Make me 5 punk rock animal shirts"
BotButt: 
  - Generates each design
  - Preps for print
  - Creates 5 products
  - All live and orderable
```

### Pattern 2: Browse & Buy

```
Customer: Browses art on discountpunk.com
          Clicks "Buy Now" on a design
BotButt: 
  - Checks if product exists
  - Creates if needed
  - Proceeds to Stripe checkout
```

### Pattern 3: Manual Prep

```
User: Uploads 300 DPI design to input folder
BotButt: 
  - Uploads to S3
  - Uses create_product_with_phyllis (no prep needed)
  - Product live
```

## Known Limitations

1. **Upscaling quality:** MVP uses Lanczos (not AI super-resolution)
2. **Source resolution:** Starting from 1024×1024, upscaling to 3600×4500 (3.5x)
3. **Background removal:** Basic rembg (may not handle complex scenes)
4. **No style control:** Limited to GPT Image 2 capabilities
5. **Single color:** Black shirts only (for now)

## Future Enhancements

1. **Real-ESRGAN upscaling** for better quality
2. **Higher res generation** (GPT Image 2 HD: 2048×2048)
3. **Multi-color support** (white, gray, etc.)
4. **Custom placement** (front, back, full-wrap)
5. **Quality preview** before creating product
6. **Batch processing** for multiple designs
7. **Source art storage** (keep originals for reprints)

## Cost Model

**Phyllis:** First 10 orders/month free, then $1.50/order
**Printful:** ~$15-20 per shirt (production + shipping)
**Stripe:** 2.9% + $0.30 per transaction
**Image Gen:** Included in Azure OpenAI subscription

**Example:** $29.99 shirt
- Customer pays: $29.99
- Stripe fee: ~$1.17
- Phyllis fee: $1.50 (after 10 free)
- Printful cost: ~$18
- Margin: ~$9.32

## Support & Troubleshooting

**Q: Print-prep is failing with "endpoint not found"**
A: Phyllis endpoint not deployed yet. Use create_product_with_phyllis with existing 300 DPI designs.

**Q: Quality warnings about "MVP resize"**
A: Using basic Lanczos upscaling. For better quality, start with higher res source or wait for Real-ESRGAN.

**Q: Products have white edges/backgrounds**
A: Background removal may not be perfect. Check source image or manually prep design.

**Q: Duplicate products being created**
A: Should use findExistingProduct() first. Check Phyllis catalog API response.

**Q: Checkout failing after product creation**
A: Verify product has `printful_product_id` and is active in Phyllis.

---

**Status:** Ready for Phyllis deployment. BotButt side is complete and will work as soon as Replit implements `/api/print-prep/process`.
