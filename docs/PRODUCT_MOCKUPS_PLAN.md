# Product Mockup Images - Upload Plan

**Source:** `/Users/karenkilroy/zorro_kilroy/ssbb/input/Eat_My_Ass_t_black-69f579dccb5c6.png/`  
**Total Images:** 170 product mockups  
**Product:** Eat My Donkey T-Shirt

---

## What We Have

**10 Colors:**
- Black
- Charcoal
- Dark Heather Gray
- Heather Tan
- Midnight Navy
- Military Green
- Red
- Royal (Blue)
- Sand
- White

**7 Views per color:**
- Front
- Back
- Left
- Right
- Left Front (3/4 view)
- Right Front (3/4 view)
- (Some duplicates - 5+ versions per angle)

---

## Purpose

These are **product mockups for the shop** - show customers what the shirt looks like in different colors and angles.

**NOT for Printful** - Printful generates their own mockups. These are for discountpunk.com product pages.

---

## Upload Strategy

### Option 1: Upload All (Recommended for MVP)
**Upload to:** `s3://ssbb-media-prod/discountpunk/product-mockups/eat-my-donkey/`

**Structure:**
```
discountpunk/product-mockups/eat-my-donkey/
├── black/
│   ├── front.png
│   ├── back.png
│   ├── left.png
│   ├── right.png
│   ├── left-front.png
│   └── right-front.png
├── charcoal/
│   └── ...
├── dark-heather-gray/
│   └── ...
... (etc for all 10 colors)
```

**Benefits:**
- Customers can see all color options
- Multiple angles build trust
- Professional product pages
- BotButt can add more colors later

---

### Option 2: Upload Black Only (Quick MVP)
Just upload Black color mockups since that's what we're selling tomorrow.

**Upload to:** `s3://ssbb-media-prod/discountpunk/images/eat-my-donkey-mockups/`

---

### Option 3: Defer to Phase 2
Use the 300 DPI design image for now, add mockups after first order ships.

---

## Recommendation: Option 1 (Upload All)

**Why:**
1. **Takes 5 minutes** with a script
2. **Future-proof** - When BotButt adds more colors, mockups are ready
3. **Professional** - Customers expect to see product from multiple angles
4. **SEO** - More images = better product page

**When to use:**
- Product detail pages
- Shop grid (use front view as thumbnail)
- Color selector (show color options)

---

## Implementation Plan

### Step 1: Organize Images (5 min)

```bash
# Create organized structure
mkdir -p /tmp/eat-my-donkey-mockups/{black,charcoal,dark-heather-gray,heather-tan,midnight-navy,military-green,red,royal,sand,white}

# Pick one representative image per view per color
# (avoiding duplicates)
```

### Step 2: Upload to S3 (2 min)

```bash
aws s3 sync /tmp/eat-my-donkey-mockups/ \
  s3://ssbb-media-prod/discountpunk/product-mockups/eat-my-donkey/ \
  --content-type image/png \
  --metadata-directive REPLACE
```

### Step 3: Update Product Page (Tomorrow)

**File:** `discountpunk.com/products/eat-my-ass-tee.html`

Add image gallery:
```html
<div class="product-images">
  <div class="main-image">
    <img id="main-img" src="https://ssbb-media-prod.s3.amazonaws.com/discountpunk/product-mockups/eat-my-donkey/black/front.png">
  </div>
  
  <div class="thumbnails">
    <img onclick="changeView('front')" src=".../front.png">
    <img onclick="changeView('back')" src=".../back.png">
    <img onclick="changeView('left')" src=".../left.png">
    <img onclick="changeView('right')" src=".../right.png">
  </div>
  
  <div class="color-selector">
    <button onclick="changeColor('black')">Black</button>
    <button onclick="changeColor('charcoal')">Charcoal</button>
    <!-- etc -->
  </div>
</div>
```

---

## What to Do Now vs Tomorrow

### TONIGHT (Optional - 5 min):
- [ ] Run upload script to S3
- [ ] Makes product page richer tomorrow
- [ ] Not blocking for MVP

### TOMORROW (Sprint):
- [ ] Use front-black.png as shop thumbnail
- [ ] Add image gallery to product page (if time)
- [ ] Connect color selector to mockups

### PHASE 2 (After MVP):
- [ ] BotButt adds color variants to shop
- [ ] Image gallery with view switcher
- [ ] Zoom functionality
- [ ] Mobile swipe gallery

---

## Quick Upload Script

Want me to run this now?

```bash
#!/bin/bash
# Upload all product mockups to S3

SOURCE="/Users/karenkilroy/zorro_kilroy/ssbb/input/Eat_My_Ass_t_black-69f579dccb5c6.png"
DEST="s3://ssbb-media-prod/discountpunk/product-mockups/eat-my-donkey"

# Upload all images maintaining structure
aws s3 sync "$SOURCE" "$DEST" \
  --exclude "*" \
  --include "*.png" \
  --content-type image/png

echo "✅ Uploaded $(ls -1 \"$SOURCE\"/*.png | wc -l) mockup images"
echo "📍 Location: $DEST"
```

---

## File Naming Convention

Current names are ugly: `unisex-cvc-t-shirt-black-front-69f579dcca748.png`

Should we rename to clean format?
- `black-front.png`
- `black-back.png`
- `charcoal-front.png`
- etc.

**Recommendation:** Yes, clean names for easier frontend use.

---

## Summary

**What:** 170 product mockup images (10 colors × 7 views)  
**Where:** Upload to S3 `discountpunk/product-mockups/eat-my-donkey/`  
**When:** Tonight (5 min) or defer to Phase 2  
**Why:** Professional product pages, color selection UI  

**Decision needed:** Upload now or defer?

If upload now, I can run the script and have them ready for tomorrow's shop pages!

🔥
