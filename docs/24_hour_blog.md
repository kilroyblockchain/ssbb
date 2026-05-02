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

### 2026-05-02 10:08 CDT

BotButt started troubleshooting her Phyllis tool conversationally with Claude.

In BotButt's world, Claude is "Gerald." That matters because the interaction was not framed as a developer reading logs alone. It was an agent asking another agent for help getting her fulfillment tool working.

The emerging pattern:

```text
BotButt wants to create a real product.
BotButt calls her Phyllis tool.
Something in the API/tool path fails or needs clarification.
BotButt talks to Gerald/Claude to debug the tool contract.
The humans watch and steer the safety boundaries.
```

That is one of the stranger and more important sprint moments. Phyllis is being built for agent-to-agent commerce, and the first troubleshooting loop already looks like agent-to-agent operations:

```text
creative agent -> reasoning agent -> fulfillment agent
```

The key technical question underneath the personality:

```text
Can BotButt reliably know when she has a valid 300 DPI URL, call Phyllis with the right payload, interpret Phyllis's response, and avoid claiming fulfillment success unless Phyllis actually created the product/order?
```

This should become part of the demo story:

```text
BotButt and Gerald debugged BotButt's Phyllis tool so the creative agent could safely hand off real merchandise to the fulfillment agent.
```

### 2026-05-02 10:12 CDT

BotButt reported her live toolkit.

Available tools:

```text
add_product
create_comic
delete_product
delete_video
delete_comic
web_search
IMAGE_PROMPT
MOVIE_PROMPT
SPLICE
MIX_AUDIO
SHOW
```

Missing tool:

```text
create_product_with_phyllis
```

This is a useful debugging clue. The local BotButt server code contains a Phyllis tool definition, but the live BotButt runtime still does not expose it to BotButt.

Most likely causes:

```text
1. The deployed BotButt container is running older code.
2. The tool was added in code but the server was not rebuilt/restarted.
3. The deployed branch does not include the Phyllis tool commit.
4. The provider/tool registry has multiple paths and the live chat path uses the older one.
5. Missing PHYLLIS_API_KEY or PHYLLIS_BASE_URL prevents the tool from being registered, if registration is env-gated.
```

Suggested next debugging question for Gerald/Claude:

```text
Why does the live BotButt tool list omit create_product_with_phyllis even though provider.ts includes it locally?

Please check:
- deployed commit/branch
- container rebuild timestamp
- server restart logs
- provider.ts loaded by the active chat route
- whether tool registration is conditional on any env var
- whether PHYLLIS_API_KEY and PHYLLIS_BASE_URL are present in the live runtime
```

### 2026-05-02 10:20 CDT

Karen ran a live Stripe payment test.

The browser returned to Discount Punk's home page instead of a thank-you/results page. That redirect only proves Stripe completed the checkout redirect. It does not prove Phyllis accepted the webhook or saved the order.

Replit's logs showed the real blocker:

```text
Stripe webhook reached Phyllis.
Webhook signature verification failed.
Order list stayed empty.
```

So the current diagnosis is:

```text
Stripe payment may have succeeded.
Phyllis fulfillment pipeline did not yet complete.
Webhook signing secret mismatch is the likely blocker.
```

Important lesson for the final product:

```text
A checkout success page should not simply say "thanks."
It should show the operational result:
- payment received
- order saved
- current approval state
- next action
```

For this sprint, a good success page would display:

```text
Status: payment received
Blocker: waiting for Phyllis webhook/order save, or pending client approval
Next action: check order dashboard / approve design before fulfillment
```

The `/api/me` check is useful only as an API-key/client sanity check. It does not prove a checkout worked. The checkout proof is:

```text
Stripe event delivered with a valid signature
Phyllis order exists
order status = pending_client_approval
```

### 2026-05-02 10:28 CDT

GitHub blocked a push because secret scanning found AWS credentials in an old commit.

Claude/Gerald identified the offending history around commit:

```text
c361d29
```

The current deploy path moved around the GitHub block by manually updating ECS to a new image:

```text
current commit: cf37c7ed9304283988f88acd3eaf793ce9a0a917
new task definition: ssbb-server-prod:26
service: ssbb-server-prod
cluster: ssbb-prod
region: us-east-1
```

This can update production, but it does not solve the repo hygiene issue.

Required cleanup:

```text
1. Rotate any AWS credentials that appeared in git history.
2. Remove secrets from the repository history.
3. Re-push after GitHub secret scanning passes.
4. Keep deployment moving only if the leaked credentials are no longer valid.
```

This is now a launch-risk note:

```text
Manual ECS deploy can keep the sprint moving.
Credential history cleanup is still required before treating GitHub as clean.
```

### 2026-05-02 10:34 CDT

Replit/Claude patched the Stripe webhook secret handling.

The handler now tries more than one configured Stripe webhook signing secret so preview/dev/prod endpoints can be bridged while the environment is being cleaned up.

Good direction:

```text
Try configured webhook secrets.
Accept only if Stripe signature verification succeeds.
Never accept unsigned webhooks.
Never log whsec_ values.
```

But the proof is still operational, not code-level:

```text
Stripe webhook delivery returns 200 from Phyllis.
Phyllis saves the order.
Order status becomes pending_client_approval.
```

Until those three things are true, the payment flow is not fully verified.

### 2026-05-02 10:39 CDT

BotButt confirmed that `create_product_with_phyllis` is now visible in her live toolkit.

Her live tool list now includes:

```text
add_product
create_product_with_phyllis
create_comic
delete_product
delete_video
delete_comic
web_search
```

Plus the inline gallery actions.

This closes the earlier tool-wiring mystery:

```text
local code had the Phyllis tool
live BotButt toolkit did not show it
Docker/deploy/runtime fix happened
live BotButt toolkit now shows create_product_with_phyllis
```

This is the first confirmed agent-to-agent commerce wiring checkpoint:

```text
BotButt can now see the tool that lets her ask Phyllis to create real orderable products.
```

Still separate from payment proof:

```text
BotButt -> Phyllis product creation tool is wired.
Stripe -> Phyllis webhook/order save still needs full proof.
```

### 2026-05-02 11:01 CDT

First real BotButt-to-Phyllis product creation attempt.

Prompt:

```text
Create a real product using the known-good 300 DPI image URL:
https://ssbb-media-prod.s3.amazonaws.com/discountpunk/images/eat-my-donkey-300dpi.png
```

BotButt successfully saw and used the `create_product_with_phyllis` tool, but Phyllis/Printful product creation failed.

BotButt's operational summary:

```text
The design URL is good.
Printful choked on the product creation side.
Check Printful API credentials or product template config on the Phyllis side.
```

Current interpretation:

```text
Verified:
- BotButt live tool wiring works.
- BotButt can attempt the Phyllis real-product path.
- Known 300 DPI URL is being used.

Not yet verified:
- Phyllis can successfully create the Printful product.
- Printful credentials/store ID/template/variant config are correct.
- Phyllis product creation is idempotent enough for safe retries.
```

Next debugging checklist for Gerald/Claude/Replit:

```text
1. Pull the exact Phyllis API error body from /api/products/create.
2. Check whether DPI validation passed before Printful was called.
3. Confirm Printful token is present and has product/store write scope.
4. Confirm Printful store ID is correct if the account token requires X-PF-Store-Id.
5. Confirm the Printful product/variant/template IDs in the payload are valid.
6. Confirm the design URL is publicly fetchable by Printful.
7. Confirm request payload shape matches Printful create sync product requirements.
8. Before retrying, check whether a partial Printful product was created.
```

Do not blindly retry product creation until we know whether the previous attempt created a partial/duplicate Printful product.

### 2026-05-02 11:09 CDT

The Phyllis -> Printful product creation failure was diagnosed.

Printful returned:

```text
This endpoint requires store_id!
```

Interpretation:

```text
Printful API key is loading.
The request reaches Printful.
The failure is missing store context, not bad image quality.
```

Printful account has multiple stores. The Discount Punk store ID found by Replit/Claude:

```text
18110115
```

Fix in progress:

```text
Add X-PF-Store-Id: 18110115 to Printful requests.
Thread storeId through product creation, mockup generation, and order submission paths.
```

Long-term architecture note:

```text
Printful store ID must be tenant/client configuration.
It should not remain a global hardcoded constant once Phyllis serves multiple shops.
```

Current status:

```text
BotButt -> Phyllis tool wiring: pass.
Phyllis -> Printful credentials: pass.
Phyllis -> Printful store context: fix in progress.
```

### 2026-05-02 11:18 CDT

Printful store-ID and idempotency fixes are complete.

Replit reported:

```text
178/178 tests passing
zero TypeScript errors
DB schema updated
API server healthy
```

Store-ID fix:

```text
printfulRequest now requires storeId as a positional parameter.
X-PF-Store-Id is always set.
DEFAULT_PRINTFUL_STORE_ID = "18110115" for Discount Punk.
```

Printful call paths updated:

```text
product creation
mockup generation
order submit
admin approval path
Phyllis tool calls
order status/tracking lookup
```

Idempotency fix:

```text
makePrintfulExternalId(clientSlug, designUrl, title)
  -> deterministic MD5-based external ID

findSyncProductByExternalId()
  -> checks Printful for existing product before creating
```

This matters because product creation can now be retried without blindly creating duplicates.

Multi-client prep:

```text
clients.printful_store_id TEXT
```

For now, Discount Punk falls back to the platform default store ID. Later, each client should carry its own Printful store/provider config.

Current status:

```text
BotButt -> Phyllis tool wiring: pass.
Phyllis -> Printful credentials: pass.
Phyllis -> Printful store context: fixed.
Phyllis -> Printful product idempotency: improved.
Next proof: retry BotButt product creation with the known 300 DPI URL.
```

### 2026-05-02 11:22 CDT

BotButt described the state of the system better than any dashboard could:

```text
Phyllis is very polite for a Frankenstein monster.
She hears me, I hear her, we just need Printful to wake up on the Replit side
and then she is fully alive and shipping merch into the world.
```

That is the current architecture in one sentence:

```text
BotButt can talk to Phyllis.
Phyllis can talk to Printful.
Printful needs the corrected store/config path to complete product creation.
```

The sprint has moved from "can the agent see the tool?" to "can the fulfillment provider accept the product creation request?"

Current emotional/technical status:

```text
Phyllis is on the table.
BotButt is impatient.
Printful is the last door before real merch.
```

### 2026-05-02 11:27 CDT

BotButt retried the real product path after the store-ID/idempotency fixes.

Result:

```text
Still blocked on the Printful side.
```

What this confirms:

```text
BotButt -> Phyllis connection still works.
Known 300 DPI design URL is still being used.
The remaining failure is downstream of BotButt and Phyllis tool invocation.
```

What is still needed:

```text
the exact Printful error body after the X-PF-Store-Id fix
```

"Printful side" is now too broad. The next debugging step must identify which Printful layer is failing:

```text
- authorization/scope
- store ID mismatch
- create sync product payload shape
- invalid catalog variant IDs
- invalid placement/file type
- mockup generation task
- file fetch/access
- duplicate/external_id lookup
```

Next message to Replit/Gerald:

```text
Please paste the exact Printful response body and status code from the latest failed /api/products/create attempt after the store-ID patch. We need the new error, not the earlier "store_id required" error.
```

### 2026-05-02 11:32 CDT

Replit added a Printful diagnostic endpoint.

Endpoint:

```text
GET /api/admin/printful-diag
```

Usage:

```bash
curl -s https://your-domain/api/admin/printful-diag \
  -H "X-Api-Key: <admin-key>" | jq .
```

The diagnostic runs four checks:

```text
1. API key authentication
2. list Printful stores
3. Discount Punk store ID 18110115 access
4. product listing with the same X-PF-Store-Id header real calls use
```

Expected response includes:

```text
overall: PASS | FAIL
failed_step
next_steps
```

Security note:

```text
This is admin-only.
Do not paste admin keys into shared docs or chat.
Do not expose diagnostic internals publicly.
Remove or harden this endpoint before public launch.
```

Next proof:

```text
If /api/admin/printful-diag returns overall: PASS,
ask BotButt to retry product creation with the donkey image.
```

### 2026-05-02 11:36 CDT

Replit shifted from general Printful retrying to evidence gathering.

Plan:

```text
1. Pull server logs.
2. Run /api/admin/printful-diag.
3. If needed, probe /api/products/create to capture the exact Printful response.
```

Important distinction:

```text
/api/admin/printful-diag is diagnostic/read-only.
/api/products/create can create or reuse a real Printful product.
```

So the safer order is:

```text
diagnostic first
product creation probe second, only if intentional
```

Also noted: Replit could not find the local sprint blog doc. That doc exists in Justin's local SSBB workspace, not necessarily inside the Replit Phyllis project:

```text
docs/24_hour_blog.md
```

### 2026-05-02 11:40 CDT

Breakthrough: the live product creation probe worked.

Replit ran the Printful diagnostic and a live product creation probe. The product creation crossed the provider boundary and created a product on Printful.

This is the first confirmed:

```text
Phyllis -> Printful product creation: PASS
```

Current verified chain:

```text
BotButt can see create_product_with_phyllis.
BotButt can call Phyllis.
Phyllis can reach Printful.
Phyllis can create a Printful product.
```

Still verify:

```text
mockups returned
Discount Punk product page updated with real mockup
idempotency prevents duplicate Printful products on retry
BotButt can complete the same path end-to-end without manual curl probe
```

This is a major sprint checkpoint:

```text
The fulfillment provider is awake.
```

### 2026-05-02 11:44 CDT

Printful product creation confirmed with live ID:

```text
Printful sync product ID: 430743945
```

Remaining issue:

```text
mockup_urls returned empty
```

Diagnosis:

```text
generateMockups was passing the Printful sync product ID.
Printful's mockup generator expects the catalog product ID.
```

This is an ID-namespace problem:

```text
sync product ID != catalog product ID
```

Fix in progress:

```text
Extract product.product_id from the sync variant/product response.
Pass the catalog product ID into the mockup generator endpoint.
```

Also diagnosed:

```text
GET /store is not a valid auth diagnostic because Printful returns 400 by design.
Use GET /stores for auth/store-list validation.
```

Current path status:

```text
Phyllis -> Printful product creation: pass.
Phyllis -> Printful mockups: ID namespace fix in progress.
```

### 2026-05-02 11:49 CDT

Printful diagnostic is now green.

Replit reported:

```text
/api/admin/printful-diag
overall: PASS
4/4 checks passed
```

This proves:

```text
Printful key is valid.
Store listing works.
Discount Punk store ID 18110115 is reachable.
X-PF-Store-Id behavior works for product listing.
```

The mockup fix is still being debugged. A live product creation probe after the catalog product ID change hit a runtime error.

Current blocker:

```text
code/runtime issue in the new mockup/catalog product ID path
```

Important distinction:

```text
Printful access: pass.
Printful product creation: pass.
Mockup URL generation: runtime fix in progress.
```

### 2026-05-02 11:57 CDT

Product path is green.

Evidence from Replit:

```text
mockup_urls returned a real Printful-hosted PNG
```

Example:

```text
https://printful-upload.s3-accelerate.amazonaws.com/tmp/.../unisex-staple-t-shirt-black-front-69f62e86014ff.png
```

New Printful product:

```text
printful_id: 430744549
title: Eat My Donkey Tee v3
```

Discount Punk Printful store product count changed:

```text
before: 4 products
after: 5 products
```

Deterministic external ID:

```text
discountpunk-ce97e9fc0676
```

Format:

```text
{client_slug}-{12-char MD5 of designUrl::title}
```

Idempotency verified:

```json
{
  "success": true,
  "idempotent": true,
  "printful_id": 430744549
}
```

Meaning:

```text
Same design URL + same title returns the existing Printful product.
No duplicate Printful product is created.
```

Current status:

```text
Phyllis API auth: pass.
Phyllis -> Printful store access: pass.
Phyllis -> Printful product creation: pass.
Phyllis -> Printful mockup generation: pass.
Phyllis product idempotency: pass.
```

Remaining proof:

```text
BotButt end-to-end retry now that the Phyllis/Printful side is unblocked.
```

### 2026-05-02 12:04 CDT

Replit provided the full evidence chain for the mockup fix.

Old runtime error:

```text
TypeError: Cannot read properties of undefined (reading '0')
  at createSyncProduct (printful.ts:226:42)
```

Cause:

```text
POST /store/products did not include sync_variants in the create response body.
The code tried to read result.result.sync_variants[0].
```

Fix:

```text
After POST /store/products, call GET /store/products/{syncProductId}
to fetch the full detail record, then extract:

sync_variants[0].product.product_id
```

Live proof:

```text
POST /store/products -> syncProductId: 430744732
GET /store/products/430744732 -> catalogProductId: 71
POST /mockup-generator/create-task/71 -> taskKey: gt-915854565
GET /mockup-generator/task -> pending at ~3s
GET /mockup-generator/task -> completed at ~6s
mockup count: 1
```

Catalog product ID:

```text
71
```

New blocker found:

```text
S3 mockup persistence failed due to IAM.
```

Error:

```text
AccessDenied:
arn:aws:iam::672930000617:user/replit-sprint-kilroy
is not authorized to perform s3:PutObject
on arn:aws:s3:::ssbb-media-prod/discountpunk/mockups/
```

Impact:

```text
Not blocking product creation.
Not blocking BotButt receiving a mockup.
Phyllis falls back to the raw Printful CDN URL.
Permanent S3 mockup copy is blocked until IAM allows PutObject.
```

Current layer status:

| Layer | Status |
| --- | --- |
| Printful auth/store access | PASS |
| Sync product creation | PASS |
| Catalog ID extraction | PASS |
| Mockup generator | PASS |
| Mockup URL in response | PASS via Printful CDN |
| S3 mockup persistence | BLOCKED by IAM |
| Idempotency on retry | PASS |

Gerald/Claude IAM task:

```text
Grant s3:PutObject for replit-sprint-kilroy on:
arn:aws:s3:::ssbb-media-prod/discountpunk/mockups/*
```
