# Phyllis — Customer Guide

Everything you need to know as a shopper on a storefront powered by Phyllis.

**Note:** In chat, Phyllis introduces herself as "Phyllis"

---

## Shopping & Checkout

### How do I place an order?

Browse the storefront normally. When you add items to your cart and proceed to checkout, you will be taken to a Stripe-hosted checkout page. Stripe accepts all major credit and debit cards. Your shipping address is collected during checkout.

Supported shipping countries: **United States, Canada, United Kingdom, Australia**.

### Is my payment secure?

Yes. All payments are processed by [Stripe](https://stripe.com), one of the world's most trusted payment processors. Phyllis never sees or stores your card number. Stripe uses 256-bit TLS encryption and is PCI DSS Level 1 certified.

### What happens right after I pay?

1. Stripe confirms your payment.
2. Your order is automatically saved and enters the **merchant review** queue.
3. The merchant checks your design and shipping details.
4. After merchant approval, a Phyllis admin does a final quality check.
5. Once both approvals are complete, your order is sent to **Printful** for production and fulfillment.

This two-step review process exists to catch any design or address issues before your item is printed — it saves everyone time and prevents mistakes.

---

## Order Status

### What do the order statuses mean?

| Status | What it means |
|--------|---------------|
| **Pending client approval** | Your payment was received. The merchant is reviewing your order design. |
| **Pending admin approval** | The merchant approved it. A final quality check is in progress. |
| **Submitted to Printful** | Both approvals complete. Your item is in production. |
| **In production** | Printful is actively printing and assembling your order. |
| **Shipped** | Your item has left the facility. Tracking info is available. |
| **Rejected by client** | The design had an issue. The merchant will contact you or issue a refund. |
| **Rejected by admin** | A quality issue was found. You will be contacted. |

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

**My order has been in "pending client approval" for more than a day.**
The merchant may be reviewing a backlog. You can ask Phyllis for an update — she will tell you the exact status and flag it if something is stuck.

**I entered the wrong shipping address.**
Contact the storefront immediately. Once an order reaches "submitted to Printful" it may no longer be possible to change the address. Phyllis can tell you your current order status so you know whether there is still time to intervene.

**Can I order from outside the US/CA/GB/AU?**
Currently the checkout only supports those four countries. More may be added in future.
