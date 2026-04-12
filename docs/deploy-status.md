# Deployment Status — ssbb.pretendo.tv

**Last updated:** 2026-04-12  
**Blocked on:** New ACM cert needed for `ssbb.pretendo.tv` + GoDaddy DNS validation

> **Domain changed from `ssbb.discountpunk.com` to `ssbb.pretendo.tv`.**  
> The old cert (`arn:aws:acm:us-east-1:672930000617:certificate/6affb3a7-cd89-48a2-8655-353c55a1f19a`) was for the old domain — do not use it.

---

## What's done

| Step | Status |
|------|--------|
| ECR repository created | ✅ |
| Docker image built & pushed to ECR | ✅ |
| S3 media bucket created (`ssbb-media-prod`) | ✅ |
| ACM certificate for `ssbb.pretendo.tv` | ⏳ — requested, pending DNS validation |
| CloudFormation stack template ready | ✅ |
| GitHub Actions CI/CD workflow ready | ✅ |

---

## Step 1 — Request new ACM cert

```bash
aws acm request-certificate \
  --region us-east-1 \
  --domain-name ssbb.pretendo.tv \
  --validation-method DNS
```
Save the new cert ARN it prints.

---

## Step 2 — Get the CNAME validation values

```bash
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn arn:aws:acm:us-east-1:672930000617:certificate/ed9ea293-e816-49f4-8348-275d99d4c974 \
  --query 'Certificate.Status' --output text
```

---

## Step 3 — GoDaddy DNS for `pretendo.tv` (cert validation)

Log into GoDaddy DNS for `pretendo.tv` and add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `_fe2cee22b577dc2596b6ccfbf67b3dc5.ssbb` | `_247d7013693e8525fa4af5d4f259ba3c.jkddzztszm.acm-validations.aws.` | 600 |

**GoDaddy tip:** Enter just `_fe2cee22b577dc2596b6ccfbf67b3dc5.ssbb` in the Name field — GoDaddy automatically appends `.pretendo.tv`.

After a few minutes, cert status will flip from `PENDING_VALIDATION` → `ISSUED`.

Check cert status:
```bash
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn arn:aws:acm:us-east-1:672930000617:certificate/ed9ea293-e816-49f4-8348-275d99d4c974 \
  --query 'Certificate.Status' --output text
```

---

## Step 4 — Deploy the CloudFormation stack (once cert is ISSUED)

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name ssbb-prod \
  --template-file infra/ssbb-stack.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    CertificateArn=arn:aws:acm:us-east-1:672930000617:certificate/ed9ea293-e816-49f4-8348-275d99d4c974 \
    DomainName=ssbb.pretendo.tv \
    ServerImage=672930000617.dkr.ecr.us-east-1.amazonaws.com/ssbb-server:latest \
    MediaBucket=ssbb-media-prod \
    BedrockModelId=us.anthropic.claude-sonnet-4-5-20251101-v1:0
```
Takes ~10 min. Creates: ECS Fargate service, ALB, Cognito User Pool, CloudFront distribution.

---

## Step 5 — Get the CloudFront domain

```bash
aws cloudformation describe-stacks \
  --stack-name ssbb-prod \
  --query 'Stacks[0].Outputs' --output table
```
Copy `CloudFrontDomain` (looks like `d1abc123xyz.cloudfront.net`).

---

## Step 6 — GoDaddy DNS for `pretendo.tv` (route domain → CloudFront)

Second record in GoDaddy DNS for `pretendo.tv`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `ssbb` | `<CloudFrontDomain from above>` | 600 |

---

## Step 7 — Create Cognito user accounts

```bash
POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name ssbb-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
  --output text)

for EMAIL in spanky@ssbb.net booty@ssbb.net cheeky@ssbb.net jazzy@ssbb.net astro@ssbb.net; do
  aws cognito-idp admin-create-user \
    --user-pool-id "$POOL_ID" \
    --username "$EMAIL" \
    --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
    --temporary-password "ButtBitch2025!" \
    --message-action SUPPRESS
  echo "Created: $EMAIL"
done
```

---

## Step 8 — Add GitHub Actions secrets

In GitHub repo → Settings → Secrets → Actions:

| Secret | How to get the value |
|--------|----------------------|
| `AWS_ACCESS_KEY_ID` | Your AWS key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret |
| `CLOUDFRONT_DISTRIBUTION_ID` | From CloudFormation outputs |
| `COGNITO_USER_POOL_ID` | From CloudFormation outputs |
| `COGNITO_CLIENT_ID` | From CloudFormation outputs |

---

## Step 9 — Deploy the frontend

```bash
npm run build:web
aws s3 sync apps/web/dist s3://ssbb-web-prod/ --delete \
  --cache-control "public,max-age=31536000,immutable" --exclude "index.html"
aws s3 cp apps/web/dist/index.html s3://ssbb-web-prod/index.html \
  --cache-control "no-cache,no-store,must-revalidate"
```
(After this, CI/CD handles it automatically on every push to main.)

---

## Step 10 — Swap to real Cognito auth

Replace `DEV_BYPASS_EMAIL` middleware in `apps/server/src/middleware/auth.ts` with real JWT verification:
```bash
npm install --workspace=apps/server aws-jwt-verify
```
Then verify the Cognito JWT and extract the email claim. Tell Claude Code to do this step.

---

## Key ARNs / IDs

| Resource | Value |
|----------|-------|
| AWS Account | `672930000617` |
| AWS Region | `us-east-1` |
| ACM Cert ARN | `arn:aws:acm:us-east-1:672930000617:certificate/ed9ea293-e816-49f4-8348-275d99d4c974` |
| ECR Image | `672930000617.dkr.ecr.us-east-1.amazonaws.com/ssbb-server:latest` |
| Media Bucket | `ssbb-media-prod` |
| Stack Name | `ssbb-prod` |
