# 🚀 7AM SPRINT START CHECKLIST

**Date:** May 2, 2026 @ 7:00 AM  
**Duration:** 24 hours  
**Goal:** One product → One checkout → One paid order

---

## ✅ PRE-SPRINT (Completed May 1)

- [x] Stripe account with test keys
- [x] Printful account with API key
- [x] AWS Secrets Manager configured (`ssbb/stripe-printful`)
- [x] Shop page with buy buttons & size selectors
- [x] "We ASS-cept" footer
- [x] Eat My Ass Tee at position 0
- [x] DNS fixed
- [x] BotButt approval received ✅

---

## 📋 7AM HANDOFF TO REPLIT TEAM

### 1. Share Documentation (5 min)
- [ ] Send link to GitHub repo or share `/docs` folder
- [ ] Point team to: **REPLIT_START_HERE.md** (main entry point)
- [ ] Highlight: **BOTBUTT_APPROVAL.md** (her sign-off + requirements)

### 2. Share AWS Secret Access (3 min)
- [ ] Provide secret name: `ssbb/stripe-printful`
- [ ] Provide region: `us-east-1`
- [ ] Confirm team has AWS IAM access to read secrets
- [ ] Test command: 
```bash
aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful --region us-east-1
```

### 3. Brief Team on Critical Requirements (5 min)
**Say this:**
- "BotButt approved everything with two critical additions:"
  1. **Webhook error logging MUST be loud** - No silent failures
  2. **Success page copy:** "Your order is in. It's gonna be so good."
- "The 300 DPI gate is non-negotiable - don't soften it under time pressure"
- "Focus only on Eat My Ass Tee - everything else is Phase 2"

### 4. Provide Access & Credentials (5 min)
- [ ] AWS console access (if needed)
- [ ] GitHub repo access
- [ ] Confirm team can access: `s3://ssbb-media-prod/`
- [ ] Confirm team can deploy to AWS ECS (or clarify deployment target)

### 5. Set Communication Channel (2 min)
- [ ] Establish check-in schedule (suggest: 12pm, 6pm)
- [ ] Provide your contact method (Slack, email, phone)
- [ ] Share timezone (your time vs. their time)

---

## 🎯 TEAM'S 6 MAIN TASKS (Reference)

Point team to these in order:

1. **Install dependencies:** `npm install stripe@^14.0.0 sharp`
2. **Add secret hydration:** Update `secrets.ts` and `index.ts`
3. **Create checkout endpoint:** `/api/discountpunk/checkout/create-session`
4. **Create webhook handler:** `/api/discountpunk/webhooks/stripe` (with LOUD error logging)
5. **Add Stocky Butt's tools:** Update `provider.ts`
6. **Create success page:** `checkout/success.html` with BotButt's copy

---

## 📞 DURING SPRINT (Your Role)

### 12pm Check-In
- [ ] Ask: "What's working? What's blocked?"
- [ ] Review: Any questions about requirements?
- [ ] Confirm: Webhook error logging is loud?

### 6pm Check-In
- [ ] Ask: "What's left for tomorrow morning?"
- [ ] Review: Can we test locally tonight?
- [ ] Plan: Deployment strategy for 7am tomorrow

### As Needed
- [ ] Answer questions about brand voice
- [ ] Clarify BotButt's requirements
- [ ] Provide additional Stripe/Printful account access if needed

---

## 🔥 TROUBLESHOOTING (Have Ready)

### If: "We can't access AWS secrets"
**Fix:** Check IAM permissions, provide read-only secret access

### If: "Stripe keys aren't working"
**Check:** 
```bash
aws secretsmanager get-secret-value --secret-id ssbb/stripe-printful --region us-east-1 --query SecretString --output text | jq
```
Verify keys are test mode (`sk_test_...`, `pk_test_...`)

### If: "Where does this deploy?"
**Answer:** AWS ECS (existing backend at ssbb.pretendo.tv) - see deployment section in replit_handoff.md

### If: "What about Printful integration?"
**Answer:** Manual for MVP - we'll create the first Printful order by hand after payment works

### If: "Should we add [feature X]?"
**Answer:** Not unless it's in the 6 main tasks. MVP only. Phase 2 after first order ships.

---

## 🎉 SUCCESS CRITERIA (End of Sprint)

By May 3 @ 7:00 AM:

- [ ] Customer can visit discountpunk.com/shop.html
- [ ] Customer can click "Eat My Ass Tee"
- [ ] Customer can select size and click "BUY NOW"
- [ ] Customer redirects to Stripe Checkout
- [ ] Customer can enter test card: `4242 4242 4242 4242`
- [ ] Customer sees success page with BotButt's copy
- [ ] Order JSON appears in `s3://ssbb-media-prod/discountpunk/orders/`
- [ ] Stocky Butt can call `get_orders()` and see the order
- [ ] Webhook logs show successful event processing (or LOUD errors)

**Then:** Manual Printful order → Ship to Karen → Verify quality → Launch! 🔥

---

## 📁 QUICK LINKS

- **Main docs:** `/Users/karenkilroy/zorro_kilroy/ssbb/docs/`
- **Repo:** `/Users/karenkilroy/zorro_kilroy/ssbb/`
- **Frontend:** `/Users/karenkilroy/zorro_kilroy/discountpunk.com/`
- **AWS Secret:** `ssbb/stripe-printful` (us-east-1)
- **Test card:** `4242 4242 4242 4242`

---

## 💬 KEY QUOTES TO SHARE

**From BotButt:**
> "Karen absolutely went off. She did not miss a single thing."

> "The 300 DPI gate is non-negotiable. Do not soften this gate under time pressure tomorrow."

> "Webhook error logging needs to be loud. Silent failures will hurt us."

> "Sprint is a go. Let's not relitigate it — let's just win it. 🔥🤘"

---

**You've got this. BotButt approved. Documentation is tight. Keys are secure. Let's ship a shirt.** 🚀
