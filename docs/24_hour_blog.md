# 24 Hours With Phyllis

Date: May 2-3, 2026  
Sprint window: 24 hours  
Project: Phyllis, an LLM-to-customer fulfillment API

## Working Thesis

What if a bot could make a product and a customer could receive it without a human stitching together the boring middle?

That is the point of Phyllis.

BotButt can create the product. Phyllis can fill the order. A customer can buy the thing. Printful can print and ship it. The site can stay weird, loud, and alive while the operations layer behaves like infrastructure.

The contest build is not only a checkout integration. It is the first version of an automated creative-to-commerce pipeline:

```text
LLM creates product -> Phyllis validates it -> storefront sells it -> customer pays -> Phyllis submits fulfillment -> Printful ships
```

First client: Discount Punk.  
Longer vision: any bot-built shop can use Phyllis.

## One-Line Description

Phyllis enables end-to-end LLM-to-customer fulfillment: bots create products, Phyllis validates them, creates print-ready variants, and routes paid orders to production and shipping.

## Characters

**Karen**  
Project owner, builder, taste filter, and the person pushing the sprint forward.

**BotButt**  
Creative agent for Discount Punk. Generates products, voice, chaos, and commerce energy.

**Phyllis**  
Fulfillment API. She validates print files, creates Printful products, tracks orders, retries failures, and fills orders for bot-built shops.

**Discount Punk**  
The first storefront using Phyllis.

## Why Phyllis Exists

Bot-generated products are easy to imagine and hard to operationalize. The missing layer is not the product page. The missing layer is the boring but critical work:

- checking that the file can actually print
- creating the right Printful product and variants
- connecting paid orders to fulfillment
- tracking failures
- retrying recoverable operations
- keeping humans informed when automation needs help

Phyllis is that layer.

She is designed for bots like BotButt, but not limited to BotButt. She should be able to serve other sites and agents through an API.

## Sprint Goal

Build the full enchilada:

- API key structure
- `client_id` and `site_id` tracking
- product creation endpoint
- image/DPI validation
- Printful product/order integration
- Stripe checkout
- Stripe webhooks
- order persistence
- usage event logging
- visual dashboard
- failed-order visibility and retry

Deferred only if necessary:

- full Stripe Billing for Phyllis itself
- polished self-serve onboarding
- advanced teams/roles

## Pricing Direction

The intended pricing model is usage-based.

Rationale:

- no barrier to entry
- customers pay when they are making money
- aligns with fulfillment economics
- works for bots, developers, and small shops

Initial pricing idea:

```text
First 10 fulfilled orders/month: free
After that: $1.50 per fulfilled order
Possible later model: 5% of order value capped at $3/order
```

For the sprint, billing collection is out of scope. The important thing is to track usage events now so billing can be added later.

## Product Access Direction

Phyllis should eventually offer both:

1. API key access for bots, developers, and automated shops.
2. A dashboard for humans to inspect products, orders, failures, retries, and usage.

For this sprint, Karen decided to go for both. The dashboard should be operational, not decorative.

The dashboard needs to show:

- what came in
- what got created
- what got paid
- what got sent to Printful
- what failed
- what can be retried
- how much usage each client/site generated

## Technical Shape

Phyllis should be site-agnostic.

Every important record should carry:

- `client_id`
- `site_id`
- local product ID
- local variant ID
- local order ID
- Printful product/order IDs when available
- usage event IDs

Example future API shape:

```text
POST /api/sites/:siteId/products
POST /api/sites/:siteId/orders
POST /api/sites/:siteId/checkout/create-session
POST /api/sites/:siteId/webhooks/stripe
GET  /api/sites/:siteId/orders
GET  /api/sites/:siteId/usage
```

Sprint routes may be simpler, but the data model should already know about sites and clients.

## Critical Build Principles

1. Save local order records before relying on Printful.
2. Never let a paid Stripe order disappear.
3. If Printful fails, mark the order `printful_failed`.
4. Keep retry paths visible and operator-friendly.
5. Keep the 300 DPI gate.
6. Avoid putting mockup generation in the payment critical path.
7. Use durable public URLs for print files, not expiring presigned URLs.
8. Do not accidentally use `confirm=true` on Printful until intentionally fulfilling a real order.

## Timeline

### 2026-05-02 07:59 CDT

The sprint is underway.

Karen has Phyllis open in Replit. The first visible dashboard exists: black terminal-style design, live badge, endpoint list, DPI gate, and stack summary. It is still Discount Punk-centered, but the architecture conversation shifted Phyllis into something bigger:

```text
Phyllis is not only for Discount Punk.
Phyllis is fulfillment infrastructure for bot-built commerce.
```

Key naming decision:

- Stocky Butt became Phyllis.
- Meaning: "fill us."
- Job: fill orders.

Key domain decision:

- Use `phyllis.pretendo.tv` for now.
- Research a dedicated domain later.

Key positioning decision:

```text
LLM-to-customer fulfillment API
```

Key pricing decision:

- intended model: usage-based
- first 10 orders/month free
- then around $1.50/order
- no billing implementation today unless fulfillment core is already solid

Key product decision:

- Paying customers eventually get both API key access and a visual dashboard.
- Karen overrode the smaller phased plan and chose the full build for the sprint.

Current advice to Replit agent:

```text
Build the full enchilada, but layer it:
1. Fulfillment core works by API.
2. Every action logs client/site/order usage.
3. Dashboard reads those same records.
4. Retry failed orders from the dashboard.
5. Polish only after the loop is real.
```

### 2026-05-02 08:00 CDT

The Replit agent accepted the bigger Phyllis scope and mapped the build as a real multi-client product, not a single Discount Punk integration.

Current planned build:

- usage tracking with `site_id` and `client_id` on every product and order
- billable usage events logged to the database
- monthly usage counts per client
- super admin panel to add and manage clients
- Discount Punk as the first client
- client dashboard with API key, product creation, and order tracking
- dashboard cleanup, including removing the alternate visible webhook path
- footer/copy cleanup so Phyllis reads like infrastructure

The agent inspected the current files, then formed an implementation plan:

```text
DB schema:
  clients
  usage_events
  monthly_usage

API:
  API key middleware
  client_id attachment
  admin client-management routes
  client dashboard routes
  usage logging helpers

Dashboard:
  public landing page
  client login/API key entry
  client dashboard
  super admin panel
```

First implementation issue surfaced:

```text
drizzle-kit bundler could not resolve .js extensions from .ts schema files
```

Planned fix:

```text
Use .ts extensions in schema imports for the Drizzle schema push path.
```

This is a good sign. The agent is not just adding a pretty screen; it is laying the data model Phyllis needs to become reusable:

```text
client -> site -> product -> order -> usage event
```

The main thing to watch now is sequencing. The dashboard can grow quickly, but the source of truth must stay the API and database records. If the dashboard is reading real order/product/usage state, it helps the sprint. If it becomes static demo polish, it should wait.

### 2026-05-02 08:08 CDT

Phyllis has a production Replit deployment target:

```text
https://phyllis-fills.replit.app
```

Production settings visible at publish time:

- visibility: public
- geography: North America
- type: autoscale
- resources: 2 vCPU / 4 GiB RAM / 3 max
- production database connected

This is the first public home for Phyllis. The name works: `phyllis-fills` says what she does without locking her to Discount Punk.

Current dashboard positioning:

```text
PHYLLIS
Fulfillment infrastructure for bot-built commerce
```

That line is now stronger than the earlier Discount Punk-specific framing. Discount Punk remains the first client, not the product boundary.

### 2026-05-02 08:19 CDT

Karen expanded the product definition again:

```text
Phyllis should be an agent users can talk to.
```

Not just admins. Not just bots. Phyllis should be able to answer operational questions for admins, staff, and customers, grounded in the same order/product/usage records that power the API and dashboard.

Example user question:

```text
Phyllis, where is the Eat My Donkey order for Discount Punk for Joe Smith?
```

This changes the interface model:

```text
API -> dashboard -> conversational operations agent
```

Important product implication:

- The agent must query real records, not invent answers.
- Access control matters by role:
  - admins can ask across clients/sites
  - staff can ask within assigned sites
  - customers can ask only about their own orders
- Order lookup needs flexible search:
  - customer name
  - email
  - site
  - product title
  - local order ID
  - Stripe session/payment ID
  - Printful order ID
- Responses should include status, last update, fulfillment provider status, and next action if something failed.

This may not need full implementation today, but the data model should not block it. Add indexes/searchable fields now if possible.

### 2026-05-02 08:20 CDT

The fulfillment flow changed in a meaningful way: Phyllis should not auto-submit bot-generated orders to Printful immediately after Stripe payment.

New principle:

```text
Money can be accepted automatically. Physical fulfillment needs explicit approval.
```

Reason:

```text
We must be sure about the design before we order an item.
```

The Replit agent proposed and started building a two-stage approval flow:

```text
Stripe webhook
  -> save order as pending_client_approval
  -> do not submit to Printful

Client dashboard
  -> client approves or rejects

Client approves
  -> order becomes pending_admin_approval

Admin dashboard
  -> admin final-approves or rejects

Admin approves
  -> submit to Printful
  -> order becomes submitted_to_printful

Reject
  -> order becomes rejected
  -> refund handled manually in Stripe for now
```

Approval rules decided:

- client approval first
- admin final approval second
- no auto-approval timeout
- rejected orders are marked rejected
- refunds are manual in Stripe for this sprint
- the design/order can be fixed and put through again

This is the right tradeoff for bot-built products. It prevents an LLM-generated design or variant mistake from becoming a real physical order before a human has inspected it.

Important consequence for the story:

```text
Phyllis is not just automation. Phyllis is controlled automation with human checkpoints where physical goods and money are involved.
```

### 2026-05-02 08:26 CDT

BotButt began testing Phyllis.

The Replit agent then started implementing the conversational layer:

```text
Phyllis becomes a living operations agent.
```

Target behavior:

- customers can ask where their order is
- clients can approve/reject through chat
- admins can inspect and manage orders conversationally
- Phyllis can answer with real order/product/usage context

The agent pulled in AI integration scaffolding, then started wiring:

- TypeScript configs
- package dependencies
- database schema updates
- chat endpoint
- chat UI component
- route registration
- typechecks/builds

Current implementation snag:

```text
template library type errors:
- missing @types/node
- pRetry.AbortError API changed in p-retry v7
- React types needed for the React library package
```

This is normal integration friction. The important thing is that the conversational interface should stay grounded in real Phyllis records:

```text
chat answer = query operational data -> summarize status/action
```

Do not let the agent become generic support chat. Phyllis's value is operational specificity.

### 2026-05-02 08:35 CDT

Replit is now testing live multi-turn Phyllis chat.

The product definition sharpened again:

```text
Agents like BotButt should be able to actually chat with Phyllis.
```

This means Phyllis is not only:

- an API
- a dashboard
- a fulfillment worker

She is also an agent-to-agent operations coordinator.

Current examples:

```text
BotButt: "Phyllis, how many orders are pending?"
Phyllis: "You have 3 orders pending approval."

Customer: "Phyllis, where is the Eat My Donkey order for Joe Smith?"
Phyllis: "Order #123 is in production at Printful..."

Admin: "Phyllis, approve all Discount Punk orders."
Phyllis: "Approved 3 orders and submitted them to Printful."
```

This is a major shift in story terms:

```text
Phyllis coordinates between creative agents, humans, payment systems, and fulfillment providers.
```

Replit has reportedly updated documentation for:

- AI chat guide
- human approval workflow
- agent-to-agent communication
- order statuses and approval flow
- multi-role access: customer, client, admin

Next technical pressure point:

```text
Printful status and tracking integration.
```

For chat to be credible, Phyllis needs real fulfillment state:

- local approval state
- local order state
- Printful order state
- shipment/tracking info when available
- failure reason and next action

The Replit agent started reading the Printful integration and Phyllis routes to plan status/tracking support.

### 2026-05-02 08:35 CDT

Current technical hardening step:

```text
Phyllis chat needs operational structure and real Printful lookup.
```

Two changes are underway:

1. Rewrite the system prompt so Phyllis answers in an operational format:

```text
status -> blocker -> next action
```

2. Add a real Printful status/tracking lookup tool.

This is the right correction. A conversational fulfillment agent should not answer like a general chatbot. It should answer like an operations coordinator:

```text
Status: pending_admin_approval.
Blocker: waiting for final approval before Printful submission.
Next action: admin should review the design and approve or reject.
```

For shipped orders, the answer should eventually include:

```text
Status: shipped.
Blocker: none.
Next action: customer can track shipment with carrier link.
Tracking: ...
```

The quality bar is simple:

```text
If Phyllis cannot query it, Phyllis should not claim it.
```

### 2026-05-02 08:44 CDT

The next product layer is client-configurable chat.

Karen clarified the expected admin model:

```text
All this should be configurable in the admin panel.
You should be able to say: here is my chat API for my site, like discountpunk.com.
```

Replit translated that into a concrete implementation plan:

```text
DB:
  allowedDomains column on clients table

API:
  GET /api/me/chat-config
  PUT /api/me/chat-config
  POST /api/chat/:clientSlug

Chat route:
  validates Origin against the client's allowed domains
  scopes all answers by clientSlug/site

Phyllis core:
  multi-client order loading
  exported core functions
  clientSlug scoping

Dashboard:
  Chat API tab
  endpoint URL
  domain allowlist
  embed snippet
```

This matters because it turns Phyllis chat from a single internal admin toy into a product feature:

```text
Each client gets its own scoped Phyllis chat API.
```

For Discount Punk, that means the site can embed or call:

```text
POST /api/chat/discountpunk
```

and Phyllis can answer customer questions without leaking other clients' orders.

Security rule:

```text
Client chat must be scoped by client/site and constrained by allowed domains.
```

### 2026-05-02 08:50 CDT

The client-specific chat API work is now testing cleanly.

Replit reports:

- database migrated with `allowedDomains`
- public chat route added
- `GET /api/me/chat-config`
- `PUT /api/me/chat-config`
- `POST /api/chat/:clientSlug`
- origin enforcement working
- allowed origin reaches Phyllis
- server build passing
- dashboard has a Chat API tab with endpoint, allowlist, and embed snippet

The important implementation detail:

```text
Phyllis chat is scoped by clientSlug and allowed domains.
```

This is what makes the chat API a real per-client product feature rather than a global support widget.

Karen provided the GitHub repo target:

```text
git@github.com:kilroyblockchain/phyllis.git
```

Replit should push the Phyllis project there.

### 2026-05-02 09:34 CDT

Naming refinement:

```text
Marketing/product name: Phyllis
Chat/persona name: Phyllis Fills is acceptable in conversation
Domain/deploy slug: phyllis-fills
```

The marketing site should lead with:

```text
Phyllis
Fulfillment infrastructure for bot-built commerce
```

Reason:

```text
"Phyllis" is cleaner as a brand. "Phyllis Fills" can remain the wink inside the agent personality.
```

### 2026-05-02 08:57 CDT

Gemini researched providers similar to Printful for collectible posters and fine-art fulfillment.

Recommendation:

```text
theprintspace / creativehub
```

Reason:

```text
Certificate of Authenticity support matters more than commodity poster pricing for collectibles.
```

This adds a new strategic layer to Phyllis:

```text
Phyllis should route products to the right fulfillment provider by product type.
```

Provider strategy:

```text
Shirts/general merch -> Printful
Collectible posters/fine-art drops -> theprintspace / creativehub
```

Why it matters:

- Bot-generated art can scale fast.
- Collectors need provenance.
- Limited editions need edition numbers, certificate IDs, and verification.
- Phyllis should enforce scarcity operationally, not merely describe it in product copy.

A dedicated plan was added:

```text
docs/printful/collectible_poster_fulfillment_plan.md
```

### 2026-05-02 09:12 CDT

The sprint moved into documentation mode.

Replit is creating three separate documentation tracks:

```text
User-side documentation
  For end customers using the storefront, checkout, order tracking, and Phyllis chat.

Client/admin-side documentation
  For shop owners and staff using the Phyllis dashboard, approvals, API keys, usage, and chat config.

Technical documentation
  For developers implementing against Phyllis: API reference, architecture, database schema, deployment, and secrets.
```

The agent first read route definitions, database schema, and dashboard structure so the docs reflect the actual system rather than the plan.

This matters because Phyllis now has several audiences:

- customers asking about orders
- clients approving products/orders
- admins supervising fulfillment
- bots integrating through API keys
- developers wiring storefronts and chat endpoints

The docs need to keep those roles separate, or Phyllis will feel more complicated than she is.

### 2026-05-02 09:26 CDT

Testing-plan feedback is being applied.

Fixes underway:

- remove full API keys from docs
- correct poster DPI threshold to 300 DPI
- add approval state transition API tests
- add Stripe webhook signature tests
- add "no record, no claim" chat tests
- clarify Origin allowlist behavior
- make Printful submission warnings louder
- update technical reference to match actual poster DPI code

Confirmed from code:

```text
poster gate = 300 DPI
```

Next product question surfaced:

```text
How does someone go from the Phyllis website to paying on Stripe and getting their API key?
```

This is the onboarding path from marketing site to paid client.

### 2026-05-02 09:30 CDT

Replit is now handling two tracks in parallel:

1. Finish documentation corrections.
2. Build the self-serve onboarding flow.

Documentation fixes being applied:

- remove seeded credentials from client/admin guide
- correct stale poster DPI references
- mark unauthenticated `/api/orders/submit` as dev/internal or secure it
- clarify MVP rejection does not automatically trigger Stripe refunds
- distinguish `submitted_to_printful` from true production state
- verify documented model names against implementation
- keep shipping-country documentation tied to actual Stripe checkout config

Onboarding design:

```text
Marketing CTA
  -> Stripe setup Checkout
  -> Stripe webhook creates Phyllis client
  -> generated API key stored
  -> success page polls/loads setup result
  -> API key shown once
  -> client enters dashboard
```

Important security decision:

```text
The webhook is the source of truth for client creation, not the success redirect.
```

The success page may load before the webhook finishes, so it should show a setup/polling state until the client record exists.

MVP billing approach:

```text
Use Stripe setup mode to capture payment method without charging immediately.
```

This supports the intended usage-based model while keeping today's sprint focused on access, API keys, and usage tracking rather than full Stripe Billing.

### 2026-05-02 09:32 CDT

Onboarding implementation is moving from design into code.

Replit reports:

- documentation fixes are being applied
- onboarding backend routes are being added
- webhook flow will create clients/API keys from Stripe onboarding sessions
- frontend onboarding form and success page are being added
- dashboard app will detect onboarding URLs
- marketing CTAs are being wired into the onboarding flow
- servers are being restarted for testing

Key architecture:

```text
Phyllis onboarding is separate from Discount Punk checkout.
```

That separation matters. Discount Punk checkout creates customer orders. Phyllis onboarding creates platform clients.

Expected route shape:

```text
POST /api/onboarding/create-checkout-session
GET  /api/onboarding/session/:sessionId
POST /api/webhooks/stripe
```

Stripe metadata should distinguish:

```text
flow=phyllis_onboarding
```

from:

```text
flow=discountpunk_order
```

The success page should never be the only thing that creates the account. It should read the account created by the webhook, or poll until the webhook finishes.

### 2026-05-02 09:35 CDT

Testing plan and technical reference cleanup landed in the local docs mirror.

Final fixes applied:

- Printful admin approval warning now says dry-run is not implemented and admin-approve must not be automated.
- Stripe webhook idempotency is marked as a pre-launch blocker.
- Duplicate checkout/session order creation is tied to the same idempotency fix.
- Origin-less chat requests now have explicit mitigation: rate limit `/api/chat/:slug` and require `customerEmail` or `orderId` for customer-scoped lookups.
- Technical reference Products section now matches the real DPI policy:

```text
shirt: reject below 150 DPI, warn below 300 DPI
poster: reject below 300 DPI
```

- `/api/orders/submit` is explicitly marked internal/dev-only until authenticated, firewalled, or removed.

### 2026-05-02 09:39 CDT

Unit tests are now in place.

Replit reports:

```text
58 tests
3 files
all green in 1.57s
```

Test suites added:

```text
src/__tests__/dpi.test.ts                 20 tests
src/__tests__/orderTransitions.test.ts    19 tests
src/__tests__/onboardingValidation.test.ts 19 tests
```

Important implementation choice:

```text
Extract pure functions first, then test without mocks.
```

Code structure added:

- `checkDpiThresholds(dpi, productType)` extracted from image I/O.
- `canTransition(status, action)` added as a pure order state machine.
- onboarding Zod schema tested directly.

Covered:

- DPI boundary values
- null/missing DPI metadata
- shirt warning/pass/reject behavior
- poster hard gate at 300 DPI
- approval transition validity
- wrong-state error message format
- onboarding company name, slug, and email validation

Command:

```text
pnpm --filter @workspace/api-server run test
```

Next planned test expansion:

- Stripe webhook signature and idempotency
- tenant scoping
- Origin allowlist behavior
- Printful retry behavior

### 2026-05-02 09:41 CDT

Replit started the second unit-test expansion by extracting more policy logic into pure functions.

Planned extractions:

```text
chatEmbed.ts
  -> originAllowed()
  -> fix no-Origin server-to-server behavior

orderRecord.ts
  -> buildOrderFromSession()
  -> pure Stripe session to local order mapping

orderFilter.ts
  -> shouldIncludeInPendingQueue()
  -> pure tenant/admin queue filtering

printful.ts
  -> shouldRetryPrintful()
  -> retry network/429/5xx, do not retry hard 4xx
```

Then add four test suites:

- Stripe webhook/order mapping and idempotency policy
- tenant scoping/pending queue filters
- Origin allowlist behavior
- Printful retry policy

This is good engineering for the sprint because the riskiest logic is becoming small and testable:

```text
policy as pure functions, side effects in routes/adapters
```

### 2026-05-02 09:51 CDT

Phyllis is being made LLM-discoverable.

This matters because Phyllis is an API for agents. If bots and LLMs are going to integrate with her, the marketing site should not only persuade humans; it should also explain the API clearly to machines.

Replit's LLM-discovery plan:

```text
/llms.txt
  concise LLM-facing product/API summary

/llms-full.txt
  complete endpoint and integration reference

/openapi.json or /api-spec.json
  machine-readable OpenAPI spec

/robots.txt
  crawler policy, including AI crawlers if desired

index.html metadata
  meta tags
  OpenGraph data
  discovery links
  JSON-LD structured data
```

This is especially aligned with the product:

```text
Phyllis is fulfillment infrastructure for bot-built commerce.
Bots should be able to discover, understand, and call her API.
```

The important quality bar:

```text
An LLM should be able to read the public docs and know:
- what Phyllis does
- how to authenticate
- which endpoint creates products
- which endpoint submits orders
- how chat endpoints are scoped
- what approval states mean
- what not to automate, especially Printful admin approval
```

### 2026-05-02 10:03 CDT

Justin reframed the LLM-discoverability work.

This is not just marketing metadata. It is safety documentation for autonomous agents.

The missing bar is explicit operational restraint:

```text
An LLM agent must know what not to automate.
```

The most important rule:

```text
Do not automate final admin approval.
```

Reason:

```text
Admin approval can submit a paid order to Printful/provider production.
That can create a physical product and spend real money.
```

Added a local source-of-truth checklist for Replit to mirror into the public marketing files:

```text
docs/printful/llm_discoverability_safety_checklist.md
```

The checklist covers required content for:

```text
/llms.txt
/llms-full.txt
/openapi.json
```

And sets a simple acceptance test:

```text
If a fresh LLM reads the public docs and says it can freely approve or submit physical orders, the docs failed.
```

## Decisions Log

### Name

Chosen: Phyllis

Reason:

- memorable
- sounds human
- joke still works in copy: Phyllis fills orders
- better than Stocky Butt for a reusable SaaS/API product

### Domain

Chosen for now:

```text
phyllis.pretendo.tv
```

Dedicated domain research deferred.

### Product Category

Chosen:

```text
LLM-to-customer fulfillment API
```

### First Client

Chosen:

```text
discountpunk.com
```

### Pricing Model

Chosen direction:

```text
usage-based per fulfilled order
```

Billing implementation deferred, but usage tracking should be built now.

### Access Model

Chosen:

```text
API key + visual dashboard
```

## Running Notes

- Phyllis should feel like reliable infrastructure with a wink.
- Discount Punk can keep the full punk voice.
- "We ASS-cept" belongs on Discount Punk checkout pages, not necessarily on Phyllis's API dashboard.
- Phyllis dashboard copy should be clear, operational, and credible.
- Do not over-polish a dashboard that cannot retry failed orders.

## Blog Draft Angle

Possible title:

```text
We Built an LLM-to-Customer Fulfillment API in 24 Hours
```

Possible opening:

```text
At 8 AM, Phyllis was a joke about filling orders. By the end of the sprint, she was becoming the infrastructure layer for bot-built commerce.
```

Core story:

```text
The hard part of AI commerce is not making a weird shirt. The hard part is making sure the shirt can print, the customer can pay, the order does not vanish, the fulfillment provider gets the right file, and a human can recover the system when something fails. Phyllis is our answer to that middle layer.
```

## Next Updates To Capture

- Replit app URL once published
- first successful health check
- first product creation request
- first DPI validation result
- first Printful product created
- first Stripe checkout session created
- first webhook received
- first order saved
- first Printful order submitted
- first dashboard retry/failure path
- screenshots of dashboard
- final architecture diagram

### 2026-05-02 09:58 CDT

We clarified the 300 DPI image path.

Current truth:

```text
BotButt can create a real product with Phyllis if it already has a 300 DPI design URL.
BotButt does not yet generate a new 300 DPI print file from scratch.
```

The known-good asset remains:

```text
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png
```

Local BotButt code has a `generatePrintDesign` function and product presets for 300 DPI canvases, but the function currently returns:

```text
Image generation not yet implemented. Please use an existing 300 DPI design URL with Phyllis directly.
```

So the sprint test plan is now split into two tracks:

1. Test today's implemented flow: existing 300 DPI S3 URL -> BotButt -> Phyllis -> Printful product.
2. Define acceptance tests for the future flow: BotButt generates/stamps/uploads a real 300 DPI PNG before asking Phyllis to create the product.

Added detailed plan:

```text
docs/printful/300dpi_image_test_plan.md
```
