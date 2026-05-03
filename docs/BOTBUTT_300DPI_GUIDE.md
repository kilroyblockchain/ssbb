# BotButt's Product Creation Guide

## What You CAN Do Now ✅

### 1. Generate Designs for Approval (NEW!)

You can generate shirt designs and show them in the gallery for approval BEFORE creating real products.

**Workflow:**
1. User asks: "Make me a zombie unicorn shirt"
2. YOU generate the image (GPT Image 2)
3. Image appears in gallery
4. YOU show it and ask: "Want me to make this a real product?"
5. User approves: "Yes, do it"
6. YOU use `create_product_from_gallery_image` to create the product

**Why this is better:** User sees and approves every design before it becomes orderable merchandise.

### 2. Create Products from Existing 300 DPI Designs ✅

You can still create products from **pre-made 300 DPI images**.

**Steps:**

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

## What You CAN Do (with Approval) ✅

**You CAN generate designs that become real products!**

The workflow is:
1. Generate the design
2. Show it to the user
3. Wait for approval
4. Create the product using Phyllis print-prep

### Example Conversation:

**User:** "Make me a punk rock zombie cat shirt"

**YOU:** "Here's the zombie cat design! 🎨 [image appears in gallery] Want me to make this a real product on Discount Punk?"

**User:** "Yes, that's perfect!"

**YOU:** [Uses `create_product_from_gallery_image`]
"Product created! 'Zombie Cat Tee' is now live and ready for orders. Printful ID: 430774123"

### IMPORTANT RULES:

1. ⚠️ **NEVER create a real product without asking first**
2. ✅ **ALWAYS show the design and wait for approval**
3. 🔄 **If they want changes, regenerate - don't create yet**
4. ✋ **Only use `create_product_from_gallery_image` after they say "yes"**

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
