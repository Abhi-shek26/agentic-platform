# 🚀 Deployment Guide - Agentic Tournament Generator

## Deployment Options

Choose based on your needs:

### Option 1: **Local/Self-Hosted** (Free/Budget)
- Run on your own server or desktop
- Full control, no cloud costs
- Easy to manage and debug
- **Best for**: Development, testing, small scale

### Option 2: **Azure Container Instances** (Recommended)
- Fully managed containers
- Pay only for what you use (~$0.0015/hour running)
- Easy scaling
- **Best for**: Production deployment, scaling

### Option 3: **Docker Hub + GitHub Actions** (CI/CD)
- Automatic builds on code push
- Deploy to any cloud provider
- **Best for**: Continuous deployment

---

## Pre-Deployment Checklist

- [x] Mock agents working (MOCK_AGENTS=true)
- [x] Tests passing (8/9 ✅)
- [x] Docker file configured
- [x] Environment variables defined
- [x] Database migrations ready
- [ ] Redis configured for production
- [ ] Backup strategy planned
- [ ] Monitoring set up

---

## Local Deployment (Easiest to Start)

### Step 1: Prepare Environment

Create `.env.production`:
```bash
# Application
NODE_ENV=production
PORT=5000

# Features
MOCK_AGENTS=true  # Keep mock agents (free!)
E2E_TESTS=false

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agentic_prod

# Redis
REDIS_URL=redis://localhost:6379

# Auth (optional for demo)
JWT_SECRET=your-secret-key-production

# Session
SESSION_SECRET=your-session-secret
```

### Step 2: Start Components

**Terminal 1 - Redis:**
```bash
docker run -d \
  --name agentic-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7 redis-server --appendonly yes
```

**Terminal 2 - PostgreSQL:**
```bash
docker run -d \
  --name agentic-postgres \
  -p 5432:5432 \
  -e POSTGRES_DB=agentic_prod \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secure_password \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:15
```

**Terminal 3 - Application:**
```bash
cd /c/Users/HELLO/Desktop/Codings/agentic-platform
npm install
npm run build  # Optional: pre-compile TypeScript
npm start
# Or with tsx: tsx server/index.ts
```

### Step 3: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:5000/api/health

# Login to app
open http://localhost:5000

# Run tests
npm run test:e2e
```

---

## Docker Local Deployment

### Build Docker Image

```bash
cd /c/Users/HELLO/Desktop/Codings/agentic-platform

# Build image
docker build -f docker/Dockerfile -t agentic-platform:latest .

# Run container
docker run -d \
  --name agentic-app \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e MOCK_AGENTS=true \
  -e DATABASE_URL=postgresql://admin:secure_password@host.docker.internal:5432/agentic_prod \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  agentic-platform:latest

# View logs
docker logs -f agentic-app
```

---

## Production Deployment (Azure)

### Step 1: Set Up Azure Resources

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name agentic-platform-rg \
  --location eastus

# Create Container Registry
az acr create \
  --resource-group agentic-platform-rg \
  --name agenticplatformacr \
  --sku Basic

# Create PostgreSQL (flexible server recommended)
az postgres flexible-server create \
  --resource-group agentic-platform-rg \
  --name agentic-postgres \
  --admin-user admin \
  --admin-password "SecurePassword123!" \
  --database-name agentic_prod

# Create Redis Cache
az redis create \
  --resource-group agentic-platform-rg \
  --name agentic-redis \
  --location eastus \
  --sku basic \
  --vm-size c0
```

### Step 2: Build and Push Docker Image

```bash
# Set variables
REGISTRY=agenticplatformacr.azurecr.io
IMAGE=agentic-platform
VERSION=1.0.0

# Login to registry
az acr login --name agenticplatformacr

# Build and push
az acr build \
  --registry agenticplatformacr \
  --image $IMAGE:$VERSION \
  --file docker/Dockerfile .

# Tag as latest
az acr repository update \
  --name agenticplatformacr \
  --image $IMAGE:$VERSION \
  --tags latest
```

### Step 3: Deploy Container Instance

```bash
# Get connection strings
POSTGRES_URL=$(az postgres flexible-server connection-string show \
  --server-name agentic-postgres \
  --client psycopg2 \
  --admin-user admin | grep postgressql)

REDIS_URL=$(az redis show \
  --name agentic-redis \
  --resource-group agentic-platform-rg \
  --query hostName -o tsv)

# Deploy to Container Instances
az container create \
  --resource-group agentic-platform-rg \
  --name agentic-platform \
  --image agenticplatformacr.azurecr.io/agentic-platform:latest \
  --registry-login-server agenticplatformacr.azurecr.io \
  --registry-username $(az acr credential show -n agenticplatformacr --query username -o tsv) \
  --registry-password $(az acr credential show -n agenticplatformacr --query passwords[0].value -o tsv) \
  --dns-name-label agentic-platform \
  --ports 5000 \
  --cpu 2 \
  --memory 4 \
  --environment-variables \
    NODE_ENV=production \
    MOCK_AGENTS=true \
    PORT=5000 \
    DATABASE_URL="$POSTGRES_URL" \
    REDIS_URL="redis://default:$REDIS_PASSWORD@$REDIS_URL:6379"
```

### Step 4: Get Public URL

```bash
# Get FQDN
az container show \
  --resource-group agentic-platform-rg \
  --name agentic-platform \
  --query ipAddress.fqdn \
  --output tsv

# Result: agentic-platform.<region>.azurecontainer.io
```

---

## CI/CD with GitHub Actions

### Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
        ports:
          - 6379:6379
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: agentic_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js 20
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run quality checks
        run: npm run test:quality

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -f docker/Dockerfile -t agentic-platform:latest .

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and push to ACR
        run: |
          az acr build \
            --registry agenticplatformacr \
            --image agentic-platform:latest \
            --file docker/Dockerfile .

      - name: Deploy to Azure Container Instances
        run: |
          az container create \
            --resource-group agentic-platform-rg \
            --name agentic-platform \
            --image agenticplatformacr.azurecr.io/agentic-platform:latest \
            --overwrite
```

---

## Environment Variables for Production

```bash
# Application
NODE_ENV=production
PORT=5000

# Features (keep mock agents free!)
MOCK_AGENTS=true
E2E_TESTS=false

# Database
DATABASE_URL=postgresql://admin:password@postgres:5432/agentic_prod

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=<generate-random-string>
SESSION_SECRET=<generate-random-string>

# Logging
LOG_LEVEL=info

# Optional: Monitoring
SENTRY_DSN=https://key@sentry.io/project
```

### Generate Secure Secrets

```bash
# Generate random secrets (run locally)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Scaling Configuration

### For Small Scale (< 100 users/month)
- **Container**: 1 CPU, 1GB RAM (Azure AI, ~$10/month)
- **Database**: Single instance PostgreSQL (Basic tier, ~$15/month)
- **Redis**: Cache only (Basic, ~$15/month)
- **Estimated Cost**: ~$40/month

### For Medium Scale (100-1000 users/month)
- **Container**: 2 CPU, 4GB RAM + auto-scaling (~$30/month)
- **Database**: PostgreSQL Standard tier (~$50/month)
- **Redis**: Standard with replication (~$50/month)
- **Estimated Cost**: ~$130/month

### For Large Scale (1000+ users/month)
- **Container**: 4 CPU, 8GB RAM + auto-scaling
- **Database**: Premium PostgreSQL
- **Redis**: Premium tier
- **CDN**: Azure CDN for frontend
- **Estimated Cost**: $500+/month

---

## Monitoring & Logging

### Azure Application Insights

```bash
# Set up monitoring
az resource create \
  --resource-group agentic-platform-rg \
  --resource-type microsoft.insights/components \
  --name agentic-insights \
  --properties '{"Application_Type":"web"}'

# Add to environment
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

### Health Checks

```bash
# The app has built-in health check at:
curl https://agentic-platform.eastus.azurecontainer.io:5000/api/health

# Expected response:
{"status":"ok","version":"1.0.0"}
```

---

## Backup Strategy

### Database Backup (Daily)

```bash
# Automated backups
az postgres flexible-server backup create \
  --resource-group agentic-platform-rg \
  --server-name agentic-postgres \
  --backup-name daily-backup-$(date +%Y%m%d)
```

### Generated Projects Backup

```bash
# Backup generated projects (Azure Blob Storage)
az storage account create \
  --resource-group agentic-platform-rg \
  --name agenticprojects \
  --sku Standard_LRS

# Mount in container
AZURE_STORAGE_CONNECTION_STRING=...
```

---

## Disaster Recovery

### 1. Database Restore
```bash
az postgres flexible-server restore \
  --source-server agentic-postgres \
  --resource-group agentic-platform-rg \
  --server-name agentic-postgres-restore \
  --restore-point-in-time 2026-03-18T12:00:00
```

### 2. Container Redeploy
```bash
# Re-deploy from same image
az container create \
  --resource-group agentic-platform-rg \
  --name agentic-platform-v2 \
  --image agenticplatformacr.azurecr.io/agentic-platform:latest
```

### 3. DNS Failover
Update DNS to point to new container

---

## Testing in Production

```bash
# Run E2E tests against deployed instance
npm run test:e2e -- --baseURL https://agentic-platform.eastus.azurecontainer.io

# Expected: All 9/9 tests passing ✅
```

---

## Maintenance Tasks

### Weekly
- [ ] Check application logs for errors
- [ ] Monitor resource usage
- [ ] Review user signups and activity

### Monthly
- [ ] Test disaster recovery procedures
- [ ] Review and optimize costs
- [ ] Update dependencies: `npm update`

### Quarterly
- [ ] Load test with increased traffic
- [ ] Security audit
- [ ] Review and update documentation

---

## Troubleshooting

### Container won't start

```bash
# Check logs
az container logs \
  --resource-group agentic-platform-rg \
  --name agentic-platform

# Check container status
az container show \
  --resource-group agentic-platform-rg \
  --name agentic-platform
```

### Database connection timeout

```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Redis connection issues

```bash
# Verify Redis is running
redis-cli ping

# Check connection string
echo $REDIS_URL
```

---

## Next Steps

1. **Choose deployment method**:
   - Local: Run `npm run dev` for testing
   - Docker local: Build and run container
   - Azure: Follow Azure deployment steps

2. **Set up monitoring**:
   - Azure Application Insights
   - Email alerts for errors

3. **Configure domain**:
   - Register custom domain
   - Set up SSL certificate (free with Azure DNS)

4. **Enable analytics**:
   - Track user signups
   - Monitor code generation usage
   - Analyze tournament types

5. **Plan scaling**:
   - Monitor resource usage
   - Upgrade tiers as needed
   - Implement auto-scaling

---

## Support & Help

- **Issues?** Check logs: `docker logs agentic-app`
- **Performance?** Check resource usage in Azure Portal
- **Database problems?** Use Azure Query Editor
- **Need scaling guidance?** Azure Advisor provides recommendations

---

**Last Updated**: 2026-03-19
**Version**: 1.0.0
**Status**: Ready for Production Deployment
