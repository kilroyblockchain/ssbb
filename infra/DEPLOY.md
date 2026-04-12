# SSBB Deployment Runbook

Domain: **ssbb.discountpunk.com** (GoDaddy)
AWS region: **us-east-1**

---

## One-time setup (do these once, in order)

### 1 — Request TLS certificate (takes ~2 min)

CloudFront requires certs to be in us-east-1.

```bash
aws acm request-certificate \
  --region us-east-1 \
  --domain-name ssbb.discountpunk.com \
  --validation-method DNS \
  --query CertificateArn --output text
```

Copy the ARN it prints — you'll need it in step 4.

Then get the CNAME to add in GoDaddy:

```bash
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn <YOUR_CERT_ARN> \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

In GoDaddy DNS for discountpunk.com, add that CNAME record.
Certificate will validate within a few minutes.

---

### 2 — Create the ECR repository first (needed before CloudFormation)

```bash
aws ecr create-repository --region us-east-1 --repository-name ssbb-server
```

---

### 3 — Build and push the initial Docker image

```bash
# From the repo root
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/ssbb-server"

aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com"

docker build -f apps/server/Dockerfile -t "$ECR_URI:latest" .
docker push "$ECR_URI:latest"
```

---

### 4 — Deploy the CloudFormation stack

Replace the placeholders below with your real values:

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name ssbb-prod \
  --template-file infra/ssbb-stack.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    CertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID \
    ServerImage=ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/ssbb-server:latest \
    MediaBucket=YOUR_EXISTING_SSBB_MEDIA_BUCKET \
    BedrockModelId=us.anthropic.claude-sonnet-4-5-20251101-v1:0
```

⚠️  **Subnets**: The template has placeholder subnet logic.
Before deploying, edit `infra/ssbb-stack.yaml` and replace the `Subnets:` lines
in both `LoadBalancer` and `ECSService` with your actual public subnet IDs:

```bash
# Find your default VPC subnet IDs:
aws ec2 describe-subnets \
  --filters Name=defaultForAz,Values=true \
  --query 'Subnets[*].{ID:SubnetId,AZ:AvailabilityZone}' \
  --output table
```

Then update the template:
```yaml
# LoadBalancer > Subnets:
Subnets: [subnet-AAAA, subnet-BBBB]

# ECSService > NetworkConfiguration > AwsvpcConfiguration > Subnets:
Subnets: [subnet-AAAA, subnet-BBBB]
```

---

### 5 — Get the CloudFront domain name

```bash
aws cloudformation describe-stacks \
  --stack-name ssbb-prod \
  --query 'Stacks[0].Outputs' --output table
```

Look for `CloudFrontDomain` — it will be something like `d1abc123xyz.cloudfront.net`.

---

### 6 — Add CNAME in GoDaddy

In GoDaddy DNS for discountpunk.com, add:

| Type  | Name  | Value                          | TTL  |
|-------|-------|--------------------------------|------|
| CNAME | ssbb  | d1abc123xyz.cloudfront.net     | 600  |

Wait a few minutes for DNS to propagate, then https://ssbb.discountpunk.com is live.

---

### 7 — Create the Butt Bitch user accounts in Cognito

```bash
POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name ssbb-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
  --output text)

# Create each user (they'll be prompted to set a password on first login)
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

Each Butt Bitch logs in with their email and the temp password, then sets their own permanent password.

The email they log in with maps directly to their handle in the app — spanky@ssbb.net → Spanky ButtBooty, etc.

---

### 8 — Set GitHub Actions secrets

In the GitHub repo → Settings → Secrets → Actions, add:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `CLOUDFRONT_DISTRIBUTION_ID` | From the CloudFormation outputs |
| `COGNITO_USER_POOL_ID` | From the CloudFormation outputs |
| `COGNITO_CLIENT_ID` | From the CloudFormation outputs |

After that, every push to `main` auto-deploys both server and frontend.

---

## Add real auth to the server middleware

Right now the server uses `DEV_BYPASS_EMAIL`. Before going live, replace
`apps/server/src/middleware/auth.ts` with JWT verification:

```bash
npm install --workspace=apps/server aws-jwt-verify
```

Then in `auth.ts`, verify the Cognito JWT and extract the email claim.
I can write this for you — just say the word.

---

## Cost summary (~$32/mo for 5 users)

| Resource | Cost |
|----------|------|
| Fargate (0.5 vCPU / 1 GB, 24/7) | ~$14 |
| ALB | ~$16 |
| CloudFront + S3 | ~$2 |
| ECR storage | ~$0.50 |
| ACM certificate | Free |
| Cognito (< 50k users) | Free |

**Total: ~$32/month**

To cut costs: scale ECS to 0 at night with a scheduled action (~$8/mo).
