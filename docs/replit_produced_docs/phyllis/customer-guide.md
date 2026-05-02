# Phyllis — Customer Guide

Everything you need to know as a shopper on a storefront powered by Phyllis.

**Note:** In chat, Phyllis introduces herself as "Phyllis"

---

## Shopping & Checkout

> **Sprint testing note:** The Phyllis product/catalog path has been verified for Discount Punk, including the active "Eat My Donkey" product in the dashboard. The public Discount Punk **Buy Now** button still needs to be wired to the live checkout flow before casual shoppers should be sent through a full purchase test.

### How do I place an order?

Browse the storefront normally. When you add items to your cart and proceed to checkout, you will be taken to a Stripe-hosted checkout page. Stripe accepts all major credit and debit cards. Your shipping address is collected during checkout.

Supported shipping countries: **United States, Canada, United Kingdom, Australia**.

### Is my payment secure?

Yes. All payments are processed by [Stripe](https://stripe.com), one of the world's most trusted payment processors. Phyllis never sees or stores your card number. Stripe uses 256-bit TLS encryption and is PCI DSS Level 1 certified.

### What happens right after I pay?

1. Stripe confirms your payment.
2. Phyllis saves your order.
3. Phyllis submits the order to the right fulfillment provider.
4. For Printful shirts, the order appears as a draft/provider order in Printful.
5. The vendor dashboard remains the final production gate before anything is physically made.

This keeps checkout simple while still preserving a human production gate at the supplier/vendor level.

---

## Order Status

### What do the order statuses mean?

| Status | What it means |
|--------|---------------|
| **Paid** | Stripe confirmed your payment and Phyllis has the order. |
| **Submitting to provider** | Phyllis is sending the order to the fulfillment provider. |
| **Submitted to Printful / provider** | The order has been sent to the fulfillment provider. Production is confirmed by the provider status/vendor dashboard, not by Phyllis alone. |
| **Provider pending / manual fulfillment** | The product uses a supplier path that is not fully automated yet, such as collectible posters before the second supplier API is live. |
| **In production** | Printful is actively printing and assembling your order. |
| **Shipped** | Your item has left the facility. Tracking info is available. |
| **Cancelled / refunded** | The merchant cancelled or refunded the order. |

### How long does production take?

Printful's standard production time is **2–7 business days** after your order is submitted to them. Shipping time is on top of that and depends on your location and the shipping method selected.

### How do I track my order?

Ask Phyllis! Use the chat widget on the storefront (the button in the bottom corner of the page). Tell Phyllis your **order ID** or the **email address you used at checkout** and she will look up your order, report its current status, and give you tracking information if available.

Example questions you can ask Phyllis:
- "Where is my order? My email is jane@example.com"
- "What's the status of order abc12345?"
- "Has my shirt shipped yet?"

Phyllis will always respond with:
- **Status** — what is happening right now
- **Blocker** — anything preventing the next step (or "None")
- **Next action** — what happens next and who does it

---

## Returns & Refunds

Because every item is made to order (printed specifically for you), Phyllis storefronts follow Printful's policy:

- **Defective or damaged items**: Full replacement or refund. Contact the store within 30 days of delivery with a photo.
- **Wrong item received**: Full replacement or refund.
- **Buyer's remorse / size exchanges**: Not covered — please check the size guide carefully before ordering.
- **Lost in transit**: If tracking shows no movement for 10+ business days, contact the store for a resolution.

Contact the storefront directly or ask Phyllis to initiate a support request.

---

## Talking to Phyllis

Phyllis is the AI fulfillment agent embedded in the storefront. She has real-time access to your order data. She is not a generic chatbot — she can only see orders placed through this storefront and can only help with fulfillment-related questions.

**She can:**
- Look up your order status by email or order ID
- Tell you exactly where your package is (with tracking number if available)
- Explain what each status means in plain English
- Let you know if something is blocked and what needs to happen next

**She cannot:**
- Process refunds or cancellations (contact the store directly for those)
- See orders from other storefronts
- Access your payment information

### Privacy

When you chat with Phyllis, your messages may be sent to OpenAI's API for processing. No payment information is ever included in chat. Your email address, if you provide it, is used only to look up your order.

---

## Common Questions

**I paid but never got a confirmation email.**
Stripe sends a receipt to the email you entered at checkout. Check your spam folder. You can also ask Phyllis with your email address and she will confirm your order is in the system.

**My order says "provider pending" or "manual fulfillment."**
That means Phyllis has the order, but the supplier path needs manual handling or a supplier API is not fully live yet. Ask Phyllis for the blocker and next action.

**I entered the wrong shipping address.**
Contact the storefront immediately. Once an order reaches "submitted to Printful" it may no longer be possible to change the address. Phyllis can tell you your current order status so you know whether there is still time to intervene.

**Can I order from outside the US/CA/GB/AU?**
Currently the checkout only supports those four countries. More may be added in future.
