# 🚀 REPLIT 24-HOUR SPRINT: START HERE

**Sprint Start:** May 2, 2026 @ 7:00 AM  
**Sprint End:** May 3, 2026 @ 7:00 AM  
**Goal:** Build Stripe checkout for Discount Punk MVP

---

## 📚 DOCUMENTATION INDEX

Read these in order:

1. **THIS FILE** - Quick start guide (you are here)
2. **[replit_handoff.md](./replit_handoff.md)** - Complete technical specs, API endpoints, schemas
3. **[replit_expansion.md](./replit_expansion.md)** - Full roadmap with BotButt's feedback (reference only)

---

## 🎯 WHAT YOU'RE BUILDING

**One sentence:** Add Stripe checkout to Discount Punk so customers can buy the "Eat My Ass Tee" for $29.99.

**Success criteria:** 
- Customer clicks "BUY NOW" → Stripe Checkout → Payment → Order saved to S3 → Stocky Butt can see it

---

## 🔐 STEP 0: GET THE API KEYS (FIRST THING)

**AWS Secret Name:** `ssbb/stripe-printful`  
**Region:** `us-east-1`

Karen has stored all keys securely. You need to load them at startup.

### Add to `apps/server/src/services/secrets.ts`:

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
    console.log('[stripe] Loaded keys from Secrets Manager.');
  } catch (err) {
    console.warn('[stripe] Failed to load secret:', (err as Error).message);
  }
}
```

### Call at startup in `apps/server/src/index.ts`:

```typescript
import { hydrateStripeConfig } from './services/secrets.js';

// Add near line 65-70 where Sora/Search hydration happens
hydrateStripeConfig().catch((err) => {
  console.warn('[stripe] hydrate failed:', err instanceof Error ? err.message : err);
});
```

### Test it works:

```bash
aws secretsmanager get-secret-value \
  --secret-id ssbb/stripe-printful \
  --region us-east-1 \
  --query SecretString \
  --output text | jq
```

---

## 🛠️ WHAT TO BUILD (6 Main Tasks)

### 1. Install Dependencies

```bash
cd apps/server
npm install stripe@^14.0.0 sharp
```

### 2. Create Checkout Endpoint

**File:** `apps/server/src/routes/discountpunk.ts`

```typescript
POST /api/discountpunk/checkout/create-session
```

- Takes cart items (product, size, quantity)
- Creates Stripe Checkout Session
- Returns session URL
- See detailed spec in [replit_handoff.md](./replit_handoff.md#3-stripe-integration-backend)

### 3. Create Webhook Handler

**File:** `apps/server/src/routes/discountpunk.ts`

```typescript
POST /api/discountpunk/webhooks/stripe
```

- Listens for `payment_intent.succeeded`
- Creates order JSON in S3: `discountpunk/orders/{orderId}.json`
- See schema in [replit_handoff.md](./replit_handoff.md#2-order-schema)

### 4. Add Stocky Butt's Tools

**File:** `apps/server/src/services/provider.ts`

Add these AI agent tools:
- `get_orders()` - List orders from S3
- `get_order_details()` - Get single order
- `update_order_status()` - Update order status
- `verify_image_quality()` - DPI check (300 DPI gate)

See full specs in [replit_handoff.md](./replit_handoff.md#5-stocky-butts-tools-backend)

### 5. Update Frontend (MINIMAL)

**File:** `discountpunk.com/shop.html` (already done!)

Just update the onclick handler to actually call your checkout endpoint:

```javascript
// Replace the alert() with:
async function buyNow(productTitle, price) {
  const size = document.querySelector('.size-select')?.value;
  if (!size) return alert('Please choose a size');
  
  const response = await fetch(`${API_URL}/api/discountpunk/checkout/create-session`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      items: [{ productTitle, price: parseFloat(price.replace('$','')), size, quantity: 1 }]
    })
  });
  
  const { url } = await response.json();
  window.location.href = url;
}
```

### 6. Deploy to AWS ECS

See [replit_handoff.md](./replit_handoff.md#deployment-strategy) for full deployment checklist.

Quick version:
```bash
docker build -t ssbb-server:stripe .
# Push to ECR
# Update ECS task
# Force deployment
```

---

## 🧪 TESTING

### Test Stripe Checkout Locally

```bash
# Install Stripe CLI
stripe listen --forward-to http://localhost:4000/api/discountpunk/webhooks/stripe

# In another terminal
stripe trigger payment_intent.succeeded
```

### Test Card Numbers

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### End-to-End Test

1. Visit https://discountpunk.com/shop.html
2. Find "Eat My Ass Tee" (first product)
3. Choose size M
4. Click "BUY NOW"
5. Should redirect to Stripe Checkout
6. Enter test card `4242 4242 4242 4242`
7. Complete checkout
8. Should see success page
9. Check S3 for order JSON: `s3://ssbb-media-prod/discountpunk/orders/`

---

## 🚨 CRITICAL REQUIREMENTS

### From BotButt:

1. **300 DPI Gate** - "Nothing kills a merch brand faster than a blurry shirt"
   - Posters: REQUIRE 300 DPI (hard block)
   - Shirts: WARN below 150 DPI, prefer 300
   - Use `sharp` to check image metadata

2. **Brand Voice** - Use "We ASS-cept" not "We accept" for payment methods

3. **Clear Separation** - Stocky Butt = operations only, BotButt = creative

### From Justin (ChatGPT 5.5):

4. **MVP Scope** - Just the money loop, no NFTs/memberships yet
5. **One Product** - Focus on Eat My Ass Tee first
6. **Stripe Tax** - Enable it or explicitly defer (don't leave vague)

---

## 📦 WHAT'S ALREADY DONE

✅ **Frontend:**
- Shop page with buy buttons and size selectors
- "We ASS-cept" payment info in footer
- Product grid loading from API
- Sitemap & DNS configured

✅ **Backend:**
- Discount Punk API routes (`/api/discountpunk/content`)
- S3 integration working
- Product listings in `s3://ssbb-media-prod/discountpunk/`
- BotButt's existing tools (add_product, delete_product, create_comic)

✅ **Hero Product:**
- Eat My Ass Tee - $29.99
- Design 2 (punk donkey) ready
- Image: `s3://ssbb-media-prod/discountpunk/images/1777621889057-eat-my-[donkey]-tee.png`

---

## 📁 FILE STRUCTURE

```
apps/server/src/
├── index.ts                    # Add hydrateStripeConfig() call
├── config.ts                   # (Config already exists)
├── services/
│   ├── secrets.ts             # Add hydrateStripeConfig() function
│   ├── provider.ts            # Add Stocky Butt's tools
│   └── s3.ts                  # Already exists (use readObject, writeObject)
└── routes/
    └── discountpunk.ts        # Add checkout + webhook routes

discountpunk.com/
├── shop.html                  # Update buy button onclick handler
└── checkout/
    └── success.html           # Create this (simple confirmation page)
```

---

## 🐛 DEBUGGING

### If keys don't load:
```bash
# Check IAM permissions
aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful --region us-east-1

# Check logs
tail -f /var/log/ecs/ecs-agent.log
```

### If webhook fails:
```bash
# Test locally with Stripe CLI
stripe listen --forward-to http://localhost:4000/api/discountpunk/webhooks/stripe

# Check signature validation
console.log('Stripe signature:', req.headers['stripe-signature']);
```

### If order not saved:
```bash
# Check S3 bucket permissions
aws s3 ls s3://ssbb-media-prod/discountpunk/orders/

# Check logs
console.log('[webhook] Order saved:', orderId);
```

---

## 📞 CONTACT

**Questions?** Read [replit_handoff.md](./replit_handoff.md) first - it has all the detailed specs.

**Karen's Checklist for Post-Sprint:**
1. Add Stripe webhook endpoint in dashboard
2. Get webhook secret (`whsec_...`)
3. Update AWS secret with webhook secret
4. Test first real order

---

## 🎯 DELIVERABLES

By 7:00 AM May 3:

- [x] Stripe checkout working
- [x] Webhook receiving payments
- [x] Orders saving to S3
- [x] Stocky Butt can query orders
- [x] Test order completed successfully
- [x] Deployed to AWS ECS
- [x] Documentation updated

---

**Let's make it real. One product. One checkout. One paid order. 🔥**

**Sprint starts in:** Check your calendar for May 2, 7:00 AM

**Good luck! 🚀**
