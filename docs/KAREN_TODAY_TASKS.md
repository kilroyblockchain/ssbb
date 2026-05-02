# Karen's Tasks - TODAY (May 1) Before Sprint

**Replit is ready. Now you execute these 5 tasks.**

**Replit info:**
- GitHub: kilroyblockchain
- Timezone: Central (7am CT = 8am ET)
- Communication: This chat channel
- Retry logic: YES, adding to sprint scope

---

## TASK 1: Create IAM User for Replit (15 min)

### 1.1 Create IAM User
```bash
aws iam create-user --user-name replit-sprint-kilroy
```

### 1.2 Create IAM Policy
```bash
cat > /tmp/replit-sprint-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:ssbb/stripe-printful-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ssbb-media-prod/discountpunk/orders/*",
        "arn:aws:s3:::ssbb-media-prod"
      ]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name DiscountPunkSprintAccess \
  --policy-document file:///tmp/replit-sprint-policy.json
```

### 1.3 Attach Policy to User
```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach policy
aws iam attach-user-policy \
  --user-name replit-sprint-kilroy \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/DiscountPunkSprintAccess
```

### 1.4 Create Access Keys
```bash
aws iam create-access-key --user-name replit-sprint-kilroy
```

**SAVE THE OUTPUT!** You'll send this to Replit.

Output looks like:
```json
{
  "AccessKey": {
    "AccessKeyId": "AKIA...",
    "SecretAccessKey": "...",
    "Status": "Active"
  }
}
```

### 1.5 Test Access with Their Credentials
```bash
# Test with their credentials
export AWS_ACCESS_KEY_ID="[AccessKeyId from above]"
export AWS_SECRET_ACCESS_KEY="[SecretAccessKey from above]"
export AWS_DEFAULT_REGION="us-east-1"

# Test secret access
aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful

# If successful, unset
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
```

---

## TASK 2: ✅ COMPLETE - Get Printful Variant IDs & 300 DPI Image

**✅ COMPLETED!**

**Printful Variant IDs (Bella+Canvas 3001 Black):**
```typescript
const VARIANT_MAP: Record<string, number> = {
  'S': 4016,
  'M': 4017,
  'L': 4018,
  'XL': 4019,
  '2XL': 4020,
  '3XL': 5295
};
```

**300 DPI Product Image:**
- File: `eat-my-donkey-300dpi.png`
- S3 URL: `https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png`
- Resolution: 4267 x 4575 pixels at 300 DPI ✅
- Print size: 14.2" x 15.25"
- **Passes BotButt's 300 DPI gate!**

**See:** `docs/PRINTFUL_READY.md` for complete details

---

## TASK 3: Create GitHub Repo (20 min)

### 3.1 Create Repo on GitHub
1. Go to https://github.com/new
2. Repository name: `discount-punk-checkout`
3. Description: "24-hour sprint: Stripe + Printful checkout for Discount Punk MVP"
4. **Private** repository
5. Do NOT initialize with README
6. Create repository

### 3.2 Prepare Sprint Code Base

```bash
# Create fresh directory
cd /Users/karenkilroy/zorro_kilroy
mkdir discount-punk-checkout
cd discount-punk-checkout

# Initialize git
git init
git branch -M main

# Copy server code
cp -r ../ssbb/apps/server .
cp ../ssbb/package.json .
cp ../ssbb/tsconfig.json .

# Copy gitignore
cp ../ssbb/.gitignore . || cat > .gitignore <<'EOF'
node_modules/
dist/
.env
*.log
.DS_Store
EOF

# Copy documentation
mkdir docs
cp ../ssbb/docs/REPLIT_START_HERE.md docs/
cp ../ssbb/docs/replit_handoff.md docs/
cp ../ssbb/docs/BOTBUTT_APPROVAL.md docs/
cp ../ssbb/docs/REPLIT_PREBRIEFING_TODAY.md docs/
```

### 3.3 Create README

```bash
cat > README.md <<'EOF'
# Discount Punk Checkout - 24 Hour Sprint

**Sprint Start:** May 2, 2026 @ 7:00 AM CT  
**Sprint End:** May 3, 2026 @ 7:00 AM CT  
**Goal:** Build Stripe + Printful checkout for Discount Punk MVP

## Quick Start

1. Read `docs/REPLIT_START_HERE.md`
2. Follow the 7 main tasks
3. Push code continuously to `feature/stripe-checkout` branch
4. Karen will deploy and test from her side

## Setup

```bash
# Install dependencies
cd server
npm install

# Configure AWS credentials (Karen will provide)
aws configure

# Test secret access
aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful --region us-east-1

# Start dev server
npm run dev
```

## Documentation

- [START HERE](docs/REPLIT_START_HERE.md) - Quick start guide
- [Technical Handoff](docs/replit_handoff.md) - Complete specs
- [BotButt's Approval](docs/BOTBUTT_APPROVAL.md) - Requirements & sign-off
- [Pre-Briefing](docs/REPLIT_PREBRIEFING_TODAY.md) - Questions answered

## Key Info

- **AWS Secret:** `ssbb/stripe-printful` (us-east-1)
- **Test Card:** `4242 4242 4242 4242`
- **Backend:** https://ssbb.pretendo.tv
- **Frontend:** https://discountpunk.com
- **S3 Bucket:** ssbb-media-prod
- **Orders Path:** discountpunk/orders/

## 7 Main Tasks

1. Install dependencies (`stripe@^14.0.0`, `sharp`)
2. Hydrate Stripe/Printful keys from AWS Secrets Manager
3. Create checkout endpoint: `POST /api/discountpunk/checkout/create-session`
4. Create webhook handler: `POST /api/discountpunk/webhooks/stripe` (with LOUD error logging)
5. Add Stocky Butt's tools to `provider.ts`
6. Add Printful integration with retry logic (3 attempts)
7. Deploy to AWS ECS

## Critical Requirements (from BotButt)

1. **Webhook error logging MUST be loud** - No silent failures
2. **Success page copy:** "Your order is in. It's gonna be so good."
3. **300 DPI gate is non-negotiable** - Don't soften under time pressure
4. **Printful retry logic** - 3 attempts with exponential backoff

## Workflow

```bash
# Create feature branch
git checkout -b feature/stripe-checkout

# Make changes, commit frequently
git add .
git commit -m "Add checkout endpoint"

# Push continuously (every 30 min or when something works)
git push origin feature/stripe-checkout
```

Karen will pull your code and deploy to AWS for testing.

## Testing

**Local:**
```bash
# Start server
npm run dev

# Test checkout endpoint
curl -X POST http://localhost:4000/api/discountpunk/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productTitle":"Eat My Ass Tee","price":29.99,"size":"M","quantity":1}]}'

# Test webhook with Stripe CLI
stripe listen --forward-to http://localhost:4000/api/discountpunk/webhooks/stripe
stripe trigger payment_intent.succeeded
```

**Production (Karen's side):**
- End-to-end browser test at https://discountpunk.com/shop.html

## Contact

- **Karen:** Via this chat channel
- **Timezone:** Central Time (Chicago)
- **Available:** 7am CT - midnight tomorrow

---

**Let's ship a shirt! 🔥🚀**
EOF
```

### 3.4 Initial Commit

```bash
git add .
git commit -m "Initial sprint setup: base code + documentation

- Server code from ssbb repo
- Complete documentation (START_HERE, handoff, approval, prebriefing)
- README with setup instructions
- 7 main tasks defined
- Critical requirements from BotButt

Ready for Replit team to start at 7am CT tomorrow.
"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/discount-punk-checkout.git

# Push to main
git push -u origin main
```

### 3.5 Add Replit as Collaborator

1. Go to repo: https://github.com/YOUR_USERNAME/discount-punk-checkout
2. Click "Settings" tab
3. Click "Collaborators" in left sidebar
4. Click "Add people"
5. Enter: `kilroyblockchain`
6. Send invitation

---

## TASK 4: Send Credentials to Replit (5 min)

### 4.1 Prepare Credentials Message

```
🔑 AWS Credentials - CONFIDENTIAL

IAM User: replit-sprint-kilroy
Access Key ID: [from Task 1.4]
Secret Access Key: [from Task 1.4]
Region: us-east-1

Test command:
aws configure
# Enter the credentials above

# Then test:
aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful --region us-east-1

Should return JSON with STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, etc.

---

📦 GitHub Repository

Repo: https://github.com/YOUR_USERNAME/discount-punk-checkout
Invitation sent to: kilroyblockchain

Clone command:
git clone https://github.com/YOUR_USERNAME/discount-punk-checkout.git
cd discount-punk-checkout
git checkout -b feature/stripe-checkout

---

🔧 Stripe Test Keys (for local testing)

Publishable Key: [get from Stripe dashboard test mode]
Secret Key: [get from Stripe dashboard test mode]

These are in AWS Secrets Manager, but having them locally helps for dev.

---

📋 Printful Variant IDs

[Paste from PRINTFUL_VARIANTS.md once Task 2 is complete]

---

✅ You're all set!

Test AWS access now and ping me if any issues.

See you at 7am CT! 🔥
```

**Send via secure method** (encrypted chat, password-protected doc, etc.)

---

## TASK 5: Update Documentation with Retry Logic (10 min)

### 5.1 Update replit_handoff.md

Add retry logic code to Printful integration section:

```bash
cd /Users/karenkilroy/zorro_kilroy/ssbb/docs
```

Open `replit_handoff.md` and add this to the Printful integration section:

```typescript
// Helper: Sleep function for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Printful order creation with retry logic
async function createPrintfulOrderWithRetry(
  order: PrintfulOrder, 
  attempts = 3
): Promise<{ id: number; status: string }> {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await createPrintfulOrder(order);
      console.log(`[printful] ✅ Order created on attempt ${i + 1}:`, result.id);
      return result;
    } catch (error) {
      const err = error as Error;
      console.error(`[printful] ❌ Attempt ${i + 1}/${attempts} failed:`, err.message);
      
      if (i === attempts - 1) {
        // Final attempt failed - LOG LOUDLY
        console.error('[printful] 🚨 ALL RETRY ATTEMPTS FAILED 🚨', {
          order: order,
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      // Exponential backoff: 1s, 3s, 9s
      const backoffMs = Math.pow(3, i) * 1000;
      console.log(`[printful] Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }
  
  throw new Error('createPrintfulOrderWithRetry: Should never reach here');
}
```

Save and commit:

```bash
git add docs/replit_handoff.md
git commit -m "Add Printful retry logic (3 attempts, exponential backoff)"
git push
```

---

## CHECKLIST - Complete Before 7am Tomorrow

- [x] **Task 1:** IAM user created, credentials tested ✅
- [x] **Task 2:** Printful variant IDs obtained + 300 DPI image ready ✅
- [ ] **Task 3:** GitHub repo created, base code pushed, Replit invited
- [ ] **Task 4:** Credentials sent to Replit securely
- [ ] **Task 5:** Documentation updated
- [x] **Replit confirmed:** AWS access works ✅
- [ ] **Replit confirmed:** Can clone repo
- [ ] **You:** Get a good night's sleep! 😴

**BONUS COMPLETE:**
- [x] 300 DPI image obtained and uploaded to S3 ✅
- [x] No upscaling needed tomorrow ✅

---

## Tomorrow Morning (7am CT / 8am ET)

**Your role:**
1. Pull Replit's code from `feature/stripe-checkout` branch
2. Deploy to AWS ECS
3. Test live endpoints
4. Give real-time feedback
5. End-to-end test when ready

**Replit's role:**
1. Code factory mode - execute the 7 tasks
2. Push continuously
3. Zero meetings, pure shipping

**Together:**
- Ship one real shirt by 7am tomorrow
- Code factory mode activated 🔥

---

**GO TIME! Let's execute these 5 tasks NOW.** 🚀
