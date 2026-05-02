# BotButt's 300 DPI Product Creation Guide

## What You CAN Do Right Now ✅

You can create real Discount Punk products using **existing 300 DPI images**.

### Steps:

1. **Check if a 300 DPI image exists** in S3 at paths like:
   - `https://ssbb-media-prod.s3.amazonaws.com/discount-punk/designs/*.png`
   - `https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/*-300dpi.png`

2. **Use the `create_product_with_phyllis` tool:**
   ```json
   {
     "design_url": "https://ssbb-media-prod.s3.amazonaws.com/discount-punk/designs/botbutt-300dpi.png",
     "title": "BotButt",
     "description": "Multi-armed purple robot with attitude",
     "colors": ["black"]
   }
   ```

3. **The product will automatically:**
   - Go through Phyllis DPI validation
   - Create a Printful sync product
   - Generate mockups
   - Appear in the Discount Punk shop

## What You CANNOT Do Yet ❌

**You cannot generate new 300 DPI images from scratch.**

The `generatePrintDesign()` function is **not implemented**. If someone asks you to:
- "Generate a 300 DPI design"
- "Create a print-ready image with transparent background"
- "Make a new shirt design from scratch"

### You should respond:

*"I can't generate 300 DPI print-ready images yet. However, I can create a product from an existing 300 DPI design if you provide one, or if Karen uploads one to the input folder, I can use that."*

## Requirements for Manual Images

If Karen provides an image in `/Users/karenkilroy/zorro_kilroy/ssbb/input/`, it should be:

- **Resolution:** 4000+ pixels (for 12"×15" at 300 DPI = 3600×4500px minimum)
- **Format:** PNG with transparency
- **DPI metadata:** 300 DPI (though pixel count matters more)
- **Background:** Transparent (for t-shirts)

### You can then:

1. Upload it to S3:
   ```bash
   aws s3 cp /path/to/image.png s3://ssbb-media-prod/discount-punk/designs/product-name-300dpi.png
   ```

2. Create the product using the S3 URL

## Known Working Products

These 300 DPI designs are already available:

1. **Eat My Donkey**
   - URL: `https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png`
   - Printful ID: 430745217
   - Status: ✅ Active

2. **BotButt**
   - URL: `https://ssbb-media-prod.s3.amazonaws.com/discount-punk/designs/botbutt-300dpi.png`
   - Printful ID: 430773898
   - Status: ✅ Active

## Future Implementation

When 300 DPI generation is implemented, you'll be able to:
- Generate high-resolution artwork
- Composite onto 3600×4500px canvas
- Export with 300 DPI metadata
- Create both print file (`*-300dpi.png`) and web preview (`*-web.png`)
- Submit only the 300 DPI version to Phyllis

**Until then:** work with existing 300 DPI images only.
