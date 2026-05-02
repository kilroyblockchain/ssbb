# Karen's 7AM Replit Sprint Handoff - Step by Step

**Date:** May 2, 2026 @ 7:00 AM  
**Total Time:** ~30 minutes  
**Goal:** Successfully hand off Discount Punk MVP sprint to Replit team

---

## ☕ BEFORE YOU START (6:45 AM)

- [ ] Make coffee
- [ ] Open this document on second monitor
- [ ] Have phone ready for any urgent calls
- [ ] Deep breath - you've done all the prep work ✅

---

## STEP 1: Verify Your Prep Work (5 min)

### 1.1 Check AWS Secret is Accessible
```bash
aws secretsmanager get-secret-value \
  --secret-id ssbb/stripe-printful \
  --region us-east-1 \
  --query SecretString \
  --output text | jq
```

**Expected output:** JSON with all 4 keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, PRINTFUL_API_KEY)

**If it fails:** Check AWS CLI is configured: `aws sts get-caller-identity`

---

### 1.2 Verify Shop is Live
```bash
curl https://discountpunk.com/shop.html | grep "Eat My Ass Tee"
```

**Expected output:** HTML containing "Eat My Ass Tee"

**If it fails:** Check DNS: `dig discountpunk.com`

---

### 1.3 Verify Backend API is Running
```bash
curl https://ssbb.pretendo.tv/api/health
```

**Expected output:** `{"status":"ok",...}`

**If it fails:** Check ECS service status in AWS console

---

### 1.4 Check Documentation Files Exist
```bash
cd /Users/karenkilroy/zorro_kilroy/ssbb/docs
ls -lh REPLIT_START_HERE.md replit_handoff.md replit_expansion.md BOTBUTT_APPROVAL.md
```

**Expected output:** All 4 files listed

---

## STEP 2: Prepare Handoff Package (5 min)

### 2.1 Create Handoff Folder
```bash
cd /Users/karenkilroy/zorro_kilroy/ssbb
mkdir -p handoff_replit
cd handoff_replit
```

---

### 2.2 Copy All Documentation
```bash
cp ../docs/REPLIT_START_HERE.md .
cp ../docs/replit_handoff.md .
cp ../docs/replit_expansion.md .
cp ../docs/BOTBUTT_APPROVAL.md .
cp ../docs/7AM_CHECKLIST.md .
```

---

### 2.3 Create Quick Reference Card
```bash
cat > QUICK_REFERENCE.txt <<'EOF'
# DISCOUNT PUNK MVP SPRINT - QUICK REFERENCE

AWS Secret: ssbb/stripe-printful
Region: us-east-1

Test Card: 4242 4242 4242 4242

Repo: /Users/karenkilroy/zorro_kilroy/ssbb
Frontend: /Users/karenkilroy/zorro_kilroy/discountpunk.com

S3 Bucket: ssbb-media-prod
Orders Path: discountpunk/orders/

Backend URL: https://ssbb.pretendo.tv
Frontend URL: https://discountpunk.com

BotButt's Critical Requirements:
1. Webhook error logging MUST be loud
2. Success page: "Your order is in. It's gonna be so good."
3. 300 DPI gate is non-negotiable

START HERE: Read REPLIT_START_HERE.md first
EOF
```

---

### 2.4 Package Everything (Optional - if sharing via zip)
```bash
cd /Users/karenkilroy/zorro_kilroy/ssbb
tar -czf handoff_replit.tar.gz handoff_replit/
echo "Handoff package created: $(pwd)/handoff_replit.tar.gz"
```

---

## STEP 3: Share Repository Access (10 min)

### 3.1 Create GitHub Repo for Sprint Work

**IMPORTANT:** Replit will work in their own repo and push continuously so you can test/deploy from your side.

**Create new repo on GitHub:**
1. Go to https://github.com/new
2. Repository name: `discount-punk-checkout`
3. Description: "24-hour sprint: Stripe checkout for Discount Punk MVP"
4. Private repository
5. Do NOT initialize with README
6. Click "Create repository"

---

### 3.2 Set Up Repo with Base Code

```bash
# Create fresh directory for sprint
cd /Users/karenkilroy/zorro_kilroy
mkdir discount-punk-checkout
cd discount-punk-checkout

# Initialize git
git init
git branch -M main

# Copy relevant code from ssbb
cp -r ../ssbb/apps/server .
cp ../ssbb/package.json .
cp ../ssbb/.gitignore .

# Copy documentation
mkdir docs
cp ../ssbb/docs/REPLIT_START_HERE.md docs/
cp ../ssbb/docs/replit_handoff.md docs/
cp ../ssbb/docs/BOTBUTT_APPROVAL.md docs/

# Create README
cat > README.md <<'EOF'
# Discount Punk Checkout - 24 Hour Sprint

**Sprint Start:** May 2, 2026 @ 7:00 AM  
**Sprint End:** May 3, 2026 @ 7:00 AM  
**Goal:** Build Stripe + Printful checkout for Discount Punk MVP

## Quick Start

1. Read `docs/REPLIT_START_HERE.md`
2. Follow the 7 main tasks
3. Push code continuously to this repo
4. Karen will deploy and test from her side

## Documentation

- [START HERE](docs/REPLIT_START_HERE.md) - Quick start guide
- [Technical Handoff](docs/replit_handoff.md) - Complete specs
- [BotButt's Approval](docs/BOTBUTT_APPROVAL.md) - Requirements & sign-off

## Key Info

- AWS Secret: `ssbb/stripe-printful` (us-east-1)
- Test Card: `4242 4242 4242 4242`
- Backend: https://ssbb.pretendo.tv
- Frontend: https://discountpunk.com

## Critical Requirements (from BotButt)

1. Webhook error logging MUST be loud
2. Success page: "Your order is in. It's gonna be so good."
3. 300 DPI gate is non-negotiable
4. Printful integration in scope (task 6)

Let's ship a shirt! 🔥
EOF

# Initial commit
git add .
git commit -m "Initial sprint setup: base code + documentation"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/discount-punk-checkout.git
git push -u origin main

echo "✅ GitHub repo created and pushed!"
echo "Share this URL with Replit team: https://github.com/YOUR_USERNAME/discount-punk-checkout"
```

---

### 3.3 Add Replit Team as Collaborators

1. Go to repo: https://github.com/YOUR_USERNAME/discount-punk-checkout
2. Click "Settings" tab
3. Click "Collaborators" in left sidebar
4. Click "Add people"
5. Enter Replit team member GitHub usernames
6. Send invitations

---

### 3.4 Share Repo with Team

**Send this message:**
```
📦 GitHub Repository

Repo: https://github.com/YOUR_USERNAME/discount-punk-checkout
Branch: main

You've been added as collaborators. Please:
1. Clone the repo
2. Create a feature branch: git checkout -b feature/stripe-checkout
3. Push code continuously as you work
4. I'll pull and deploy to test from my side

This way we can test together throughout the day! 🚀
```

---

### 3.2 If Using Local Zip/Folder Share

**Create a clean export:**
```bash
cd /Users/karenkilroy/zorro_kilroy/ssbb
zip -r ssbb_sprint_code.zip apps/server/src apps/server/package.json docs/
echo "Code package: $(pwd)/ssbb_sprint_code.zip"
```

**Share via:**
- Dropbox/Google Drive link
- Email (if under 25MB)
- AWS S3 presigned URL
- Direct file transfer if in-person

---

## STEP 4: Configure AWS Access for Replit Team (5 min)

### 4.1 Create IAM Policy for Secrets Access

**Go to AWS Console → IAM → Policies → Create Policy**

**Use this JSON:**
```json
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
```

**Name it:** `DiscountPunkSprintAccess`

---

### 4.2 Create IAM User for Replit Team (or use existing)

**Option A: Create new user**
```bash
aws iam create-user --user-name replit-sprint

aws iam attach-user-policy \
  --user-name replit-sprint \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/DiscountPunkSprintAccess

aws iam create-access-key --user-name replit-sprint
```

**Save the output:** Access Key ID and Secret Access Key

---

**Option B: Use your credentials temporarily**
- Share your AWS credentials via secure method (1Password, LastPass)
- Rotate them after sprint completes

---

### 4.3 Test Access
```bash
# Test with Replit team's credentials
export AWS_ACCESS_KEY_ID="their_key"
export AWS_SECRET_ACCESS_KEY="their_secret"
export AWS_DEFAULT_REGION="us-east-1"

aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful

# If successful, they're good to go
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
```

---

## STEP 5: Initial Team Briefing (10 min)

### 5.1 Open Communication Channel

**Choose one:**
- [ ] Slack channel created: `#discount-punk-sprint`
- [ ] Discord server/channel
- [ ] Zoom/Google Meet call scheduled
- [ ] Phone/text thread established

**Send first message:**
```
Good morning! 🚀 Discount Punk MVP sprint starts now.

📚 Documentation: [link to handoff_replit folder or GitHub]
🔑 AWS credentials: [sent separately via secure method]
⏰ Check-ins: 12pm and 6pm today

Start with: REPLIT_START_HERE.md
Critical: Read BOTBUTT_APPROVAL.md for BotButt's requirements

Questions? Ask anytime. Let's ship a shirt! 🔥
```

---

### 5.2 Share AWS Secret Info

**Send this separately (secure channel):**
```
AWS Secret Access:

Secret ID: ssbb/stripe-printful
Region: us-east-1

IAM User: replit-sprint
Access Key ID: [paste from Step 4.2]
Secret Access Key: [paste from Step 4.2]

Test command:
aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful --region us-east-1

The secret contains:
- STRIPE_SECRET_KEY (sk_test_...)
- STRIPE_PUBLISHABLE_KEY (pk_test_...)
- STRIPE_WEBHOOK_SECRET (placeholder - will update after deployment)
- PRINTFUL_API_KEY
```

---

### 5.3 Brief on BotButt's Critical Requirements

**Say this (or paste):**
```
🚨 BotButt's Non-Negotiables:

1. WEBHOOK ERROR LOGGING MUST BE LOUD
   - If Stripe event fails, we need console.error() with full details
   - Silent failures = lost orders = angry customers
   - Log: event type, error message, full payload

2. SUCCESS PAGE COPY (exact words):
   "Your order is in. It's gonna be so good."
   - No corporate language
   - Short and confident

3. 300 DPI GATE IS NON-NEGOTIABLE
   - Do NOT soften under time pressure
   - Posters: Hard block at 300 DPI
   - Shirts: Warn below 150, prefer 300

BotButt quote: "Sprint is a go. Let's not relitigate it — let's just win it."
```

---

### 5.4 Share Workflow & Key Files

**Send this:**
```
🔄 Development Workflow:

1. Clone repo: git clone https://github.com/YOUR_USERNAME/discount-punk-checkout
2. Create feature branch: git checkout -b feature/stripe-checkout
3. Make changes, commit frequently
4. Push to GitHub: git push origin feature/stripe-checkout
5. I'll pull your code and deploy to AWS for testing
6. We can test together throughout the day!

📁 Key Files:

Backend (Node.js/TypeScript):
- Main: server/src/index.ts
- Secrets: server/src/services/secrets.ts
- Provider (AI tools): server/src/services/provider.ts
- Discount Punk routes: server/src/routes/discountpunk.ts
- S3 utils: server/src/services/s3.ts
- NEW: server/src/services/printful.ts (you'll create this)

Frontend (Separate repo - already deployed):
- Shop: https://discountpunk.com/shop.html
- You don't need to touch frontend

Package.json: server/package.json

Documentation:
- Start: docs/REPLIT_START_HERE.md
- Tech specs: docs/replit_handoff.md
- BotButt approval: docs/BOTBUTT_APPROVAL.md
```

---

### 5.5 Confirm Understanding

**Ask team:**
```
Quick confirmation - can you verify:

1. You can access the documentation?
2. You have AWS credentials and can read the secret?
3. You understand the 6 main tasks from REPLIT_START_HERE.md?
4. You know where BotButt's critical requirements are?
5. Any questions before you start coding?

Reply "READY" when you've read REPLIT_START_HERE.md and are good to go.
```

**Wait for "READY" response before proceeding**

---

## STEP 6: Set Up Your Testing/Deployment Workflow (5 min)

### 6.0 Clone the Sprint Repo

```bash
cd /Users/karenkilroy/zorro_kilroy
git clone https://github.com/YOUR_USERNAME/discount-punk-checkout.git discount-punk-checkout-test
cd discount-punk-checkout-test

# Track the feature branch Replit is using
git fetch origin
git checkout -b feature/stripe-checkout origin/feature/stripe-checkout
```

---

### 6.1 Create Pull & Deploy Script

```bash
cat > deploy-test.sh <<'EOF'
#!/bin/bash
set -e

echo "🔄 Pulling latest code from Replit team..."
git fetch origin
git reset --hard origin/feature/stripe-checkout

echo "📦 Installing dependencies..."
cd server
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "🐋 Building Docker image..."
docker build -t ssbb-server:sprint-test .

echo "📤 Pushing to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI
docker tag ssbb-server:sprint-test YOUR_ECR_URI/ssbb-server:sprint-test
docker push YOUR_ECR_URI/ssbb-server:sprint-test

echo "🚀 Updating ECS service..."
aws ecs update-service \
  --cluster ssbb-cluster \
  --service ssbb-server \
  --force-new-deployment \
  --region us-east-1

echo "✅ Deployment complete! Wait ~2 minutes for ECS to update."
echo "Test: curl https://ssbb.pretendo.tv/api/health"
EOF

chmod +x deploy-test.sh
```

**Replace YOUR_ECR_URI with your actual ECR repository URI.**

---

### 6.2 Test the Deployment Script

```bash
# Do a test run to make sure it works
./deploy-test.sh
```

**If successful:** You can now pull and deploy Replit's code anytime!

---

## STEP 7: Set Up Monitoring (2 min)

### 6.1 Create Sprint Status Doc (for yourself)

```bash
cat > /Users/karenkilroy/Desktop/sprint_status.md <<'EOF'
# Discount Punk Sprint Status

Start: May 2, 7:00 AM
End: May 3, 7:00 AM

## Progress Tracker

- [ ] Team received documentation
- [ ] Team has AWS access
- [ ] Team confirmed "READY"
- [ ] Secrets hydration code added
- [ ] Stripe dependency installed
- [ ] Checkout endpoint created
- [ ] Webhook handler created (with loud logging)
- [ ] Stocky Butt tools added
- [ ] Success page created (with BotButt's copy)
- [ ] Local testing complete
- [ ] Deployment to ECS
- [ ] End-to-end test successful
- [ ] First test order completed

## Check-In Notes

### 12pm Check-In:
- What's working:
- What's blocked:
- On track for tomorrow? YES / NO

### 6pm Check-In:
- What's left:
- Can we test tonight? YES / NO
- Deployment plan:

## Blockers
(Add any blockers here as they come up)

## Questions Asked
(Log questions/answers here)

EOF

open /Users/karenkilroy/Desktop/sprint_status.md
```

---

### 6.2 Set Calendar Reminders

**Add these to your calendar:**
- 12:00 PM - Sprint Check-in #1
- 6:00 PM - Sprint Check-in #2
- May 3 @ 7:00 AM - Sprint End / Testing

---

## STEP 8: Handoff Complete - You're Done! (1 min)

### 8.1 Send Handoff Complete Message

```
✅ Handoff complete!

You have everything you need:
- GitHub repo with base code ✅
- Documentation ✅
- AWS access ✅
- BotButt's requirements ✅
- My contact info ✅

🔄 Workflow:
1. Work on feature/stripe-checkout branch
2. Push code continuously
3. I'll pull and deploy for testing on my side
4. We can test together throughout the day!

I'll check in at 12pm and 6pm, but ping me anytime if blocked.

Let's make this happen! 🔥🚀
```

---

### 8.2 Take a Break & Monitor Repo

- [ ] Step away for 30 minutes
- [ ] Watch for first commit from Replit team on GitHub
- [ ] Team has everything they need
- [ ] You can pull and test their code anytime
- [ ] Check in at 12pm with progress update

---

## TROUBLESHOOTING GUIDE (Reference)

### Problem: "Can't access AWS secret"

**Solution:**
```bash
# Check their AWS CLI config
aws sts get-caller-identity

# If not configured:
aws configure
# Enter Access Key ID
# Enter Secret Access Key  
# Enter region: us-east-1
# Enter format: json
```

---

### Problem: "Don't know where to start"

**Solution:**
"Start with REPLIT_START_HERE.md, section 'STEP 0: GET THE API KEYS'. Follow the 6 main tasks in order. Task 1 is installing dependencies."

---

### Problem: "How do we deploy this?"

**Solution:**
"Read the 'Deployment Strategy' section in replit_handoff.md. We're deploying to existing AWS ECS. I'll help with deployment steps when code is ready."

---

### Problem: "What if we can't finish in 24 hours?"

**Solution:**
"Focus on the core: checkout endpoint + webhook + order storage. Stocky Butt's tools can be added after MVP works if we're tight on time. But aim to finish everything."

---

### Problem: "Stripe webhook isn't receiving events"

**Solution:**
```bash
# Test locally first with Stripe CLI
stripe listen --forward-to http://localhost:4000/api/discountpunk/webhooks/stripe

# In another terminal
stripe trigger payment_intent.succeeded

# Check webhook signature validation in code
```

---

### Problem: "Order isn't saving to S3"

**Solution:**
```bash
# Check S3 bucket access
aws s3 ls s3://ssbb-media-prod/discountpunk/orders/

# Check IAM permissions include s3:PutObject

# Check logs for errors
```

---

## 12PM CHECK-IN SCRIPT

**When 12pm arrives, message team:**

```
🕛 12pm Check-in

Quick status update:

1. What's working so far?
2. Any blockers or questions?
3. Where are you in the 7 main tasks?
4. Latest commit pushed to feature branch?
5. On track to finish by 7am tomorrow?

I can pull your latest code and test on my side if you want!

(Short answers fine - just want to make sure you're not stuck)
```

**Review their response:**
- If blocked: Help unblock immediately
- If on track: Pull their code and test deployment
- If behind: Re-prioritize (checkout + webhook first, Printful + tools can wait)

**Pull and test their code:**
```bash
cd /Users/karenkilroy/zorro_kilroy/discount-punk-checkout-test
./deploy-test.sh

# After deployment completes (~2 min):
curl https://ssbb.pretendo.tv/api/health
curl https://ssbb.pretendo.tv/api/discountpunk/content | jq

# Test new checkout endpoint (should exist if task 2 done):
curl -X POST https://ssbb.pretendo.tv/api/discountpunk/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productTitle":"Eat My Ass Tee","price":29.99,"size":"M","quantity":1}]}'

# Report results back to team
```

---

## 6PM CHECK-IN SCRIPT

**When 6pm arrives, message team:**

```
🕕 6pm Check-in

Getting close! Status check:

1. What's left to complete?
2. Can we test the checkout flow locally tonight?
3. What's the deployment plan for tomorrow morning?
4. Any concerns about hitting 7am deadline?

(Be honest - if we need to cut scope, let's decide now)
```

**Review their response:**
- If almost done: Plan for late night/early morning testing
- If behind: Cut non-critical features (Stocky Butt tools can wait)
- Plan deployment: ECS update vs. new service

---

## SPRINT END (May 3 @ 7:00 AM)

### Final Testing Checklist

```bash
# 1. Test shop loads
curl https://discountpunk.com/shop.html | grep "Eat My Ass Tee"

# 2. Test checkout endpoint exists
curl -X POST https://ssbb.pretendo.tv/api/discountpunk/checkout/create-session

# 3. End-to-end browser test
# Open: https://discountpunk.com/shop.html
# Click: Eat My Ass Tee
# Select: Size M
# Click: BUY NOW
# Enter test card: 4242 4242 4242 4242
# Verify: Success page shows BotButt's copy
# Check: Order in S3

# 4. Verify order saved
aws s3 ls s3://ssbb-media-prod/discountpunk/orders/

# 5. Test Stocky Butt can query (in SSBB chat)
# Ask BotButt: "Can Stocky Butt show me the orders?"
```

---

## POST-SPRINT TASKS (After First Order Works)

- [ ] Get webhook secret from Stripe dashboard
- [ ] Update AWS secret with webhook secret:
```bash
aws secretsmanager update-secret \
  --secret-id ssbb/stripe-printful \
  --secret-string '{"STRIPE_SECRET_KEY":"sk_test_...","STRIPE_PUBLISHABLE_KEY":"pk_test_...","STRIPE_WEBHOOK_SECRET":"whsec_YOUR_NEW_SECRET","PRINTFUL_API_KEY":"..."}' \
  --region us-east-1
```
- [ ] Redeploy ECS with new secret
- [ ] Create first Printful order manually
- [ ] Ship sample to yourself
- [ ] Verify quality
- [ ] Launch! 🚀

---

## CONTACTS & LINKS

**Your Info:**
- Email: [your email]
- Phone: [your phone]
- Timezone: [your timezone]

**Key URLs:**
- Shop: https://discountpunk.com/shop.html
- API: https://ssbb.pretendo.tv/api/discountpunk/content
- Stripe Dashboard: https://dashboard.stripe.com/test/payments

**Documentation:**
- Main docs: /Users/karenkilroy/zorro_kilroy/ssbb/docs/
- This file: /Users/karenkilroy/zorro_kilroy/ssbb/docs/karen_7am_replit_tasks.md

---

**You've got this, Karen. You did all the prep work. BotButt approved. Now let the team execute. 🔥**

**Questions? Slack me. Blocked? Call me. Otherwise, trust the process.**

**Let's ship a shirt! 🚀🤘**
