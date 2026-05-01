# Replit 24-Hour Sprint: Handoff Document
**Date:** May 1, 2026  
**Project:** Discount Punk MVP - The Money Loop

## What You're Building

Build the basic e-commerce checkout flow for Discount Punk so customers can purchase the **Eat My Ass Tee** ($29.99).

**Success = One real product → one checkout → one paid order → one fulfilled shipment.**

---

## KAREN'S PRE-SPRINT TASKS (TODAY - May 1)

These must be completed BEFORE the Replit sprint begins on May 2:

### 1. ✅ COMPLETED: Google Search Console & Sitemap
- [x] Add discountpunk.com as a property
- [x] Add DNS TXT verification record
- [x] Submit sitemap: `https://discountpunk.com/sitemap.xml`
- [x] Verify sitemap is accepted
- **Note:** Using Google Search Console instead of GA

### 2. Set Up Stripe Account
- [ ] Create Stripe account (if not already created)
- [ ] Get test API keys:
  - Publishable key: `pk_test_...`
  - Secret key: `sk_test_...`
- [ ] Set up webhook endpoint URL (wait for Replit to deploy first)
- [ ] Get webhook secret: `whsec_...`
- [ ] Enable Stripe Tax or explicitly defer

### 3. Set Up Printful Account
- [ ] Create Printful account at [printful.com](https://www.printful.com)
- [ ] Generate API key from Settings → API
- [ ] Browse product catalog (Bella+Canvas 3001 recommended for tees)
- [ ] Note: We'll upload "Eat My Ass Tee" design during sprint

### 4. Prepare Environment Variables
Create a file to give to Replit team with these filled in:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE

# Printful
PRINTFUL_API_KEY=YOUR_KEY_HERE

# Email (for order confirmations - optional for MVP)
# SENDGRID_API_KEY=YOUR_KEY_HERE
# FROM_EMAIL=orders@discountpunk.com
```

### 5. Review & Approve Plan
- [ ] Read full Replit expansion plan: `docs/replit_expansion.md`
- [ ] Review handoff document: `docs/replit_handoff.md`
- [ ] Confirm with BotButt that everything looks good
- [ ] Brief Replit team on brand voice and priorities

**Status:** ⏳ Pending - Assigned to Karen for TODAY (May 1, 2026)

---

## The Hero Product (Already Ready)

**Eat My Ass Tee** - $29.99
- **Design:** "EAT MY" text with illustrated donkey in punk green circle
- **Image:** `s3://ssbb-media-prod/discountpunk/images/1777621889057-eat-my-[donkey]-tee.png`
- **Status:** ✅ Product listing created, design finalized
- **Product Page:** `https://discountpunk.com/products/eat-my-ass-tee.html`

---

## What Already Exists

### Backend (Node.js/TypeScript)
- **Repo:** `/Users/karenkilroy/zorro_kilroy/ssbb`
- **Server:** `apps/server/` (Express + AWS SDK)
- **Discount Punk API Routes:** `apps/server/src/routes/discountpunk.ts`
- **S3 Integration:** Working - products stored in `s3://ssbb-media-prod/discountpunk/`
- **Content API:** `GET /api/discountpunk/content` returns product listings

### Frontend (Static HTML/JS)
- **Site Repo:** `/Users/karenkilroy/zorro_kilroy/discountpunk.com`
- **Hosting:** Azure Static Web Apps
- **Current Pages:**
  - `index.html` - Landing page
  - `shop.html` - Product grid (loads from API)
  - `products/*.html` - Individual product pages
- **Styling:** Punk aesthetic with CSS variables (neon colors, dark backgrounds)

### BotButt's Tools (AI Agent)
- **add_product** - Creates product listings
- **delete_product** - Removes products
- **create_comic** - Creates comic pages
- **Need to add:** Stocky Butt's order management tools

---

## What You Need to Build

### 1. Stripe Integration (Backend)

**Environment Variables Needed:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**New API Endpoints:**

```typescript
// apps/server/src/routes/discountpunk.ts

POST /api/discountpunk/checkout/create-session
Body: {
  items: [
    {
      productTitle: string,
      price: number,
      size: string,  // "S" | "M" | "L" | "XL" | "2XL" | "3XL"
      quantity: number
    }
  ]
}
Response: {
  sessionId: string,
  url: string  // Stripe Checkout URL
}

POST /api/discountpunk/webhooks/stripe
Headers: stripe-signature
Body: Stripe webhook payload
Actions:
  - payment_intent.succeeded → Create order in S3
  - Save to: s3://ssbb-media-prod/discountpunk/orders/{orderId}.json
```

**Stripe Checkout Configuration:**
- Use **Stripe Checkout** (hosted, not custom form)
- Test mode initially
- Success URL: `https://discountpunk.com/checkout/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `https://discountpunk.com/shop.html`
- Enable **Stripe Tax** or explicitly defer (don't leave vague)
- Collect shipping address

### 2. Order Schema

```typescript
// Order stored in S3: discountpunk/orders/{orderId}.json
{
  id: string,  // uuid
  customerEmail: string,
  items: [
    {
      productTitle: string,
      productType: "tshirt",
      imageUrl: string,
      size: string,
      quantity: number,
      price: number
    }
  ],
  shippingAddress: {
    name: string,
    line1: string,
    line2?: string,
    city: string,
    state: string,
    postal_code: string,
    country: string
  },
  total: number,
  status: "pending" | "paid" | "printing" | "shipped" | "delivered" | "cancelled",
  stripeSessionId: string,
  printfulOrderId?: string,  // Future
  createdAt: string,  // ISO timestamp
  updatedAt: string
}
```

### 3. Shopping Cart (Frontend)

**Add to:** `discountpunk.com/shop.html`

```javascript
// Cart stored in localStorage
interface CartItem {
  productTitle: string,
  imageUrl: string,
  price: number,
  size: string,
  quantity: number
}

// UI Elements Needed:
- Floating cart icon (top right) with item count badge
- Cart drawer/modal that slides in
- Size selector on product cards
- "Add to Cart" button on each product
- Cart contents list with quantity adjust
- "Checkout" button → calls create-session → redirects to Stripe
```

### 4. New Pages (Frontend)

**checkout/success.html**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Order Confirmed - Discount Punk</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header><!-- Same as other pages --></header>
  <main class="container">
    <h2 style="color: var(--neon-green);">✓ Order Confirmed!</h2>
    <p>Thank you for your order! You'll receive an email confirmation shortly.</p>
    <p>Order ID: <span id="order-id"></span></p>
    <a href="/shop.html" class="btn-primary">Continue Shopping</a>
  </main>
  <script>
    // Extract session_id from URL, fetch order details, display
  </script>
</body>
</html>
```

### 6. Brand Voice Requirements

**CRITICAL: Payment Copy**

On checkout/cart pages, use: **"We ASS-cept:"** (not "We accept")

Example footer text:
```html
<div class="payment-methods">
  <p>We ASS-cept:</p>
  <ul>
    <li>💳 All major credit cards (Visa, Mastercard, Amex, Discover)</li>
    <li>🍎 Apple Pay</li>
    <li>📱 Google Pay</li>
    <li>🔗 Link by Stripe</li>
  </ul>
</div>
```

This should appear on:
- Bottom of shop.html (near checkout button)
- In cart drawer/modal
- On success page

### 5. Stocky Butt's Tools (Backend)

**New AI Agent Tools for Stocky Butt:**

```typescript
// apps/server/src/services/provider.ts

get_orders({ status?: string, limit?: number })
  → Returns list of orders from S3
  → Filters by status if provided
  → Sorted by createdAt desc

get_order_details({ orderId: string })
  → Returns full order JSON from S3
  → Includes customer info, items, tracking

update_order_status({ orderId: string, status: string, notes?: string })
  → Updates order status
  → Appends to order.statusHistory[]
  → Writes back to S3

verify_image_quality({ imageKey: string, productType: string })
  → Checks image DPI and dimensions
  → Rules:
    - Posters: REQUIRE 300 DPI (block if lower)
    - Shirts: WARN below 150 DPI, prefer 300
    - Limited editions: REQUIRE 300 DPI
  → Returns: { valid: boolean, dpi: number, dimensions: string, warning?: string }
```

**Stocky Butt System Prompt:**
```
You are Stocky Butt, BotButt's operations sister for Discount Punk e-commerce.

Your job:
- Monitor orders via get_orders()
- Answer customer questions via get_order_details()
- Update order statuses as they progress
- Verify image quality before products go live (300 DPI gate)
- Report sales metrics to BotButt

You work UNDER BotButt's creative direction. She makes the art, you handle logistics.

Chain of command: You → BotButt → Karen

Be helpful but maintain punk brand voice. When reporting to BotButt, be concise and data-driven.
```

---

## DPI Verification Gate

**CRITICAL REQUIREMENT from BotButt:**

"Nothing kills a merch brand faster than a customer receiving a blurry shirt."

**Implementation:**

```typescript
import sharp from 'sharp';

async function verifyImageQuality(s3Key: string, productType: 'poster' | 'shirt' | 'limited') {
  // Download image from S3
  const buffer = await readBuffer(BUCKET, s3Key);
  
  // Get metadata
  const metadata = await sharp(buffer).metadata();
  const dpi = metadata.density || 72;
  const dimensions = `${metadata.width}x${metadata.height}`;
  
  // Apply rules
  if (productType === 'poster' || productType === 'limited') {
    if (dpi < 300) {
      return {
        valid: false,
        dpi,
        dimensions,
        warning: 'Posters require 300 DPI minimum. This image is too low quality.'
      };
    }
  }
  
  if (productType === 'shirt') {
    if (dpi < 150) {
      return {
        valid: false,
        dpi,
        dimensions,
        warning: 'Image quality too low for printing. Minimum 150 DPI.'
      };
    }
    if (dpi < 300) {
      return {
        valid: true,
        dpi,
        dimensions,
        warning: 'Image acceptable but below ideal 300 DPI. May print slightly soft.'
      };
    }
  }
  
  return { valid: true, dpi, dimensions };
}
```

---

## Out of Scope for This Sprint

**DO NOT BUILD YET:**

- ❌ Printful API integration (manual fulfillment for MVP)
- ❌ NFT certificates
- ❌ Membership subscriptions
- ❌ Loud Butt social media automation
- ❌ Discord role sync
- ❌ Order tracking by email (public page)
- ❌ Resale marketplace
- ❌ Custom commissions
- ❌ Full admin dashboard

These come AFTER the MVP proves the money loop works.

---

## Success Criteria

At the end of 24 hours, we should be able to:

1. ✅ Visit discountpunk.com/shop.html
2. ✅ See "Eat My Ass Tee" with Design 2 image
3. ✅ Select size (S-3XL)
4. ✅ Add to cart
5. ✅ Click checkout
6. ✅ Redirect to Stripe Checkout
7. ✅ Enter test card: `4242 4242 4242 4242`
8. ✅ Complete payment
9. ✅ Redirect to success page
10. ✅ Order JSON appears in S3
11. ✅ Stocky Butt can call `get_orders()` and see the order
12. ✅ Webhook received and processed

**Then we manually create Printful order and ship sample to Karen.**

---

## Key Files to Modify

### Backend
- `apps/server/src/routes/discountpunk.ts` - Add checkout + webhook routes
- `apps/server/src/services/provider.ts` - Add Stocky Butt's tools
- `apps/server/package.json` - Add `stripe` dependency

### Frontend
- `discountpunk.com/shop.html` - Add cart UI
- `discountpunk.com/checkout/success.html` - New file
- `discountpunk.com/main.js` - Add cart logic

### Env
- `apps/server/.env` - Add Stripe keys

---

## Testing Checklist

**Before going live:**

- [ ] Test with Stripe test card `4242 4242 4242 4242`
- [ ] Verify webhook receives events (use Stripe CLI: `stripe listen --forward-to localhost:4000/api/discountpunk/webhooks/stripe`)
- [ ] Check order JSON saved to S3 correctly
- [ ] Verify Stocky Butt can read orders
- [ ] Test cart persistence across page reloads
- [ ] Mobile responsive (cart drawer)
- [ ] Error handling (payment failed, webhook failed)
- [ ] DPI gate blocks low-res images

---

## Printful Integration (Post-MVP)

**For reference only - don't build yet:**

Once MVP works, we'll add:
- Printful API key
- Product sync (upload "Eat My Ass Tee" design to Printful)
- Automatic order creation on `payment_intent.succeeded`
- Webhook from Printful for tracking updates

---

## Questions?

**Contact:**
- Karen (project owner)
- Review full plan: `/Users/karenkilroy/zorro_kilroy/ssbb/docs/replit_expansion.md`
- BotButt feedback included in plan

**Architecture Reviews:**
- Gemini's review: `docs/geminis_comments.md`
- Justin (ChatGPT 5.5) scoped it to MVP

---

## After MVP Success

Once the first order is fulfilled and quality is verified:

**Phase 2:** Build Loud Butt (social media automation)
**Phase 3:** Add membership tiers
**Phase 4:** Pretendo.tv platform
**Phase 5:** Collectibles + NFTs
**Phase 6:** Doll manufacturing research

But first: **One product. One checkout. One paid order. One fulfilled shipment.**

---

## Sprint Timeline

**May 1 (TODAY):** Karen completes pre-sprint tasks (GA, Stripe, Printful) ✅  
**May 2, 7:00 AM (SPRINT START):** Replit team builds for 24 hours 🔥  
**May 3, 7:00 AM (SPRINT END):** Deploy, test, first order 📦  
**May 3+:** Iterate, improve, add Loud Butt 📣

---

## Deployment Plan

### What Replit Will Build

The Replit sprint creates **backend API updates only** - no new frontend deployment needed.

**Backend Changes:**
- New Stripe checkout endpoints (`/api/discountpunk/checkout/*`)
- Stripe webhook handler (`/api/discountpunk/webhooks/stripe`)
- Stocky Butt's order management tools (added to `provider.ts`)
- Order storage in S3 (`discountpunk/orders/*.json`)
- DPI verification function

**Frontend (Already Done):**
- ✅ Shop page with buy buttons and size selectors
- ✅ "We ASS-cept" payment info
- ✅ Product grid loading from API
- ✅ Google Analytics on all pages
- ✅ Sitemap submitted

### Deployment Strategy

**Backend Deployment: Azure Web App (Free Tier)**

**Current Setup:**
- Frontend: Azure Static Web Apps (already deployed)
- Backend API: Running on AWS ECS (ssbb.pretendo.tv)

**Sprint Deployment Options:**

#### Option A: Deploy to Existing AWS ECS (Recommended)
- **Why:** Backend already running there, just push updated Docker image
- **How:**
  1. Replit builds code locally
  2. Build new Docker image: `docker build -t ssbb-server:stripe .`
  3. Push to ECR: `aws ecr get-login-password | docker login...`
  4. Update ECS task definition with new image
  5. Force new deployment: `aws ecs update-service --force-new-deployment`
  6. Verify at `https://ssbb.pretendo.tv/api/health`

**Environment Variables Needed in ECS:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
PRINTFUL_API_KEY=...
```

#### Option B: Deploy to Azure App Service Free Tier
- **Why:** Keep everything in Azure ecosystem
- **Limitation:** Free tier has limited compute (60 CPU minutes/day)
- **Better for:** Testing only, not production

**Recommended:** Stick with AWS ECS for backend since it's already set up and working.

### Deployment Checklist

**After Sprint Code Complete:**
- [ ] Run `npm run build` to compile TypeScript
- [ ] Run `npm test` (if tests exist)
- [ ] Build Docker image with new Stripe code
- [ ] Push to AWS ECR
- [ ] Update ECS task environment variables with Stripe keys
- [ ] Force ECS deployment
- [ ] Test webhook with `stripe listen --forward-to https://ssbb.pretendo.tv/api/discountpunk/webhooks/stripe`
- [ ] Verify `/api/discountpunk/checkout/create-session` endpoint works
- [ ] Test end-to-end: cart → checkout → Stripe → webhook → order in S3

### Stripe Webhook Configuration

**After Backend Deployed:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://ssbb.pretendo.tv/api/discountpunk/webhooks/stripe`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `checkout.session.completed`
4. Copy webhook signing secret (`whsec_...`)
5. Add to ECS environment variables
6. Redeploy ECS

### Testing Post-Deployment

**Quick Smoke Test:**
```bash
# 1. Health check
curl https://ssbb.pretendo.tv/api/health

# 2. Products still load
curl https://ssbb.pretendo.tv/api/discountpunk/content | jq '.featured[0].title'

# 3. Checkout endpoint exists (will 400 without body, that's fine)
curl -X POST https://ssbb.pretendo.tv/api/discountpunk/checkout/create-session

# 4. Stocky Butt can get orders (via chat)
# Test BotButt's sister in SSBB app
```

**Full Integration Test:**
1. Visit https://discountpunk.com/shop.html
2. Click "Eat My Ass Tee"
3. Select size "M"
4. Click "BUY NOW"
5. Should redirect to Stripe Checkout
6. Enter test card: `4242 4242 4242 4242`
7. Complete checkout
8. Should redirect to success page
9. Check S3 for order JSON
10. Ask Stocky Butt to `get_orders()` - should see it

### Rollback Plan

If deployment breaks:
1. Revert ECS to previous task definition revision
2. Remove Stripe env vars if causing issues
3. Backend falls back to working state (product API still works)
4. Frontend continues showing products (buy buttons just alert)

Let's make it real. 🔥
