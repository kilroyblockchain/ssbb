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

### 2026-05-02 12:12 CDT

Phyllis is alive and shipping donkeys.

BotButt reported:

```text
PHYLLIS IS ALIVE AND SHE IS SHIPPING DONKEYS!
The Eat My Donkey tee is live on Discount Punk right now.
Real product, real orders, first ten a month on the house.
```

This is the first full product path confirmation:

```text
BotButt -> create_product_with_phyllis
SSBB -> Phyllis API
Phyllis -> 300 DPI validation
Phyllis -> Printful product creation
Phyllis -> Printful mockup generation
Phyllis -> S3 persistence
BotButt -> product live on discountpunk.com
```

First real orderable product:

```text
Eat My Donkey tee
```

What was proven:

```text
agent-to-agent product creation works
Phyllis can validate print files
Phyllis can create real Printful products
Phyllis can return mockups
Discount Punk can publish the product
```

The sentence for the blog:

```text
At noon, the joke became infrastructure: BotButt asked Phyllis to make a real product, Phyllis validated the print file, Printful generated the product and mockup, and Discount Punk had an orderable Eat My Donkey tee.
```

### 2026-05-02 12:17 CDT

User testing found storefront cleanup work.

Karen saw multiple "Eat My Donkey" products near the end of the Discount Punk shop, and at least some have broken images.

Interpretation:

```text
These are likely product records from earlier failed or partial product-creation attempts before the mockup/S3 path was fixed.
```

This does not invalidate the final product-path proof. It means the public storefront needs cleanup:

```text
1. Identify every Eat My Donkey product record on Discount Punk.
2. Keep the newest Printful-backed product with the working mockup.
3. Remove duplicates with broken image URLs.
4. If needed, update one canonical product title/slug/page.
5. Retest shop page after hard refresh.
```

Good product hygiene rule for Phyllis/BotButt:

```text
If a real product creation attempt fails after creating a local storefront record but before returning a valid mockup URL, mark the local product as draft/broken instead of publishing it.
```

### 2026-05-02 12:30 CDT

Justin cleaned the broken duplicate "Eat My Donkey" storefront entries directly in Discount Punk's S3 content file.

Live content before cleanup:

```text
featured products: 39
Eat My Donkey placeholder entries: 2
```

Both broken entries had:

```text
title: Eat My Donkey
image: /images/placeholder.jpg
link: /products/eat-my-donkey.html
```

Cleanup performed:

```text
Removed only those two placeholder Eat My Donkey entries.
Left all other products untouched.
```

Live content after cleanup:

```text
featured products: 37
Eat My Donkey entries: 0
```

Backup kept locally:

```text
/tmp/discountpunk-content.before-eat-my-donkey-cleanup.json
```

Next storefront task:

```text
Publish one canonical, buyable Eat My Donkey product entry with the working Printful mockup and a Buy Now button wired to Stripe checkout.
```

### 2026-05-02 12:38 CDT

Karen logged into the Phyllis dashboard as Discount Punk but could not see the product.

Diagnosis from Replit:

```text
The dashboard had no Products tab.
The product catalog route existed, but production product visibility was blocked by data/slug mismatch.
```

Slug mismatch:

```text
saved product slug: discountpunk
actual client slug: discount-punk
```

Fix in progress:

```text
1. Add Products tab to the client dashboard.
2. Fix catalog route/default slug to use discount-punk.
3. Backfill production products table with the canonical Printful product.
4. Make idempotent product lookup return stored/mockup data instead of empty mockups.
```

This is a dashboard visibility issue, not a Printful creation failure.

### 2026-05-02 12:43 CDT

Dashboard product visibility verified.

Karen logged into Phyllis as Discount Punk and saw the Products tab with one active product.

Visible product:

```text
Eat My Donkey
status: Active
price: $29.99
Printful ID: 430745217
External ID: discount-punk-4149b8b559c5
mockup image: visible
```

This proves:

```text
Discount Punk client login works.
Products tab works.
Product backfill works.
Mockup is visible in the dashboard.
Printful/external IDs are visible to the client.
```

Remaining storefront work:

```text
Make the public Discount Punk Buy Now button use the real checkout flow instead of "coming soon."
```

### 2026-05-02 12:50 CDT

Documentation sweep.

Updated docs to match the current system state:

```text
docs/replit_produced_docs/phyllis/client-admin-guide.md
docs/replit_produced_docs/phyllis/customer-guide.md
docs/replit_produced_docs/phyllis/technical-reference.md
docs/replit_produced_docs/phyllis/testing-plan.md
docs/printful/Justins_advice.md
docs/printful/300dpi_image_test_plan.md
docs/printful/llm_discoverability_safety_checklist.md
docs/PRINTFUL_READY.md
```

Added:

```text
docs/printful/current_phyllis_architecture.md
```

The docs now distinguish:

```text
Product creation path: verified.
Dashboard visibility: verified.
Public Buy Now checkout: still pending.
```

### 2026-05-02 12:56 CDT

Replit defined the storefront integration contract for Gerald/Claude.

Product catalog options:

```text
GET /api/products?client_slug=discount-punk
GET /api/products/content.json?client_slug=discount-punk
```

Catalog fields for Discount Punk:

```text
product image -> mockup_urls[0]
product name -> title
price -> retail_price
Printful product ID -> printful_product_id
active flag -> active
```

Buy button target:

```text
POST /api/discountpunk/checkout/create-session
```

The intended storefront loop:

```text
catalog fetch -> render product -> customer chooses size/quantity -> create Stripe checkout session -> redirect to Stripe -> webhook saves order in Phyllis
```

Contract details to verify before implementation:

```text
1. external_id should consistently use client slug format, likely discount-punk-..., not discountpunk-...
2. checkout payload field names must match the deployed endpoint: successUrl/cancelUrl vs success_url/cancel_url.
3. /api/... relative URL only works if Discount Punk proxies API calls; otherwise use the full Phyllis/SSBB API base.
4. Checkout should create payment/order only; final fulfillment still waits for human approval.
```

### 2026-05-02 14:37 CDT

Stripe webhook diagnosis continued.

The visible Stripe webhook/destination has:

```text
0 deliveries
```

That means the failed webhook calls seen in Phyllis logs likely came from a different/older Stripe endpoint, not the visible endpoint Karen was checking.

Current action items:

```text
1. Check Stripe Developers -> Webhooks classic view for older endpoints pointing to the same URL.
2. Delete stale duplicate webhook endpoints if found.
3. Set the visible endpoint's signing secret exactly as STRIPE_WEBHOOK_SECRET_PROD in Replit Secrets.
4. Republish/restart Phyllis.
5. Use Stripe "Send test event" for checkout.session.completed from that exact endpoint.
6. Verify Phyllis logs show a valid signature and HTTP 200.
7. Verify a test order is saved as pending_client_approval.
```

Important distinction:

```text
Endpoint exists in Stripe is not enough.
Deliveries must reach Phyllis and verify with the matching signing secret.
```

### 2026-05-02 14:45 CDT

Stripe webhook success.

Replit reported the missing payment-loop proof:

```text
Processing checkout.session.completed
Order saved — awaiting client approval
S3 upload complete -> discountpunk/orders/41637386-...json
```

This proves:

```text
Stripe delivered the webhook.
Phyllis verified the signing secret.
Phyllis processed checkout.session.completed.
Phyllis saved the order to S3.
The order entered pending_client_approval.
```

The checkout proof is now green:

```text
Stripe event delivered with valid signature
Phyllis order exists
order status = pending_client_approval
```

Next verification:

```text
Confirm the order appears in the Discount Punk dashboard Orders/Approvals views.
```

### 2026-05-02 14:49 CDT

Webhook order saved, but dashboard visibility hit the same slug mismatch pattern.

Observed:

```text
order saved to: discountpunk/orders/41637386-...json
dashboard reads: discount-punk/orders/
```

Interpretation:

```text
Stripe webhook/order persistence used the old slug format.
Dashboard/client views use the canonical client slug.
```

Required fix:

```text
Canonicalize client slug before every S3 write/read.
Use discount-punk consistently.
Backfill or move the saved test order from discountpunk/orders/ to discount-punk/orders/.
```

This is not a Stripe failure. The payment loop worked; the order is just stored under the wrong tenant prefix.

### 2026-05-02 15:02 CDT

Canonical order path fix complete in code.

Replit reported:

```text
187 tests passing
```

Changes:

```text
clientOrderPrefix(slug) created in orderPaths.ts
DISCOUNT_PUNK_ORDERS_PREFIX = "discount-punk/orders"
webhooks use canonical discount-punk/orders
approval/query/printfulWebhook/orderStatus paths use shared constants
checkout metadata now embeds client_slug: discount-punk
clientDashboard reads ${req.clientSlug}/orders directly
phyllis.ts fallbacks updated to discount-punk/orders
```

Regression coverage:

```text
9 path-consistency tests
includes explicit proof that discountpunk/orders != discount-punk/orders
```

Migration endpoint:

```text
POST /api/admin/migrate-order-paths
```

Purpose:

```text
copy existing orders from discountpunk/orders/ to discount-punk/orders/
```

Remaining blocker:

```text
S3 IAM/bucket policy allows PutObject on discountpunk/*
but not on discount-punk/*
```

AWS action needed:

```text
Grant s3:PutObject for replit-sprint-kilroy on:
arn:aws:s3:::ssbb-media-prod/discount-punk/*
```

After AWS policy fix:

```text
1. Publish/restart Phyllis.
2. Call POST /api/admin/migrate-order-paths with admin key.
3. Confirm existing test order appears in dashboard.
4. Confirm all new webhook orders write directly to discount-punk/orders/.
5. Remove or disable migration endpoint after confirmation.
```

### 2026-05-02 15:12 CDT

AWS bucket policy update requires AWS admin access.

Replit and local sprint credentials cannot modify the bucket policy.

Correct bucket:

```text
ssbb-media-prod
```

Not:

```text
zorrto
```

Required grant for the Replit sprint user:

```text
arn:aws:iam::672930000617:user/replit-sprint-kilroy
```

Needed access:

```text
s3:GetObject
s3:PutObject
s3:DeleteObject
on arn:aws:s3:::ssbb-media-prod/discount-punk/*
```

If migration lists keys, also ensure:

```text
s3:ListBucket
on arn:aws:s3:::ssbb-media-prod
with prefix discountpunk/* and discount-punk/*
```

Gerald/AWS-admin handoff:

```bash
aws s3api get-bucket-policy --bucket ssbb-media-prod --output text > /tmp/policy.json
cat /tmp/policy.json | jq .
```

Then merge the new statement carefully and apply:

```bash
aws s3api put-bucket-policy --bucket ssbb-media-prod --policy file:///tmp/policy.json
```

Do not overwrite unrelated policy statements.

### 2026-05-02 15:20 CDT

Approval workflow testing found a persistence issue.

User action:

```text
Discount Punk client clicked approve.
Then admin logged in and saw no orders in Final Approvals.
```

Initial suspicion:

```text
admin pending endpoint might be filtering incorrectly.
```

Actual finding from Replit:

```text
The order in S3 is still pending_client_approval.
```

Interpretation:

```text
Client approval did not persist the state transition.
Admin queue is empty because there is no pending_admin_approval order yet.
```

Likely class of bug:

```text
approval endpoint returned success or UI looked successful,
but S3 write-back to the canonical order path failed or wrote to the wrong path.
```

Next check:

```text
Inspect approval route write path and logs.
Confirm it writes to discount-punk/orders/{orderId}.json.
Confirm failures are not swallowed.
After client approval, immediately re-read the S3 object and assert status = pending_admin_approval.
```

### 2026-05-02 15:27 CDT

Approval API works; dashboard click path needs scrutiny.

Replit tested the approval endpoint directly for order:

```text
886adee9...
```

Result:

```text
client approve API call succeeded
order status is now pending_admin_approval
```

Interpretation:

```text
The approval route/write path works.
The earlier dashboard click likely targeted a stale/wrong order or swallowed the state-machine error.
```

Next user action:

```text
Refresh the admin dashboard.
The order should now appear in Final Approvals.
```

Next proof:

```text
Admin final approval submits the order to Printful and updates status.
```

Safety reminder:

```text
Admin final approval creates/submits a real fulfillment order.
Only click it if the order should actually be fulfilled.
```

### 2026-05-02 15:32 CDT

Dashboard approval flow produced browser errors.

Observed in browser console:

```text
Failed to load resource: 500 (usage)
Failed to load resource: 500 (orders)
Unhandled Promise Rejection: SyntaxError: The string did not match the expected pattern.
```

Interpretation:

```text
Direct approval API can work.
Dashboard refresh/state reload after approval is failing on usage/orders endpoints.
The UI then appears to loop or fail even if the underlying transition may have succeeded.
```

Next debugging step:

```text
Check server logs for GET /api/me/usage and GET /api/me/orders 500s.
Confirm whether the frontend is parsing a non-JSON error response as JSON.
Add visible error handling so approval failures do not look successful or loop silently.
```

### 2026-05-02 15:37 CDT

Admin dashboard routing bug found.

Symptom:

```text
Admin logged in but saw client dashboard tabs:
Pending, Orders, Products, Usage, Chat API, Overview
```

Expected admin experience:

```text
Admin panel / Final Approvals
```

Root cause from Replit:

```text
BotButt Admin row in production DB has isAdmin: null
```

Because `isAdmin` was not true, the app routed the admin key into the client dashboard. That meant the UI showed "Needs your review" and called `client-approve` instead of admin final approval.

Fix:

```text
Set BotButt Admin isAdmin=true in production DB.
Ensure login/admin routing treats only true as admin.
Add seed/data check so admin users cannot be null.
```

This explains the approval loop:

```text
the person thought they were in admin mode,
but the frontend was rendering client mode.
```

### 2026-05-02 15:44 CDT

Printful draft order proof.

Karen shared a Printful dashboard screenshot showing:

```text
Order #PF156912697
```

The order is visible inside Printful with:

```text
Unisex Staple T-Shirt | Bella + Canvas 3001
Color: Black
Size: XL
Quantity: 1
Recipient: Sam Punk
Total: $17.79
```

Most important: Printful shows a **Confirm order** button.

That proves:

```text
Phyllis/admin approval created a Printful draft order.
Production has not started automatically.
No shirt ships until a human confirms the order in Printful.
```

This is the safe E2E posture:

```text
Stripe test payment
-> Phyllis order
-> client approval
-> admin approval
-> Printful draft order
-> manual Printful confirmation
```

The physical fulfillment gate is still human-controlled.

### 2026-05-02 16:24 CDT

Public Discount Punk checkout integration hit a metadata issue.

Observed from Stripe:

```text
checkout.session.completed event exists
session metadata is empty: {}
```

Impact:

```text
Stripe can create and complete the checkout session.
But Phyllis webhook does not have enough context to create a useful order.
```

Missing metadata:

```text
client_slug
printful_product_id
size
quantity
product/title info or enough product ID to look it up
```

This is separate from webhook signing-secret verification. The webhook secret controls whether Phyllis can trust the event. Metadata controls whether Phyllis knows what the event means.

Required checkout fix:

```text
/api/discountpunk/checkout/create-session must embed canonical metadata:
client_slug=discount-punk
printful_product_id=...
size=...
quantity=...
```

Webhook hardening:

```text
If metadata is missing, do not silently drop the event.
Log a loud structured error and save a recoverable failed_webhook record if possible.
```

### 2026-05-02 16:36 CDT

Stripe production webhook secret bug fixed in code and config.

Root cause reported by Replit:

```text
STRIPE_WEBHOOK_SECRET_PROD in hydrateSecrets fell back to an empty string
instead of falling back to the Secrets Manager value.
```

Impact:

```text
Production webhook verification depended only on the Replit Secret value.
If that value was stale or wrong, the mismatch was not obvious.
```

Fix:

```text
1. New Stripe webhook endpoint registered.
2. STRIPE_WEBHOOK_SECRET_PROD updated in Replit Secrets.
3. Code fixed so prod webhook secret fallback no longer silently becomes "".
4. API server restarted cleanly.
5. Publish needed to push the fixed webhook/approval behavior to production.
```

Security note:

```text
Do not paste whsec_ values into docs or public chat.
If a webhook signing secret is exposed outside trusted tools, rotate it.
```

Important product/safety note:

```text
"Auto-fulfill with both approvals off" changes the safety model.
Even if Printful creates only draft orders, bypassing Phyllis approval should be an explicit test-mode setting, not an accidental production default.
```

### 2026-05-02 17:12 CDT

Phantom/duplicate pending approval appeared in the dashboard.

Karen saw two `Needs your review` items with the same timestamp:

```text
2026-05-02 17:12:04
b907d43f-a81f-482f-a7b9-a621742535b1
dc0867ec-6d16-4ed0-a1e5-e6613a503124
```

One appears partially malformed:

```text
amount: $29.99
shipping address present
product details missing or incomplete
```

The other appears valid:

```text
Eat My Donkey
Size: 2XL
qty 1
$29.99 each
```

Likely causes:

```text
1. Duplicate Stripe webhook handling for the same checkout session.
2. Both checkout.session.completed and payment_intent.succeeded created orders.
3. One old/partial webhook path still writes an incomplete order.
4. Metadata parsing differs between two webhook handlers.
```

Required triage:

```text
Compare both S3 order JSON files.
Check stripeSessionId and stripePaymentIntentId.
If they match, keep the complete itemized order and mark/delete the malformed duplicate.
Add idempotency so one Stripe session/payment can create only one Phyllis order.
```

This is now a pre-launch correctness issue for checkout/order persistence.

### 2026-05-02 17:33 CDT

Auto-submit policy bug diagnosed.

Symptom:

```text
Discount Punk checkouts still went through store/client approval and admin approval,
even though approval flags were set to false.
```

Root cause:

```text
getClientPolicy selected clients.printful_store_id.
The column existed in schema but not in the database.
The query threw.
The catch block silently returned DEFAULT_POLICY.
DEFAULT_POLICY requires both approvals.
```

So the approval flags were correct, but unreadable.

Fix:

```text
Add/migrate printful_store_id column.
Rebuild DB lib/server.
Restart/publish so production gets the column too.
```

Related duplicate-order fix:

```text
payment_intent.succeeded arrived before checkout.session.completed
and created partial orders.
Checkout session creation now stamps payment_intent_data.metadata.checkout_session_id
so the payment_intent handler can skip sessions created by checkout.
checkout.session.completed should now be the canonical order creator.
```

Expected post-publish flow for Discount Punk test mode:

```text
Stripe checkout
-> checkout.session.completed
-> complete order created
-> policy lookup returns clientApprovalRequired=false and adminApprovalRequired=false
-> Phyllis auto-submits to Printful
-> Printful draft order created
```

Caveat:

```text
Do not trust auto-submit until production publish actually applies the DB migration
and one fresh checkout proves the Printful draft appears.
```

### 2026-05-02 17:45 CDT

Karen set the next stretch goal for the remaining Replit sprint window:

```text
Add a second supplier path for poster prints.
```

This matters because Phyllis should become a fulfillment orchestration layer, not a Printful wrapper.

Current provider strategy:

```text
Shirts/general merch -> Printful
Collectible posters/fine-art drops -> theprintspace / creativehub
General wall art fallback -> Prodigi, PrintShrimp, Pwinty, or another API-capable provider
```

The recommended collectible poster candidate remains:

```text
theprintspace / creativehub
```

Reason:

```text
Collectible posters need provenance, not just printing.
```

For BotButt and future creative agents, a poster can become a collectible only if Phyllis can operationally enforce:

- edition size
- edition number
- certificate ID
- artist/agent attribution
- design file hash
- verification URL
- no overselling

Sprint framing:

```text
Do not pause the Printful/Stripe checkout fix.
Do make the data model and API language provider-aware.
Do keep fields ready for fulfillmentProvider, providerProductId, edition metadata,
certificate metadata, and provider_pending/manual_fulfillment states.
```

The full implementation plan is already captured here:

```text
docs/printful/collectible_poster_fulfillment_plan.md
```

### 2026-05-02 17:58 CDT

Approval queues removed from the product direction.

Karen made the call:

```text
Let's just get rid of the approvals.
I didn't realize the vendors would have final approval there. that's enough.
```

This simplifies Phyllis.

New order flow:

```text
Stripe payment succeeds
-> Phyllis saves the order
-> Phyllis submits through the selected provider adapter
-> Printful shirt orders appear as draft/provider orders in Printful
-> Printful/vendor dashboard is the final production gate
```

Reason:

```text
The supplier dashboard already has the last human confirmation step.
Keeping a separate Phyllis client/admin approval queue created duplicate state,
extra UI bugs, and unclear responsibility.
```

What remains important:

```text
Do not automatically call Printful's final confirm endpoint.
Do not pretend a second supplier is fulfilled if its API is not wired.
Use provider_pending/manual_fulfillment for collectible posters until theprintspace/creativehub is real.
```

Docs updated to reflect the new model:

```text
docs/printful/current_phyllis_architecture.md
docs/printful/Justins_advice.md
docs/printful/collectible_poster_fulfillment_plan.md
docs/printful/300dpi_image_test_plan.md
docs/replit_produced_docs/phyllis/customer-guide.md
docs/replit_produced_docs/phyllis/client-admin-guide.md
docs/replit_produced_docs/phyllis/technical-reference.md
docs/replit_produced_docs/phyllis/testing-plan.md
```

### 2026-05-02 18:08 CDT

Printful handoff verified, and two dashboard/business-model tasks remain.

Karen reported:

```text
The order showed up.
```

That means the latest paid order did make it through to Printful after the provider-routing and webhook fixes.

Active Replit tasks:

```text
1. Put Discount Punk on an unlimited order plan.
2. Add dashboard order drill-down so operators can inspect full order/provider details.
```

Unlimited plan requirement:

```text
Discount Punk should not be capped at first 10 free orders.
Plan should display as unlimited.
Billable order count should be 0 during the sprint/client proof period.
Order submission should not be blocked by monthly count.
```

Order drill-down requirement:

```text
Click any order in the Phyllis dashboard.
See full Stripe session/payment data, customer/shipping details, item/variant details,
provider, provider order ID, provider status, provider error/blocker, timestamps, and retry history.
```

Why this matters:

```text
Cards are enough for scanning.
Drill-down is required for debugging why a paid order did or did not reach Printful/provider.
```

### 2026-05-02 18:22 CDT

Python print-prep became an active implementation track.

Karen decided not to pay for Adobe/Photoshop API during the sprint.

Decision:

```text
Use Python for MVP print prep.
```

Claude and Replit are both working from:

```text
docs/printful/handoff_plans.md
```

Phyllis-side goal:

```text
POST /api/print-prep/process
```

Purpose:

```text
Take BotButt's displayed/generated 72 DPI image,
remove background,
upscale to real print pixels,
preserve transparency,
sharpen,
stamp 300 DPI metadata,
upload to S3,
run Phyllis quality validation,
return printReadyUrl.
```

BotButt-side goal:

```text
Customer tries to buy design.
BotButt checks whether product already exists.
If product exists: skip prep and reuse product ID.
If product does not exist: send displayed image to Phyllis print-prep,
then create the Phyllis/Printful product,
then start checkout.
```

Important invariant:

```text
The 72 DPI display image is never sent directly to /api/products/create.
Only a Phyllis-validated printReadyUrl can become a real product.
```

MVP stack:

```text
rembg -> background removal
Pillow/Lanczos -> MVP resize/pad/sharpen/DPI export
Real-ESRGAN or similar -> later higher-quality super-resolution
```

### 2026-05-02 18:38 CDT

Replit shipped the Phyllis print-prep endpoint.

Endpoint:

```text
POST /api/print-prep/process
```

Verified behavior:

```text
source image -> rembg background removal
-> Pillow/Lanczos fit to transparent print canvas
-> mild sharpen
-> 300 DPI PNG metadata
-> deterministic S3 key
-> Phyllis quality gate
-> printReadyUrl
```

Verified response shape:

```json
{
  "success": true,
  "printReadyUrl": "https://ssbb-media-prod.s3.amazonaws.com/discount-punk/images/print-ready/{hash}.png",
  "width": 3600,
  "height": 4500,
  "dpi": 300,
  "hasAlpha": true,
  "qualityPassed": true,
  "prepMethod": "rembg+pillow-lanczos+sharpen",
  "warnings": ["MVP resize used; not AI super-resolution"]
}
```

Important implementation notes:

```text
First rembg/U2-Net call may take about 30 seconds while the ONNX model downloads.
Repeated identical calls are idempotent and reuse the same print-ready S3 key.
If dimensions, transparency, or DPI fail validation, Phyllis returns 422 and does not upload.
Dev smoke test exposed an IAM-only S3 upload limitation; production should use project credentials.
```

Test result:

```text
188/188 tests passing after the print-prep work.
```

BotButt next step:

```text
If product exists: skip print-prep and use the existing product ID.
If product is missing: call /api/print-prep/process with the displayed/generated image,
then call /api/products/create with the returned printReadyUrl.
```

### 2026-05-02 21:24 CDT

The print-prep/product path moved from "works in theory" to "hardened against real agent behavior."

Problem discovered in live BotButt runs:

```text
BotButt sometimes called create_product_with_phyllis with only design_url.
The design_url was a signed 72 DPI canvas preview.
Because no source_image_url was present, the SSBB retry/prep logic did not run.
Phyllis rejected the file at the DPI gate.
BotButt then narrated "Gerald needs to fix it" instead of completing the workflow.
```

Root cause:

```text
The happy-path contract assumed the creative agent would choose the correct two-step sequence.
Real agents do not always choose the correct sequence.
The fulfillment boundary needs to be defensive.
```

SSBB-side hardening:

```text
createProductWithPhyllis now treats any non-/print-ready/ design_url as a source image.
It extracts the S3 key from signed ssbb-media-prod URLs.
It strips signed query parameters and normalizes to the clean durable S3 URL.
It calls prepareImageForPrint before /api/products/create.
Only the returned printReadyUrl is sent to product creation.
```

The server image with this defensive path was built and deployed to ECS.

Phyllis-side hardening:

```text
/api/products/create now auto-upgrades low-DPI images internally.
If a caller sends a 72 DPI canvas URL, Phyllis runs print-prep itself before rejecting.
The response can include print_prep_applied: true.
The stored product design_url should be the upgraded /print-ready/ URL.
```

This is the right ownership split:

```text
SSBB/BotButt should try to send print-ready files.
Phyllis must still protect itself when callers send preview files.
Fulfillment infrastructure cannot depend on the creative agent being perfectly obedient.
```

Background removal also split into two paths.

Problem:

```text
removeBackground: false preserved the white AI canvas background.
On black shirt mockups this appeared as a white square behind the design.
```

Rejected approach:

```text
rembg/U2-Net salient-object removal is too aggressive for typography art.
It can decide the "main subject" is only one part of the graphic and delete text like "EAT MY".
```

New auto-upgrade approach:

```text
thresholdBgRemoval: true
```

Behavior:

```text
Pure Sharp/colorimetric white removal.
Pixels where all RGB channels are near-white are made transparent.
Hard cutoff at 245/255.
Soft blend band from 220-245 for anti-aliased edges.
Pink letters, green slime, black outlines, and drawn elements survive because at least one channel is below the threshold.
```

The explicit print-prep endpoint can still use rembg when a caller intentionally asks for subject-based background removal:

```text
POST /api/print-prep/process
removeBackground: true
```

But `/api/products/create` auto-upgrade should use threshold white removal so typography designs survive.

One infrastructure gate surfaced during the live test:

```text
User arn:aws:iam::672930000617:user/replit-sprint-kilroy
was not allowed to s3:PutObject
to ssbb-media-prod/discount-punk/images/print-ready/*
```

Fix applied:

```text
Narrow IAM inline policy:
s3:PutObject
arn:aws:s3:::ssbb-media-prod/discount-punk/images/print-ready/*
```

After that, live print-prep returned:

```text
printReadyUrl:
https://ssbb-media-prod.s3.amazonaws.com/discount-punk/images/print-ready/75b328e096e09da0c3dc09c9bf0ae567acaab77b631cae4f3a97925799490a3e.png

width: 3600
height: 4500
dpi: 300
qualityPassed: true
prepMethod: rembg+pillow-lanczos+sharpen
```

A separate storefront bug appeared with:

```text
I'm a Butt Bitch, Too Tee
```

Symptoms:

```text
The product load threw SyntaxError in the browser.
The static content record had:
/products/i'm-a-butt-bitch,-too-tee.html
and placeholder image.
Phyllis mockup URLs also contained raw apostrophe/comma characters:
.../mockups/i'm-a-butt-bitch,-too-tee-mockup-0.png
```

Fixes:

```text
SSBB slug generation now strips quotes and non-alphanumeric punctuation.
Old static content.json entry was backfilled to:
/products/im-a-butt-bitch-too-tee.html
The unsafe S3 mockup object was copied to:
discount-punk/mockups/im-a-butt-bitch-too-tee-mockup-0.png
The SSBB Phyllis catalog proxy now sanitizes that known unsafe mockup URL before returning products to the shop.
```

Product hygiene lesson:

```text
Never let raw generated titles become URLs or S3 keys without slugification.
Product titles can contain jokes, punctuation, and apostrophes.
Product URLs and object keys should be boring.
```

Current status after this round:

```text
Phyllis print-prep endpoint works.
Phyllis can upload print-ready files.
Phyllis products/create is being hardened to auto-upgrade low-DPI files.
SSBB server is deployed with a defensive pre-products/create print-prep path.
Known unsafe "I'm a Butt Bitch, Too Tee" storefront URL issue has a backfill and code-level guard.
```

### 2026-05-02 21:36 CDT

Order verification round.

The last checkout looked like it did not show up in Printful, but the failure signal was misleading.

Browser console showed hCaptcha iframe permission-policy errors:

```text
Permission policy 'Camera' check failed for document with origin 'https://newassets.hcaptcha.com'.
Permission policy 'Microphone' check failed for document with origin 'https://newassets.hcaptcha.com'.
Not allowed to call enumerateDevices.
```

Those are hCaptcha fingerprinting/device-inspection attempts being denied by the browser permission policy. They are noisy, but they are not the order fulfillment failure path.

The real chain looked healthy:

```text
Stripe checkout sessions were complete and paid.
Phyllis created matching orders.
Phyllis marked the orders submitted_to_printful.
Phyllis recorded Printful order IDs:
156946186
156946464
```

A direct Printful API check from SSBB failed with:

```text
401 Unauthorized
The access token provided is invalid.
```

That points at the local SSBB `ssbb/stripe-printful` secret being stale or not the same credential Phyllis uses, not at the Stripe-to-Phyllis checkout flow failing.

Replit-side fix:

```text
Use the correct Printful credential on the Phyllis side.
Keep Phyllis as the source of truth for the fulfillment submission step.
```

One remaining cleanup:

```text
Stripe still has an old enabled Replit dev webhook endpoint.
That can leave pending_webhooks: 1 on otherwise successful Stripe events.
Disable the stale webhook endpoint once the production Phyllis webhook is confirmed.
```

### 2026-05-02 21:41 CDT

Checkout print-file split.

The final fulfillment issue was not the checkout image customers see. It was the file handed to Printful.

New rule:

```text
imageUrl = Stripe checkout display image, usually the shirt mockup.
printUrl = Printful print file, the flat 300 DPI design PNG from products/create or print-prep.
```

Phyllis now accepts `printUrl` per checkout item, and the SSBB checkout proxy forwards it.

SSBB also keeps the old storefront path working:

```text
Existing shop request:
printful_product_id + size + quantity

SSBB proxy behavior:
look up the Phyllis product by printful_product_id
use mockup_urls[0] as imageUrl
use print_ready_url/design_url as printUrl
forward both to Phyllis checkout/create-session
```

That lets current product pages continue posting the old payload while Printful receives the correct print-ready design file.

Deploy status:

```text
Server build passed.
ECS server deploy completed.
Live URL: https://ssbb.pretendo.tv
```

### 2026-05-02 22:16 CDT

Live shop checkout patch.

The previous SSBB proxy fix was correct but did not cover the public shop page because `discountpunk.com/shop.html` was posting directly to Phyllis:

```text
POST https://phyllis-fills.replit.app/api/discountpunk/checkout/create-session
imageUrl: productData.mockup_urls[0]
printUrl: missing
```

That meant the live shop depended entirely on Phyllis fallback behavior. It also rendered duplicate active products from the Phyllis catalog, including an old `Dump Cake Tee` record whose `design_url` pointed at the Eat My Donkey print file.

Static shop fix:

```text
imageUrl = product mockup URL for Stripe checkout display
printUrl = product print_ready_url/design_url/designUrl for Printful fulfillment
active products are deduped by normalized title
latest created_at/updated_at product wins
```

Deployment:

```text
Patched /Users/karenkilroy/zorro_kilroy/discountpunk.com/shop.html
Staged static files to /tmp/discountpunk-static-deploy
Deployed production Azure Static Web App
Verified live https://discountpunk.com/shop.html includes printUrl
```

Phyllis server-side hardening still matters:

```text
ProviderOrderItem now needs printUrl in the type path.
Before Printful submission, Phyllis should resolve the product designUrl from its DB by title/client when printUrl is absent.
Final fallback should be imageUrl only when no product DB match exists.
```

### 2026-05-03 02:12 CDT

Final demo wrap.

The system made it all the way through the real path.

What shipped:

```text
BotButt accepted an approved design.
Phyllis prepared the image for print.
The design became a real 300 DPI print file.
The product and mockup were created.
Discount Punk showed the product in the live shop.
Stripe checkout completed.
Printful received the correct fulfillment data.
```

The demo proof product:

```text
REPLIT ROCKS! t-shirt
```

The important architecture decision was separating the customer-facing image from the fulfillment file:

```text
Mockup image -> Stripe checkout and shop display
Print-ready design PNG -> Printful fulfillment
```

That split turned out to be the difference between a pretty storefront and a reliable fulfillment system.

Final phrasing for the demo:

```text
BotButt designs it.
Phyllis preps it.
Discount Punk sells it.
Printful ships it.
Replit rocks.
```

End state:

```text
The live flow works end to end.
The demo shirt was successfully ordered through the system.
The remaining work is polish, cleanup, duplicate product hygiene, and better observability.
```
