# Phyllis Fills Integration Contract

**Status:** ✅ Production ready  
**Phyllis Instance:** https://phyllis-fills.replit.app  
**Client Slug:** `discount-punk`

## Product Catalog API

**Endpoint:**
```
GET https://phyllis-fills.replit.app/api/products?client_slug=discount-punk
```

**Response Format:**
```json
{
  "success": true,
  "products": [{
    "id": "48af1d28-20ab-4e9e-bc75-9e4e53dd887c",
    "title": "Eat My Donkey",
    "description": "Eat My Donkey", 
    "retail_price": "29.99",
    "printful_product_id": 430745217,
    "external_id": "discount-punk-4149b8b559c5",
    "mockup_urls": [
      "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/mockups/eat-my-donkey-mockup-0.png"
    ],
    "active": true,
    "created_at": "2026-05-02T18:37:50.848Z"
  }]
}
```

**UI Mapping:**
| UI Element | API Field | Transform |
|------------|-----------|-----------|
| Product image | `mockup_urls[0]` | Use directly |
| Product name | `title` | Use directly |
| Price | `retail_price` | Add "$" prefix |
| Product ID (for checkout) | `printful_product_id` | Pass to checkout |
| Visibility | `active` | Only show if `true` |

**Important Notes:**
- Do NOT hardcode `external_id` - it's for internal tracking only
- Use `printful_product_id` for checkout, not `id` or `external_id`
- Products with `active: false` should be hidden from shop

## Checkout Session API

**Endpoint:**
```
POST https://phyllis-fills.replit.app/api/discountpunk/checkout/create-session
```

**Request Body:**
```json
{
  "items": [{
    "productTitle": "Eat My Donkey",
    "productType": "tshirt",
    "imageUrl": "https://ssbb-media-prod.s3.amazonaws.com/discountpunk/mockups/eat-my-donkey-mockup-0.png",
    "size": "M",
    "quantity": 1,
    "price": 29.99
  }],
  "successUrl": "https://discountpunk.com/success.html",
  "cancelUrl": "https://discountpunk.com/shop.html"
}
```

**Field Details:**
- `items` (array, required) - Array of line items
  - `productTitle` (string, required) - Product name from catalog
  - `productType` (string, required) - One of: "tshirt", "poster"
  - `imageUrl` (string, required) - Mockup URL from `mockup_urls[0]`
  - `size` (string, required) - One of: S, M, L, XL, 2XL, 3XL
  - `quantity` (number, required) - Item quantity
  - `price` (number, required) - Price as number (not string with $)
- `successUrl` (string, required) - Redirect after successful payment (camelCase!)
- `cancelUrl` (string, required) - Redirect if customer cancels (camelCase!)

**Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Usage:**
```javascript
// Assuming you have product data from the catalog API
const product = {
  title: "Eat My Donkey",
  retail_price: "29.99",
  mockup_urls: ["https://ssbb-media-prod.s3.amazonaws.com/..."]
};

const res = await fetch("https://phyllis-fills.replit.app/api/discountpunk/checkout/create-session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: [{
      productTitle: product.title,
      productType: "tshirt",
      imageUrl: product.mockup_urls[0],
      size: "M", // from user selection
      quantity: 1,
      price: parseFloat(product.retail_price)
    }],
    successUrl: "https://discountpunk.com/success.html",
    cancelUrl: "https://discountpunk.com/shop.html"
  })
});
const { url } = await res.json();
window.location.href = url; // Redirect to Stripe Checkout
```

## Order Fulfillment Workflow

**Automatic fulfillment flow:**

```
1. Customer completes Stripe checkout
   ↓
2. Stripe webhook → Phyllis saves order & submits to provider
   Status: sent_to_printful (or provider_pending for new providers)
   ↓
3. Provider (Printful/theprintspace) processes order
   - They handle quality checks
   - They verify addresses
   - They manage production
   ↓
4. Provider produces and ships
   ↓
5. Customer receives order (3-5 business days)
```

**What customers see:**
- Order confirmation immediately after payment
- Email from Stripe with receipt
- Tracking info once order ships from the provider

## Pricing

- **First 10 orders/month:** FREE
- **After 10 orders:** $1.50 per order
- **No upfront costs, no monthly fees**

Cost breakdown:
- Phyllis: $1.50/order (after 10 free)
- Printful: ~$15-20/shirt (production + shipping)
- Stripe: 2.9% + $0.30 per transaction

Example: $29.99 shirt
- Customer pays: $29.99
- Stripe fee: ~$1.17
- Phyllis fee: $1.50 (after 10 free orders)
- Printful cost: ~$18
- Your margin: ~$9.32

## Error Handling

**Product catalog fetch fails:**
- Show generic "Failed to load products" message
- Don't crash the page
- Log error to console for debugging

**Checkout creation fails:**
- Alert user: "Checkout failed. Please try again."
- Re-enable buy button
- Don't leave button in "Loading..." state

**Common failure modes:**
- Size not selected → Validate before API call
- Network timeout → Show retry option
- Invalid product ID → Should never happen if using catalog API

## Testing

**Test Product:**
- Title: "Eat My Donkey"
- Price: $29.99
- Printful ID: 430745217

**Test Card (Stripe):**
- Number: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits
- Name: Any name

**Test Flow:**
1. Load shop → Should see Eat My Donkey product
2. Select size → Button should be enabled
3. Click BUY NOW → Should redirect to Stripe
4. Enter test card → Complete payment
5. Redirect to success.html → Order saved and automatically submitted to provider

## Current Deployment

**Site:** https://red-water-05c15131e-preview.westus2.7.azurestaticapps.net  
**Shop:** https://red-water-05c15131e-preview.westus2.7.azurestaticapps.net/shop.html

**Implementation:**
- ✅ Product catalog connected
- ✅ Size selector working
- ✅ Checkout integration complete
- ✅ Success/cancel pages created
- ✅ Field casing corrected (successUrl/cancelUrl)

**Ready to order!** The Eat My Donkey tee is live and orderable.

## Next Steps

1. **Add custom domain:** Point discountpunk.com to Azure Static Web App
2. **Add more products:** Use BotButt's `create_product_with_phyllis` tool
3. **Monitor orders:** Check Phyllis dashboard for order status
4. **Customer support:** Set up ops@discountpunk.com email

## Questions?

- **Can customers track orders?** Not yet - needs order tracking page
- **Can we add more products?** Yes - use BotButt in SSBB chat
- **What if design quality is bad?** Work with the provider (Printful/theprintspace) to resolve
- **Can customers change size after ordering?** Contact provider support
- **What about refunds?** Handle via Stripe dashboard + provider's refund process

The integration is complete and production-ready. Orders are automatically submitted to the fulfillment provider.
