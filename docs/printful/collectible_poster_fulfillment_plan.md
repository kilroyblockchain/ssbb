# Collectible Poster Fulfillment Plan

Date: May 2, 2026  
Project: Phyllis  
Primary use case: bot-generated collectible posters, comic covers, limited-edition art drops

## Recommendation

Use **theprintspace / creativehub** as the leading candidate for collectible poster and fine-art print fulfillment.

Reason:

```text
Collectible posters need provenance, not just printing.
```

Printful is a strong apparel and general POD provider. For collectible posters, the bigger problem is trust:

- Was this an official edition?
- Which number in the edition is this?
- Who created it?
- When was it issued?
- Is the certificate tied to the physical print?
- Can a collector verify it later?

Gemini's research recommendation points to theprintspace / creativehub because of automated Certificate of Authenticity support. That matters for Phyllis because bot-generated art can scale quickly, and at scale provenance becomes the product.

## Strategic Positioning

Phyllis should support multiple fulfillment providers by product category:

```text
Apparel / shirts:
  Printful

Collectible posters / fine-art drops:
  theprintspace / creativehub

General wall art fallback:
  Prodigi, PrintShrimp, Pwinty, or other API-capable providers
```

This means Phyllis should not be "a Printful wrapper." Phyllis should be a fulfillment orchestration layer.

Better framing:

```text
Phyllis routes bot-built products to the right fulfillment provider based on product type, quality requirements, provenance needs, geography, and cost.
```

## Why COA Matters

For normal merch, the buyer mostly cares that the item arrives and looks good.

For collectible posters, the buyer also cares that the print is part of a real edition.

Certificate of Authenticity support gives Phyllis a way to turn AI-generated art into a credible collectible object:

- edition number
- edition size
- title
- artist/agent attribution
- creation date
- print date
- certificate ID
- physical or digital certificate
- holographic or tamper-resistant protection if available
- verification URL or registry entry

This is especially important for BotButt and future creative agents because a bot can generate many designs quickly. Scarcity and provenance must be enforced operationally, not promised casually in product copy.

## Product Categories

### Open Edition Poster

Use when scarcity is not important.

Properties:

- unlimited sales
- print-on-demand
- no edition number required
- COA optional
- lower operational complexity

Good for:

- standard posters
- non-collectible wall art
- lower-price products

### Limited Edition Poster

Use when scarcity is part of the offer.

Properties:

- fixed edition size, e.g. 25, 50, 100, 300
- each order receives an edition number
- COA required
- edition registry required
- no overselling

Good for:

- BotButt comic covers
- launch drops
- signed-style collectible posters
- high-margin art products

### Collector Edition

Use for premium drops.

Properties:

- very small edition size, e.g. 10, 20, 50
- COA required
- premium paper/framing
- optional hand-signed or stamped certificate if provider supports it
- stronger verification and archival metadata

Good for:

- first issue covers
- rare event posters
- high-value AI art drops

## Phyllis Data Model Additions

Add collectible metadata to products and variants.

Product fields:

```json
{
  "productType": "collectible_poster",
  "edition": {
    "type": "limited",
    "size": 100,
    "sold": 0,
    "reserved": 0,
    "nextNumber": 1,
    "numberingMode": "sequential",
    "certificateRequired": true
  },
  "artist": {
    "name": "BotButt",
    "type": "agent",
    "agentId": "botbutt"
  },
  "provenance": {
    "sourcePromptHash": "optional",
    "designFileHash": "sha256...",
    "createdAt": "2026-05-02T13:00:00.000Z"
  },
  "fulfillment": {
    "provider": "theprintspace",
    "providerProductId": "optional",
    "paper": "giclee_fine_art",
    "framing": "none"
  }
}
```

Order item fields:

```json
{
  "productId": "botbutt-issue-001-poster",
  "editionNumber": 7,
  "editionSize": 100,
  "certificateId": "coa_discountpunk_001_007",
  "certificateStatus": "created",
  "fulfillmentProvider": "theprintspace",
  "providerOrderId": "..."
}
```

Certificate record:

```json
{
  "id": "coa_discountpunk_001_007",
  "siteId": "discountpunk",
  "productId": "botbutt-issue-001-poster",
  "orderId": "ord_123",
  "editionNumber": 7,
  "editionSize": 100,
  "title": "Eat My Donkey: Issue 001",
  "artistName": "BotButt",
  "designFileHash": "sha256...",
  "issuedAt": "2026-05-02T13:00:00.000Z",
  "verificationUrl": "https://phyllis.pretendo.tv/verify/coa_discountpunk_001_007",
  "provider": "theprintspace",
  "providerCertificateId": "..."
}
```

## Edition Reservation Flow

For limited editions, Phyllis must prevent overselling.

Recommended flow:

```text
1. Customer starts checkout.
2. Phyllis reserves next available edition number.
3. Reservation expires if checkout is abandoned.
4. Stripe payment succeeds.
5. Order enters pending_client_approval.
6. Client/admin approve.
7. Phyllis creates COA.
8. Phyllis submits fulfillment order.
9. Edition number becomes permanently issued.
```

Reservation status:

- `available`
- `reserved`
- `issued`
- `released`
- `voided`

Important:

```text
Do not issue the certificate permanently until payment succeeds.
Do not submit fulfillment until human approval passes.
```

## Human Approval For Collectibles

Collectible posters should use stricter approval than ordinary shirts.

Approval checklist:

- design file passes pixel/DPI requirements
- title is final
- edition size is correct
- product copy does not overpromise rarity
- paper/framing option is correct
- COA fields are correct
- edition number reservation is valid
- fulfillment provider supports selected configuration

Status flow:

```text
pending_checkout
reserved_edition
paid
pending_client_approval
pending_admin_approval
coa_pending
coa_created
fulfillment_submitting
submitted_to_provider
in_production
shipped
delivered
```

## Provider Abstraction

Phyllis should use a provider adapter interface.

Example:

```ts
type FulfillmentProvider = 'printful' | 'theprintspace' | 'prodigi' | 'printshrimp';

type FulfillmentAdapter = {
  provider: FulfillmentProvider;
  validateProduct(input: ProductFulfillmentInput): Promise<ValidationResult>;
  createProduct?(input: ProductFulfillmentInput): Promise<ProviderProductResult>;
  createOrder(input: ProviderOrderInput): Promise<ProviderOrderResult>;
  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;
  createCertificate?(input: CertificateInput): Promise<CertificateResult>;
};
```

Printful adapter:

- apparel
- standard POD products
- Sync Products and Sync Variants
- order creation and tracking

theprintspace / creativehub adapter:

- fine-art prints
- giclee posters
- framed prints
- limited editions
- certificate/provenance support

## API Additions

### Create Collectible Product

```http
POST /api/sites/:siteId/collectibles/products
```

Body:

```json
{
  "title": "Eat My Donkey: Issue 001",
  "description": "Limited collectible poster by BotButt",
  "designUrl": "https://...",
  "webImageUrl": "https://...",
  "edition": {
    "type": "limited",
    "size": 100,
    "certificateRequired": true
  },
  "artist": {
    "name": "BotButt",
    "type": "agent"
  },
  "format": {
    "size": "18x24",
    "paper": "giclee_fine_art",
    "framed": false
  },
  "providerPreference": "theprintspace"
}
```

### Verify Certificate

```http
GET /api/verify/:certificateId
```

Public response:

```json
{
  "valid": true,
  "title": "Eat My Donkey: Issue 001",
  "artist": "BotButt",
  "editionNumber": 7,
  "editionSize": 100,
  "issuedAt": "2026-05-02T13:00:00.000Z",
  "site": "Discount Punk"
}
```

Do not expose customer personal data on public certificate pages.

### Reserve Edition

```http
POST /api/sites/:siteId/products/:productId/edition/reserve
```

### Release Edition

```http
POST /api/sites/:siteId/products/:productId/edition/release
```

### Issue Certificate

```http
POST /api/sites/:siteId/orders/:orderId/certificate
```

## Customer Experience

Product page should explain:

- edition size
- edition number assignment
- certificate included
- print method
- paper/framing details
- fulfillment partner quality

Example copy:

```text
Limited edition of 100.
Each print includes a numbered Certificate of Authenticity tied to the physical edition.
Printed as archival fine art through our fine-art fulfillment partner.
```

Avoid:

- vague "rare" language with no edition cap
- claiming hand-signed if not actually hand-signed
- claiming museum-quality unless the provider/product supports it

## Phyllis Chat Behavior

Phyllis should be able to answer collectible-specific questions.

Customer:

```text
Is my poster numbered?
```

Phyllis:

```text
Status: certificate created.
Blocker: none.
Next action: fulfillment partner prints and ships the poster.
Evidence: edition 7 of 100, certificate coa_discountpunk_001_007.
```

Admin:

```text
How many copies of Issue 001 are left?
```

Phyllis:

```text
Status: active limited edition.
Blocker: none.
Next action: 93 copies remain available.
Evidence: 7 issued, 0 reserved, edition size 100.
```

## Research Questions For theprintspace / creativehub

Confirm before implementation:

- Is there a public API endpoint for COA creation?
- Can COAs be created programmatically per order?
- Can certificates include edition number and edition size?
- Can certificates include agent/artist attribution?
- Are holographic certificates available through API or manual workflow only?
- Can certificate verification URLs point to Phyllis?
- Can order metadata include Phyllis certificate IDs?
- Can fulfillment be white-labeled?
- What are supported print sizes and papers?
- What are required DPI and color profile specs?
- What are sample costs and shipping timelines?
- Is there sandbox/test mode?
- Are there webhooks for production/shipping status?

## Sprint Impact

Do not derail the current Printful/Stripe sprint to fully integrate theprintspace today.

For today's sprint:

- document the provider strategy
- keep Phyllis provider-agnostic
- make product/order records support `fulfillmentProvider`
- make future COA fields possible
- do not hard-code everything as Printful-only

After sprint:

1. Contact/research theprintspace API and COA support.
2. Request sample pack.
3. Create one test collectible poster product.
4. Validate certificate workflow.
5. Add theprintspace adapter.
6. Add public certificate verification page.
7. Launch first limited BotButt poster drop.

## Recommendation Summary

Use Printful for shirts and general merch.

Use theprintspace / creativehub as the leading candidate for collectible posters because certificate/provenance support is strategically more important than commodity poster pricing.

Build Phyllis so provider selection is flexible:

```text
product type + quality needs + provenance needs -> fulfillment provider
```

That is how Phyllis becomes fulfillment infrastructure, not a wrapper around one vendor.
