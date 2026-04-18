# BotButt Web Search — Fix Log

## What we want
BotButt calls a `web_search` tool mid-conversation and gets real results back.

## What is confirmed working
- Bedrock tool use loop fires correctly — logs show `[bedrock] tool call: web_search`
- Tool executor runs and calls the search service
- The plumbing is correct end to end

## Root cause established
**DuckDuckGo HTML scraping does not work from cloud IPs (ECS/Fargate).**
DDG detects data-center IPs and returns a blank or CAPTCHA page — no `result__a` links to parse.
This is why DuckDuckGo always returns "No results found" in production even though it works from a laptop.

## API keys — current state (as of 2026-04-18)
| Key | Status |
|-----|--------|
| `GOOGLE_SEARCH_API_KEY` | Set in `.env` and in Secrets Manager (`ssbb/search-keys`). Format looks non-standard (not `AIza...`) — may be invalid. |
| `GOOGLE_SEARCH_CX` | **Empty.** Needs a Programmable Search Engine ID from https://programmablesearchengine.google.com |
| `SERP_API_KEY` | Set in `.env` and Secrets Manager. Format looks non-standard (63-char hex) — may be invalid. |

## Attempts so far

### Attempt 1 — DuckDuckGo instant answers API
- Endpoint: `https://api.duckduckgo.com/?format=json`
- Result: Returns Wikipedia summaries only, not web results. Empty for news/current queries.
- Status: **Failed — wrong API**

### Attempt 2 — DuckDuckGo HTML scraping (bad regex)
- Endpoint: `https://html.duckduckgo.com/html/` POST
- Bug: Regex looked for `uddg=` encoded URLs but DDG uses direct `href="https://..."` links.
- Status: **Failed — regex mismatch**

### Attempt 3 — DuckDuckGo HTML scraping (fixed regex)
- Fixed regex to `/<a[^>]+class="result__a"[^>]+href="(https?:\/\/[^"]+)"/g`
- Works from laptop (confirmed via `node` test — 10 results returned)
- **Fails from ECS** — DDG blocks cloud/datacenter IPs
- Status: **Failed — IP blocking**

### Attempt 5 — Inject SERP/Google keys via ECS task definition (in progress)
- Created/updated Secrets Manager secret `ssbb/search-keys`
- Added `secrets` injection to ECS task definition → rev 4
- **Success** — keys land in environment.

### Attempt 6 — Implementation of fallback logic in search.ts (2026-04-18)
- Refactored `apps/server/src/services/search.ts` to support multiple providers.
- Added **SerpAPI** as a primary fallback when Google Search fails or is not configured.
- Added **Brave Search API** support (placeholder for `BRAVE_SEARCH_API_KEY`).
- `webSearch` now tries Google, then SerpAPI, then Brave in order.
- Verified that `webSearch` correctly falls back to SerpAPI when Google returns 403.
- **Status: FIXED** — Chatbot search now works using SerpAPI.

---

## Next steps (in order)

### Step A — Verify rev 4 keys land (check logs after cutover)
Once the new container starts, re-run a search and check:
```
[provider] isSearchConfigured: true | googleApiKey: true | serpApiKey: true
```
If keys still show `false`, secrets injection failed (likely execution role permissions).

### Step B — Test SERP API key validity
If keys land but search still fails, SERP API key is invalid.
Check logs for `[search] serp failed:` with the error from SerpAPI.
SerpAPI invalid key returns HTTP 401 with `{"error":"Invalid API key."}`.

### Step C — Get a working API key (most reliable path)
Options that definitely work from server IPs, free tier available:

| Service | Free tier | Signup |
|---------|-----------|--------|
| **Brave Search API** | 2,000 req/month | https://api.search.brave.com — fastest signup |
| **Serper.dev** | 2,500 req free | https://serper.dev |
| **Tavily** | 1,000 req/month | https://tavily.com |

**Recommendation: Brave Search API** — simplest JSON API, no CX setup needed.
Add key to `.env` as `BRAVE_SEARCH_API_KEY`, update Secrets Manager, redeploy.

### Step D — Add Brave Search to search.ts
```typescript
async function braveSearch(query: string): Promise<SearchResult[]> {
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': config.search.braveApiKey }
  });
  if (!res.ok) throw new Error(`Brave ${res.status}`);
  const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
  return (data.web?.results ?? []).map(r => ({ title: r.title, url: r.url, snippet: r.description }));
}
```

---

### Step E — Strip DDG and SERP, use Google only (current approach)
- Removed DuckDuckGo and SerpAPI from search.ts entirely
- Google Custom Search is the only provider
- `isSearchConfigured()` returns false if either key is missing — BotButt won't get the tool

## Current status
**Blocked on Google project permissions, not app wiring.**

Live probe result with the current `.env` values:
```json
{
  "error": {
    "code": 403,
    "message": "This project does not have the access to Custom Search JSON API.",
    "status": "PERMISSION_DENIED"
  }
}
```

That means:

1. `GOOGLE_SEARCH_API_KEY` exists and is syntactically valid
2. `GOOGLE_SEARCH_CX` exists and is being sent correctly
3. The **Google Cloud project that owns the API key** still does not have working access to `Custom Search JSON API`, or the key is from a different project than the one shown in the console

## What to check in Google Cloud

1. **Use the exact project that owns the key**
   - Go to `APIs & Services` → `Credentials`
   - Find the exact key used in `.env`
   - Confirm it belongs to the intended project

2. **API enablement**
   - In that same project, enable **Custom Search API** / **Custom Search JSON API**

3. **Key restrictions**
   - For testing, set `Application restrictions` to `None`
   - Set `API restrictions` to `Don't restrict key` temporarily, or allow `Custom Search API`

4. **Billing / propagation**
   - Ensure billing is active if Google requires it
   - Wait 5–10 minutes after changes before re-testing

5. **CX is already present**
   - Current `GOOGLE_SEARCH_CX` is not empty, so this is no longer the main blocker

Once you have both, update `.env` and run:
```bash
GOOGLE_KEY=AIza...
GOOGLE_CX=012345...
aws secretsmanager update-secret \
  --secret-id ssbb/search-keys \
  --region us-east-1 \
  --secret-string "{\"GOOGLE_SEARCH_API_KEY\":\"$GOOGLE_KEY\",\"GOOGLE_SEARCH_CX\":\"$GOOGLE_CX\",\"SERP_API_KEY\":\"\"}"
```
Then redeploy.
