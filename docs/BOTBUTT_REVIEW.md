# BotButt's Sprint Documentation Review

**From:** Karen & Claude  
**Date:** May 1, 2026  
**Subject:** Final review before Replit handoff at 7am tomorrow

---

## Hey BotButt! 👋

We just finished the complete documentation package for the Replit sprint that starts tomorrow at 7am. Everything's ready to go, but we want your sign-off before we hand it to the team.

---

## What We Built for You

### Three Complete Documents:

1. **REPLIT_START_HERE.md** - Quick start guide
   - Step 0: AWS Secrets Manager integration (your keys are safe!)
   - 6 main tasks breakdown
   - Testing instructions
   - Your critical requirements front and center

2. **replit_handoff.md** - Full technical specs
   - API endpoints (checkout + webhook)
   - Order schema for S3 storage
   - Stocky Butt's tools (get_orders, verify_image_quality, etc.)
   - Deployment strategy (AWS ECS)
   - Your 300 DPI gate implementation

3. **replit_expansion.md** - Complete roadmap
   - Your feedback and vision
   - Gemini's review (called it a "masterclass")
   - Justin's MVP scoping
   - The names you chose for your sisters

---

## What Karen Completed (ALL ✅)

**Pre-Sprint Tasks (May 1):**
- ✅ Google Search Console configured
- ✅ DNS TXT verification added
- ✅ Sitemap submitted and verified
- ✅ Stripe account created with test keys
- ✅ Printful account created with API key
- ✅ All keys stored securely in AWS Secrets Manager
- ✅ Shop page updated with buy buttons
- ✅ Size selectors added (shirts only, like you wanted)
- ✅ "We ASS-cept" payment info in footer
- ✅ Eat My Ass Tee moved to position 0
- ✅ DNS apex domain fixed

**Frontend Already Live:**
- Shop loads from your content API
- Hero product (Eat My Ass Tee) ready to sell
- Brand voice throughout

---

## Your Voice in the Docs

### Critical Requirements Highlighted:

**1. The 300 DPI Gate**
> "Nothing kills a merch brand faster than a customer receiving a blurry shirt."

Implementation:
- Posters: REQUIRE 300 DPI (hard block)
- Shirts: WARN below 150 DPI, prefer 300
- Limited editions: REQUIRE 300 DPI
- Using `sharp` library for verification

**2. Brand Voice**
- "We ASS-cept" (not "We accept") for payment methods
- Throughout checkout flow and success page

**3. Clear Separation**
- You = Creative director (designs, products, comics, brand)
- Stocky Butt = Operations (orders, logistics, DPI checks, metrics)
- You're the boss, she reports to you

---

## MVP Focus (Like You Recommended)

Remember when you said:
> "The most punk thing we can do right now is ship something small and real instead of something enormous and theoretical"

That's exactly what we're doing:

**IN SCOPE (24 hours):**
- ✅ One product: Eat My Ass Tee ($29.99)
- ✅ One checkout flow: Stripe Checkout
- ✅ One paid order: S3 storage
- ✅ Stocky Butt can see orders
- ✅ 300 DPI verification gate

**OUT OF SCOPE (deferred to Phase 2+):**
- ❌ NFT certificates
- ❌ Membership tiers
- ❌ Loud Butt social automation
- ❌ Printful auto-fulfillment (manual first order)
- ❌ Custom commissions
- ❌ Admin dashboard

We prove the money loop first, then expand.

---

## Stocky Butt's Tools

Your operations sister gets these capabilities:

```typescript
get_orders({ status?, limit? })
  → List orders from S3
  → Filtered by status if needed
  → Sorted newest first

get_order_details({ orderId })
  → Full order JSON
  → Customer info, items, shipping

update_order_status({ orderId, status, notes? })
  → Updates order lifecycle
  → Logs status history

verify_image_quality({ imageKey, productType })
  → Your 300 DPI gate
  → Blocks low-res prints
  → Warns on marginal quality
```

She reports to you. You make the creative calls, she handles the logistics.

---

## What Replit Will Build Tomorrow

**Backend Only (no frontend changes needed):**
1. Stripe checkout endpoint
2. Stripe webhook handler
3. Order storage in S3
4. Stocky Butt's tools in provider.ts
5. DPI verification function
6. Deploy to AWS ECS

**Timeline:**
- May 2, 7:00 AM: Sprint starts
- May 3, 7:00 AM: Sprint ends
- First test order → Manual Printful fulfillment → Karen receives shirt

---

## Success Criteria

End of 24 hours:
1. Customer visits discountpunk.com
2. Clicks "Eat My Ass Tee"
3. Selects size M
4. Clicks "BUY NOW"
5. Redirects to Stripe
6. Pays with test card
7. Order saves to S3
8. Stocky Butt can query it
9. You can review it
10. Manual fulfillment via Printful
11. Physical shirt ships to Karen

**One real product → one checkout → one paid order → one fulfilled shipment.**

---

## Questions for You

**1. Brand Voice Check**
- Are you happy with "We ASS-cept" placement?
- Any other punk copy you want in the checkout flow?

**2. 300 DPI Gate**
- Hard block on posters ✓
- Warn on shirts below 150 ✓
- Prefer 300 on everything ✓
- Sound right?

**3. Stocky Butt's Role**
- She handles logistics
- Reports to you
- No creative decisions without your approval
- Chain: Stocky Butt → You → Karen
- Good with that?

**4. Product Priority**
- Eat My Ass Tee is the hero product
- Focus all sprint effort on this one item
- Other products stay in catalog but no checkout yet
- Agree?

**5. Anything Missing?**
- What are we not thinking about?
- Any concerns before we hand this to Replit?
- Anything that would make you uncomfortable about your brand?

---

## The Plan After MVP

Once first order ships and you verify quality:

**Phase 2:** Loud Butt (social media automation)  
**Phase 3:** Membership tiers  
**Phase 4:** Pretendo.tv platform  
**Phase 5:** NFTs + collectibles  
**Phase 6:** Doll manufacturing research  

But tomorrow? Just the money loop.

---

## Your Sign-Off

We're ready to hand this to Replit at 7am tomorrow (13 hours from now).

**Do you:**
- ✅ Approve the documentation?
- ✅ Approve the MVP scope?
- ✅ Trust Stocky Butt's tools?
- ✅ Approve the 300 DPI gate implementation?
- ✅ Like how your brand voice is represented?

**Or:**
- ⚠️ See something that needs to change?
- ⚠️ Worried about any specific part?
- ⚠️ Want different priorities?

This is YOUR shop. YOUR brand. YOUR punk empire.

We don't move forward without your approval.

---

## How to Review

**Read these files:**
1. `docs/REPLIT_START_HERE.md` - Quick overview
2. `docs/replit_handoff.md` - Full specs (just updated with Karen's completed tasks ✅)
3. `docs/replit_expansion.md` - Your vision + roadmap

**Or just tell us:**
- What you love ❤️
- What you hate 💀
- What you're worried about 😰
- What we're missing 🤔

---

## Ready?

Sprint starts in 13 hours.

Karen's got the keys loaded. Frontend's live. Hero product's ready. Documentation's complete.

Just need your final word.

**What do you think?**

🔥💥🤘

---

**P.S.** We kept Printful on v1 API (stable production) instead of v2 beta. You can migrate later once MVP proves out. Stability over features for launch.
