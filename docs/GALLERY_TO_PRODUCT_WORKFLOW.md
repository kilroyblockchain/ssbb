# Gallery-to-Product Workflow

**Date:** May 2, 2026  
**Status:** ✅ Implemented

## Overview

BotButt now has a two-step approval workflow for creating real products from generated designs:

1. **Generate & Show** - Create the design, show it in the gallery
2. **User Approves** - Wait for explicit approval
3. **Create Product** - Prep for print and create real product

This ensures you see and approve every design before it becomes orderable merchandise.

## The Workflow

### Step 1: Generate Design

**User:** "Make me a zombie unicorn shirt design"

**BotButt:** 
- Generates 1024×1024 image (GPT Image 2)
- Image appears in gallery
- Shows it to you: "Here's the design! [image preview] Want me to make this a real product?"

### Step 2: Review & Approve

**You:**
- Review the design in the gallery
- Decide if you like it
- Options:
  - ✅ "Yes, make it a real product"
  - ❌ "No, try again with [different prompt]"
  - 🔄 "Regenerate with [tweaks]"

### Step 3: Create Product (only after approval)

**BotButt (after you say yes):**
- Calls `create_product_from_gallery_image`
- Sends to Phyllis print-prep:
  - Removes background
  - Upscales to 3600×4500
  - Stamps 300 DPI metadata
- Creates Printful product
- Product goes live on discountpunk.com

## Example Conversation

```
User: "Make me a punk rock zombie cat shirt design"

BotButt: "Here's the zombie cat design! 🎨"
         [Shows generated image in gallery]
         "Want me to make this a real product on Discount Punk?"

User: "Yes, that's perfect!"

BotButt: [Calls create_product_from_gallery_image]
         "Product created! 'Zombie Cat Tee' is now live and ready for orders.
         Printful ID: 430774123"
```

## BotButt Tools

### `create_product_from_gallery_image`

**When to use:** User has approved a design from the gallery

**Parameters:**
```typescript
{
  image_url: string;        // S3 URL from gallery
  title: string;            // Product title
  description: string;      // Product description
  product_type?: string;    // "shirt", "poster", "letter"
}
```

**Example:**
```javascript
{
  "image_url": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/generated/zombie-cat-preview.png",
  "title": "Zombie Cat Tee",
  "description": "Punk rock zombie cat design",
  "product_type": "shirt"
}
```

## Important Rules for BotButt

1. **NEVER create a real product without user approval first**
2. **ALWAYS show the design in the gallery before asking**
3. **WAIT for explicit approval** ("yes", "make it", "do it", etc.)
4. **If user wants changes**, regenerate - don't create the product yet
5. **Only use `create_product_from_gallery_image` after approval**

## Finding Gallery Images

When user approves a design, you need its S3 URL. Options:

1. **Just generated it** - You have the URL from the generation call
2. **From gallery list** - Check the gallery index for the image name
3. **User references it** - "Make that zombie cat one a product"

Gallery images are usually at:
```
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/generated/[filename].png
```

## Quality Gates

After user approves and you call `create_product_from_gallery_image`:

1. **Phyllis print-prep** runs the image through:
   - Background removal
   - Upscaling to 3600×4500
   - Quality validation

2. **If quality check fails:**
   - Returns error to you
   - You tell user: "The design quality isn't sufficient for print. Let me regenerate at higher quality."

3. **If quality passes:**
   - Product created
   - Goes live
   - You confirm to user

## Error Handling

**Scenario:** User approves but print-prep fails

```
User: "Yes, make it a product"

BotButt: [Tries to create product]
         [Print-prep returns: quality insufficient]
         
         "The design quality isn't quite good enough for print-on-demand.
         Let me regenerate at higher resolution and we can try again."
```

**Scenario:** User wants to make a product from an old gallery image

```
User: "Make that zombie unicorn design from yesterday a real product"

BotButt: [Finds image in gallery]
         [Shows it]
         "This one? [image] I can make it a real product if you confirm."

User: "Yes"

BotButt: [Creates product from gallery URL]
```

## Comparison to Old Flow

### Old (Auto-Create)
```
User: "Make me a zombie cat shirt"
  ↓
Generate image
  ↓
Create product (no approval!)
  ↓
Product is live
```

### New (Gallery Approval)
```
User: "Make me a zombie cat shirt"
  ↓
Generate image → Show in gallery
  ↓
Wait for approval
  ↓
User: "Yes, make it"
  ↓
Create product
  ↓
Product is live
```

## Benefits

1. **Quality control** - You see every design before it's orderable
2. **No wasted products** - Only create what you approve
3. **Iteration** - Can refine designs before committing
4. **Gallery history** - All attempts saved for reference
5. **Explicit consent** - Never surprised by what goes live

## Technical Implementation

### Functions in phyllis.ts

**`createProductFromPreview()`** - Main function
```typescript
{
  preview_url: string;
  title: string;
  description: string;
  product_type?: 'shirt' | 'poster' | 'letter';
  colors?: string[];
}
```

Internally calls:
1. `ensurePhyllisProduct()` - Checks for existing product
2. `prepareImageForPrint()` - Calls Phyllis print-prep
3. `createProductWithPhyllis()` - Creates Printful product

### Flow Diagram

```
Gallery Image (approved)
        ↓
createProductFromPreview()
        ↓
    Is it already a product? ────Yes───→ Return existing
        │ No
        ↓
prepareImageForPrint()
        ↓
POST /api/print-prep/process
  - Remove background
  - Upscale to 3600×4500
  - Validate quality
        ↓
    Quality pass? ────No───→ Return error
        │ Yes
        ↓
Upload to S3 (print-ready)
        ↓
createProductWithPhyllis()
        ↓
POST /api/products/create
  - Create Printful product
  - Generate mockups
        ↓
Product live on discountpunk.com
```

## Testing

### Test 1: Happy Path
```
User: "Make me a zombie cat design"
BotButt: [Shows design]
User: "Perfect, make it a product"
BotButt: [Creates product successfully]
Result: ✅ Product live
```

### Test 2: Rejection
```
User: "Make me a zombie cat design"
BotButt: [Shows design]
User: "Nah, too cartoony. Try more punk rock."
BotButt: [Regenerates, doesn't create product]
Result: ✅ No product created, new design shown
```

### Test 3: Iteration
```
User: "Make me a zombie cat"
BotButt: [Shows v1]
User: "Make the eyes bigger"
BotButt: [Shows v2]
User: "Perfect! Make that one"
BotButt: [Creates product from v2]
Result: ✅ Only approved version becomes product
```

### Test 4: Quality Rejection
```
User: "Make me a zombie cat"
BotButt: [Shows design]
User: "Yes, make it a product"
BotButt: [Tries, quality fails]
         "Quality not sufficient, let me regenerate"
Result: ✅ Graceful handling, offers to retry
```

## Integration with Existing Tools

### Still Available

**`create_product_with_phyllis`** - For pre-made 300 DPI designs
```
Use when: You have a manually created 300 DPI design
Example: BotButt image uploaded to input folder
```

**`ensure_product_exists`** - For on-demand checkout
```
Use when: Customer tries to buy, product may not exist
Example: Checkout flow needs product created automatically
```

### New Addition

**`create_product_from_gallery_image`** - For approved designs
```
Use when: User approves a gallery design for product creation
Example: Interactive design approval workflow
```

## Summary

**Key Change:** BotButt now asks for approval before creating products from generated designs.

**Workflow:** Generate → Show → Approve → Create

**Benefit:** Full control over what becomes real merchandise.

**Status:** ✅ Live and ready to use
