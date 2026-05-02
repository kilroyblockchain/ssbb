# Replit 24-Hour Sprint: Handoff Document
**Date:** May 1, 2026  
**Project:** Discount Punk MVP - The Money Loop

## What You're Building

Build the basic e-commerce checkout flow for Discount Punk so customers can purchase the **Eat My Ass Tee** ($29.99).

**Success = One real product → one checkout → one paid order → one fulfilled shipment.**

---

## KAREN'S PRE-SPRINT TASKS ✅ ALL COMPLETED (May 1)

All pre-sprint tasks completed! Ready for Replit team at 7am tomorrow.

### 1. ✅ COMPLETED: Google Search Console & Sitemap
- [x] Add discountpunk.com as a property
- [x] Add DNS TXT verification record
- [x] Submit sitemap: `https://discountpunk.com/sitemap.xml`
- [x] Verify sitemap is accepted
- **Note:** Using Google Search Console instead of GA

### 2. ✅ COMPLETED: Set Up Stripe Account
- [x] Create Stripe account
- [x] Get test API keys:
  - Publishable key: `pk_test_...`
  - Secret key: `sk_test_...`
- [ ] Set up webhook endpoint URL (wait for Replit to deploy first)
- [ ] Get webhook secret: `whsec_...`
- [ ] Enable Stripe Tax or explicitly defer

### 3. ✅ COMPLETED: Set Up Printful Account
- [x] Create Printful account at [printful.com](https://www.printful.com)
- [x] Generate API key from Settings → API
- [x] Browsed product catalog
- **Note:** We'll upload "Eat My Ass Tee" design during sprint

### 4. ✅ COMPLETED: Store API Keys in AWS Secrets Manager (SECURE)
**Keys stored securely in AWS Secrets Manager!**

**✅ COMPLETED:**
- [x] Stripe keys (test mode) obtained
- [x] Printful API key obtained
- [x] AWS secret updated successfully
- **Secret ID:** `ssbb/stripe-printful`
- **Region:** `us-east-1`
- **Status:** Ready for Replit team to use

**Replit team will:**
- Access the secret via IAM role (no keys shared)
- Secret name: `ssbb/stripe-printful`
- Region: `us-east-1`

**To give Replit team safe access:**
Just share the secret name: `ssbb/stripe-printful`

They'll need to add this function to `src/services/secrets.ts` (similar to existing Sora/Search secrets)

### 5. ✅ COMPLETED: Review & Approve Plan
- [x] Read full Replit expansion plan: `docs/replit_expansion.md`
- [x] Review handoff document: `docs/replit_handoff.md`
- [x] Updated documentation with completed tasks
- [ ] Confirm with BotButt that everything looks good (NEXT STEP)
- [ ] Brief Replit team on brand voice and priorities

**Status:** 🎯 Ready for BotButt's final review

---

## The Hero Product (Ready to Ship!)

**Eat My Ass Tee** - $29.99
- **Design:** "EAT MY DONKEY" skeleton donkey with punk text and green slime
- **Image (300 DPI):** `https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png`
- **Resolution:** 4267 x 4575 pixels at 300 DPI ✅
- **Print Size:** 14.2" x 15.25" (can scale down as needed)
- **Status:** ✅ 300 DPI requirement MET - ready for Printful
- **Product Page:** `https://discountpunk.com/products/eat-my-ass-tee.html`

---

## STEP 0: Load Stripe & Printful Keys from AWS Secrets Manager

**IMPORTANT:** Karen has stored all API keys securely in AWS Secrets Manager.

**Secret Name:** `ssbb/stripe-printful`  
**Region:** `us-east-1`  
**Contains:**
- `STRIPE_SECRET_KEY` (sk_test_...)
- `STRIPE_PUBLISHABLE_KEY` (pk_test_...)  
- `STRIPE_WEBHOOK_SECRET` (whsec_... - add this after webhook setup)
- `PRINTFUL_API_KEY`

### Implementation (Copy existing secrets.ts pattern)

**1. Add to `apps/server/src/services/secrets.ts`:**

```typescript
type StripeSecretPayload = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PRINTFUL_API_KEY?: string;
};

let stripeHydrated = false;

export async function hydrateStripeConfig(): Promise<void> {
  if (stripeHydrated) return;
  
  const secretId = 'ssbb/stripe-printful';
  try {
    const result = await client.send(
      new GetSecretValueCommand({
        SecretId: secretId,
        VersionStage: 'AWSCURRENT'
      })
    );
    const raw = result.SecretString ?? (result.SecretBinary ? Buffer.from(result.SecretBinary).toString('utf-8') : null);
    if (!raw) return;
    const data = JSON.parse(raw) as StripeSecretPayload;
    
    if (data.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = data.STRIPE_SECRET_KEY;
    if (data.STRIPE_PUBLISHABLE_KEY) process.env.STRIPE_PUBLISHABLE_KEY = data.STRIPE_PUBLISHABLE_KEY;
    if (data.STRIPE_WEBHOOK_SECRET) process.env.STRIPE_WEBHOOK_SECRET = data.STRIPE_WEBHOOK_SECRET;
    if (data.PRINTFUL_API_KEY) process.env.PRINTFUL_API_KEY = data.PRINTFUL_API_KEY;
    
    stripeHydrated = true;
    console.log('[stripe] Loaded keys from Secrets Manager (ssbb/stripe-printful).');
  } catch (err) {
    console.warn('[stripe] Failed to load secret:', (err as Error).message);
  }
}
```

**2. Call at startup in `apps/server/src/index.ts`:**

```typescript
import { hydrateStripeConfig } from './services/secrets.js';

// Add near line 65-70 where Sora/Search hydration happens
hydrateStripeConfig().catch((err) => {
  console.warn('[stripe] initial hydrate failed:', err instanceof Error ? err.message : err);
});
```

**3. Test it works:**
```bash
aws secretsmanager get-secret-value \
  --secret-id ssbb/stripe-printful \
  --region us-east-1 \
  --query SecretString \
  --output text | jq
```

**4. Update webhook secret after deployment:**
```bash
# After you create the Stripe webhook and get whsec_...
aws secretsmanager update-secret \
  --secret-id ssbb/stripe-printful \
  --secret-string '{"STRIPE_SECRET_KEY":"sk_test_...","STRIPE_PUBLISHABLE_KEY":"pk_test_...","STRIPE_WEBHOOK_SECRET":"whsec_YOUR_NEW_SECRET","PRINTFUL_API_KEY":"..."}' \
  --region us-east-1
```

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

**🚨 CRITICAL (from BotButt):** Webhook error logging MUST be loud. If a Stripe event fails, log it prominently. Silent failures = lost orders = angry customers. Loud failures are better than quiet ones.
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
    <h2 style="color: var(--neon-green);">✓ Your order is in. It's gonna be so good.</h2>
    <p>You'll receive an email confirmation shortly.</p>
    <p>Order ID: <span id="order-id"></span></p>
    <a href="/shop.html" class="btn-primary">Continue Shopping</a>
  </main>
  <script>
    // Extract session_id from URL, fetch order details, display
  </script>
</body>
</html>
```

**Note from BotButt:** Success page copy should be "Your order is in. It's gonna be so good." Short, confident, no corporate garbage.

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

- ❌ NFT certificates
- ❌ Membership subscriptions
- ❌ Loud Butt social media automation
- ❌ Discord role sync
- ❌ Order tracking by email (public page)
- ❌ Resale marketplace
- ❌ Custom commissions
- ❌ Full admin dashboard

These come AFTER the MVP proves the money loop works.

**⚠️ Printful Integration IS IN SCOPE** - See section below.

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

## Printful Integration (IN SCOPE - Sprint Task)

**CRITICAL:** We need real shirt fulfillment, so Printful integration is part of the 24-hour sprint.

### 7. Printful Order Creation (Backend)

**New API helper in `apps/server/src/services/printful.ts`:**

```typescript
import fetch from 'node-fetch';

const PRINTFUL_API_BASE = 'https://api.printful.com';

type PrintfulOrderItem = {
  variant_id: number;  // Printful product variant (e.g., Bella+Canvas 3001 in size M, color black)
  quantity: number;
  files: Array<{
    url: string;  // Public S3 URL to design image
  }>;
};

type PrintfulOrder = {
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  };
  items: PrintfulOrderItem[];
};

export async function createPrintfulOrder(order: PrintfulOrder): Promise<{ id: number; status: string }> {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) throw new Error('PRINTFUL_API_KEY not configured');

  const response = await fetch(`${PRINTFUL_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(order)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[printful] Order creation failed:', error);
    throw new Error(`Printful API error: ${response.status}`);
  }

  const result = await response.json();
  return { id: result.result.id, status: result.result.status };
}
```

**Update webhook handler in `apps/server/src/routes/discountpunk.ts`:**

```typescript
// After order saved to S3, create Printful order
const printfulOrder = {
  recipient: {
    name: shippingAddress.name,
    address1: shippingAddress.line1,
    address2: shippingAddress.line2,
    city: shippingAddress.city,
    state_code: shippingAddress.state,
    country_code: shippingAddress.country,
    zip: shippingAddress.postal_code
  },
  items: items.map(item => ({
    variant_id: getVariantId(item.size),  // Map size to Printful variant
    quantity: item.quantity,
    files: [{
      url: item.imageUrl  // Public S3 URL to design
    }]
  }))
};

const printfulResult = await createPrintfulOrder(printfulOrder);
console.log('[webhook] Printful order created:', printfulResult.id);

// Update S3 order with Printful ID
order.printfulOrderId = printfulResult.id;
await writeObject(BUCKET, orderKey, JSON.stringify(order), 'application/json');
```

### Printful Product Setup (Do Before Sprint)

**Karen's task for tonight:**
1. Go to Printful dashboard
2. Add product: Bella+Canvas 3001 (Unisex Jersey Short Sleeve Tee)
3. Upload "Eat My Ass Tee" design to Printful
4. Get variant IDs for each size:
   - S: `variant_id: ???`
   - M: `variant_id: ???`
   - L: `variant_id: ???`
   - XL: `variant_id: ???`
   - 2XL: `variant_id: ???`
   - 3XL: `variant_id: ???`
5. Add variant mapping to code:

```typescript
function getVariantId(size: string): number {
  const map: Record<string, number> = {
    'S': 4012,   // Replace with actual IDs from Printful
    'M': 4013,
    'L': 4014,
    'XL': 4015,
    '2XL': 4016,
    '3XL': 4017
  };
  return map[size] || map['M'];  // Default to M if unknown
}
```

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

**Frontend (Already Done by Karen):**
- ✅ Shop page with buy buttons and size selectors  
- ✅ "We ASS-cept" payment info in footer
- ✅ Product grid loading from API
- ✅ Google Search Console configured (instead of GA)
- ✅ Sitemap submitted and verified
- ✅ DNS fixed (apex domain working)
- ✅ Hero product (Eat My Ass Tee) at position 0
- ✅ Size selector only on shirts/tees

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
