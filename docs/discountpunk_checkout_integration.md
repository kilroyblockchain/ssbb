# Discount Punk Checkout Integration

**Status:** ✅ Complete and deployed  
**Date:** May 2, 2026  
**Live Site:** https://red-water-05c15131e-preview.westus2.7.azurestaticapps.net

## What's Working

### 1. Product Catalog (Phyllis Integration)
The shop now fetches **real products** from Phyllis Fills:

```javascript
GET https://phyllis-fills.replit.app/api/products?client_slug=discount-punk
```

**Current Products:**
- ✅ **Eat My Donkey** (Printful ID: 430745217) - $29.99
  - Real mockup images from Printful
  - Active and ready to order

### 2. Stripe Checkout Flow
When customers click "BUY NOW":

1. **Size validation** - Must select size (S, M, L, XL, 2XL, 3XL)
2. **Checkout creation** - Calls Phyllis API:
   ```javascript
   POST https://phyllis-fills.replit.app/api/discountpunk/checkout/create-session
   {
     printful_product_id: 430745217,
     size: "M",
     quantity: 1,
     successUrl: "https://discountpunk.com/success.html",
     cancelUrl: "https://discountpunk.com/shop.html"
   }
   ```
3. **Redirect to Stripe** - Customer completes payment
4. **Webhook fulfillment** - Phyllis receives webhook → sends order to Printful
5. **Success page** - Customer sees confirmation

### 3. Order Confirmation Pages

**Success Page** (`/success.html`):
- Confirms order received
- Explains fulfillment timeline (3-5 days)
- Shows support email: ops@discountpunk.com

**Cancel Page** (`/cancel.html`):
- Reassures customer they weren't charged
- Links back to shop

## Files Changed

### Frontend (discountpunk.com)
- ✅ `shop.html` - Updated with Phyllis product fetch and real checkout
- ✅ `success.html` - NEW order confirmation page
- ✅ `cancel.html` - NEW checkout cancellation page

### Backend (SSBB server)
- ✅ `apps/server/src/routes/discountpunk.ts` - Added proxy endpoints (optional)
- ✅ `package.json` - Added Stripe SDK

## Testing the Order Flow

### 1. Visit the shop
https://red-water-05c15131e-preview.westus2.7.azurestaticapps.net/shop.html

### 2. You should see:
- "Eat My Donkey" product with real mockup
- Size selector (S-3XL)
- "BUY NOW - $29.99" button

### 3. Click BUY NOW:
- Must select size first or you'll get an alert
- Button changes to "Loading checkout..."
- Redirects to Stripe Checkout

### 4. Test checkout:
- Use test card: `4242 4242 4242 4242`
- Any future expiry, any CVC
- Any name/email

### 5. After payment:
- Redirects to `/success.html`
- Order sent to Phyllis → Printful
- Customer gets email confirmation from Stripe

## Phyllis Integration Details

**Production Phyllis Instance:** https://phyllis-fills.replit.app

**Endpoints Used:**
- `GET /api/products?client_slug=discount-punk` - Product catalog
- `POST /api/discountpunk/checkout/create-session` - Create Stripe checkout
- `POST /webhook/stripe` - Stripe webhook (automatic, handled by Phyllis)

**Pricing:**
- First 10 orders/month: FREE
- After that: $1.50 per order
- No upfront costs

## What Happens When Someone Orders

**IMPORTANT:** Orders go through an approval workflow before fulfillment. This is a safety layer to catch issues before production.

1. **Customer clicks BUY NOW** → Selects size → Redirects to Stripe
2. **Customer pays** → Stripe processes payment (customer is charged)
3. **Stripe webhook fires** → Phyllis receives `checkout.session.completed`
4. **Order saved in Phyllis** with status `pending_client_approval`
   - Contains: product, size, customer address, payment details
   - **NOT sent to Printful yet**
5. **Client approval** (you review in Phyllis dashboard)
   - Check order looks correct
   - Approve → status changes to `pending_admin_approval`
6. **Admin approval** (Phyllis team reviews)
   - Final safety check
   - Approve → order sent to Printful
7. **Printful fulfills:**
   - Product: Bella+Canvas 3001 Unisex (the actual shirt)
   - Variant: Determined by size selected
   - Design: "Eat My Donkey" 300 DPI print file
   - Ship to: Customer's address from Stripe checkout
   - Prints, packs, ships with tracking
8. **Customer receives** the actual shirt in 3-5 business days after approval + production

**Why the approval workflow?**
- Catch design issues before printing
- Verify customer addresses are valid
- Prevent fraudulent orders
- Human-in-the-loop safety before spending money on production

## Next Steps

### To Make discountpunk.com the live domain:
1. Go to Azure Portal → Static Web Apps → discountpunk
2. Click "Custom domains" → Add
3. Enter `discountpunk.com`
4. Add the CNAME record to GoDaddy DNS:
   ```
   CNAME: www → red-water-05c15131e.westus2.7.azurestaticapps.net
   ```

### To Add More Products:
Use BotButt in SSBB chat:

```
BotButt, create a real product:
- Design: [S3 URL of 300 DPI image]
- Title: "SSBB Logo Tee"
- Description: "Rep the band"
- Colors: ["black", "white"]
```

BotButt will call `create_product_with_phyllis()` which:
1. Calls Phyllis to create Printful product
2. Gets mockups from Printful
3. Adds to Discount Punk shop automatically

## Architecture

```
Customer Browser
    ↓
Discount Punk (Azure Static Web App)
    ↓ (fetch products)
Phyllis Fills (Replit)
    ↓ (create product, get mockups)
Printful API
    ↓ (when order placed)
Stripe Checkout
    ↓ (webhook after payment)
Phyllis Fills
    ↓ (create order)
Printful Fulfillment
    ↓ (3-5 days)
Customer's Mailbox 📦
```

## Questions?

- **Where are the products stored?** Phyllis database + Printful
- **Where are the mockup images?** S3 bucket (ssbb-media-prod)
- **Who handles payment?** Stripe
- **Who handles shipping?** Printful (ships from their facilities)
- **Where do I see orders?** Phyllis dashboard at https://phyllis-fills.replit.app (when logged in)

## Current Limitations

- No product detail pages yet (just shop grid)
- No order tracking page (customers can email support)
- No abandoned cart recovery
- No product variants beyond size (e.g., color selection)

These can be added later. For now, the core flow works: **Browse → Size → Buy → Get Real Shirt**. 🎉
