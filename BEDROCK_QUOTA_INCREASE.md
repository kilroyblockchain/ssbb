# Bedrock Quota Increase Request

BotButt hit the daily token limit on **May 1, 2026** at ~6:14 AM UTC.

## What We Did

### 1. Implemented Multi-Region Failover ✅
- **Primary**: us-east-1 (N. Virginia)
- **Failover 1**: us-west-2 (Oregon)
- **Failover 2**: eu-west-1 (Ireland)
- **Failover 3**: ap-southeast-2 (Sydney)

When us-east-1 throttles, BotButt automatically tries the next region. This gives you **4x the daily quota** across all regions.

### 2. Request Quota Increase (Manual)

The daily token quotas are **not adjustable via API**, so you need to request an increase through AWS Support.

#### Current Quota
- **Model**: Claude Sonnet 4.5 V1 (`us.anthropic.claude-sonnet-4-5-20251101-v1:0`)
- **Quota**: 5,400,000 tokens/day (per region)
- **Quota Code**: L-381AD9EE

#### How to Request
1. Go to **AWS Service Quotas console**: https://console.aws.amazon.com/servicequotas/
2. Search for "Bedrock"
3. Find: **"Model invocation max tokens per day for Anthropic Claude Sonnet 4.5 V1"**
4. Click **"Request increase"**
5. **Desired value**: `50,000,000` (50M tokens/day)
6. **Reason**: "Production AI assistant (BotButt) for music collaboration app. Currently hitting daily limit at ~6 AM daily. Need 10x increase to support 5 active users."
7. Submit for each region:
   - us-east-1
   - us-west-2
   - eu-west-1
   - ap-southeast-2

AWS typically responds within 24-48 hours. Increases are usually approved for production workloads.

## Current Status

✅ **Multi-region failover deployed** (May 1, 2026 ~1:20 AM PST)
⏳ **Manual quota increase request pending** (submit via AWS Support Console)

## Testing Failover

Once deployed, BotButt will automatically try other regions when throttled. You'll see logs like:

```
[bedrock] us-east-1 throttled, trying next region...
[bedrock] ✓ Failover to us-west-2 succeeded
```

## Cost Impact

Multi-region failover has **no additional cost** — Bedrock pricing is the same across all regions.

Quota increase will allow more usage but same per-token pricing (~$3 per million input tokens, ~$15 per million output tokens for Sonnet 4.5).
