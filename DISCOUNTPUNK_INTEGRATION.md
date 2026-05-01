# Discount Punk Integration

BotButt now manages discountpunk.com from the SSBB production server!

## What Changed

### Backend (`apps/server/`)

**New files:**
- `src/services/discountpunk.ts` - Content management (S3-backed)
- `src/routes/discountpunk.ts` - API endpoints

**Modified files:**
- `src/index.ts` - Added discountpunk routes, updated CORS for Azure domain
- `src/services/provider.ts` - Added `add_product` and `create_comic` tools to BotButt

### BotButt's New Tools

**add_product** - Creates products with:
- Auto-generated images (Azure GPT-Image → S3)
- Product catalog updates
- Optional dedicated product pages

**create_comic** - Creates comics with:
- Auto-generated cover art (Azure GPT-Image → S3)
- Full HTML comic pages
- Published to comics section

### Storage

All content goes to **S3** (`ssbb-media-dev` bucket):
```
discountpunk/
├── content.json              # Product/comic catalog
├── images/
│   ├── 1234567890-tshirt.png
│   └── comic-1-cover.png
├── products/
│   └── ssbb-logo-tee.html
└── comics/
    └── issue-01.html
```

### API Endpoints

**Public:**
- `GET /api/discountpunk/content` - Returns product catalog

**BotButt only:**
- `POST /api/discountpunk/product` - Create product
- `POST /api/discountpunk/comic` - Create comic

### CORS

Server now allows requests from:
- Client origin (ssbb.pretendo.tv web UI)
- Azure Static Web Apps domains
- discountpunk.com (when DNS is set up)

## How BotButt Uses It

When someone in SSBB chat says:
- "BotButt, add X to the shop"
- "Create a comic about Y"

BotButt's system prompt includes instructions and tool definitions. She calls:
- `add_product()` → generates image → saves to S3 → updates catalog
- `create_comic()` → generates cover → saves HTML to S3

## Deployment

### SSBB Server Changes
These changes need to be deployed to **ssbb.pretendo.tv**:
1. New discountpunk service files
2. Updated index.ts with routes and CORS
3. Updated provider.ts with BotButt's new tools

Standard SSBB deployment process applies.

### Static Site (discountpunk.com)
Hosted on Azure Static Web Apps. Fetches content from SSBB API.

**Deploy:**
```bash
cd ~/zorro_kilroy/discountpunk.com
./deploy.sh
```

**Live URL:** https://red-water-05c15131e-preview.westus2.7.azurestaticapps.net

## Testing Locally

1. **Start SSBB server:**
   ```bash
   cd ~/zorro_kilroy/ssbb
   npm run dev:server
   ```

2. **Test BotButt's tools in chat:**
   - Go to http://localhost:5173
   - Ask: "BotButt, add a test product to Discount Punk"

3. **Verify S3:**
   ```bash
   aws s3 ls s3://ssbb-media-dev/discountpunk/
   ```

4. **Test API:**
   ```bash
   curl http://localhost:4000/api/discountpunk/content
   ```

## Production Checklist

- [ ] Deploy SSBB server changes to ssbb.pretendo.tv
- [ ] Verify AWS credentials on prod server
- [ ] Verify S3 bucket access
- [ ] Test BotButt's tools in prod chat
- [ ] Deploy discountpunk.com static site
- [ ] Verify API calls work from Azure → ssbb.pretendo.tv
- [ ] (Optional) Set up custom domain in Azure + GoDaddy DNS

## Environment Variables (Production)

SSBB server needs:
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SSBB_MEDIA_BUCKET`
- `GPT_IMAGE_2_URI`
- `GPT_IMAGE_2_KEY`

Already configured if SSBB prod is running.
