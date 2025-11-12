# MonetizePlus Azure Deployment - Quick Reference

## 🚀 One-Line Deployment

### Option 1: Azure Cloud Shell (Recommended)
1. Open [Azure Cloud Shell](https://shell.azure.com)
2. Run:
```bash
curl -sS https://raw.githubusercontent.com/drpaulfarrow/MAI Monetize/main/azure-deploy.sh | bash
```

### Option 2: PowerShell (Windows)
```powershell
irm https://raw.githubusercontent.com/drpaulfarrow/MAI Monetize/main/azure-deploy.ps1 | iex
```

### Option 3: Local Bash
```bash
curl -O https://raw.githubusercontent.com/drpaulfarrow/MAI Monetize/main/azure-deploy.sh
chmod +x azure-deploy.sh
./azure-deploy.sh
```

## ⏱️ What Happens

The script performs these 12 steps automatically:

1. ✅ Generates a secure JWT secret
2. ✅ Creates/verifies resource group exists
3. ✅ Creates/verifies App Service plan exists
4. ✅ Creates/verifies Web App exists
5. ✅ Downloads docker-compose.azure.yml
6. ✅ Configures multi-container settings
7. ✅ Sets environment variables
8. ✅ Restarts the application
9. ✅ Waits 60 seconds for containers to start
10. ✅ Gets the application URL
11. ✅ Initializes the database with publishers and policies
12. ✅ Verifies database status

**Total time:** ~3-5 minutes

## 📋 What Gets Deployed

### Azure Resources
- **Resource Group:** `MonetizePlusRG`
- **App Service Plan:** `monetizeplusapp-plan` (B1 Linux)
- **Web App:** `monetizeplusapp`

### Docker Containers (from Docker Hub)
- `paulandrewfarrow/monetizeplus-licensing-api` - Main API
- `paulandrewfarrow/monetizeplus-publisher-dashboard` - Dashboard UI
- `paulandrewfarrow/monetizeplus-edge-worker` - Edge proxy
- `paulandrewfarrow/monetizeplus-negotiation-agent` - Negotiation service
- `postgres:15-alpine` - PostgreSQL database

### Database Content
- **Publishers:** 2 (Publisher A News, Publisher B Documentation)
- **Policies:** 2 (Both support GPTBot, ClaudeBot, Perplexity)
- **Plans:** 4 (Free Tier, Standard, Premium, Enterprise)
- **Clients:** 4 (OpenAI, Anthropic, Perplexity, Anonymous)

## 🔗 Access URLs

After deployment, your app will be available at:
- **Dashboard:** `https://monetizeplusapp.azurewebsites.net/`
- **API:** `https://monetizeplusapp.azurewebsites.net/api/`
- **Admin Status:** `https://monetizeplusapp.azurewebsites.net/admin/db-status`

## 🔐 Login

Use one of these default publishers:
- **Publisher A News** - hostname: `site-a.local`
- **Publisher B Documentation** - hostname: `site-b.local`

## 📊 View Logs

```bash
az webapp log tail --name monetizeplusapp --resource-group MonetizePlusRG
```

## 🔄 Redeploy / Update

To redeploy with latest images:
```bash
az webapp restart --name monetizeplusapp --resource-group MonetizePlusRG
```

To re-initialize database:
```bash
curl -X POST https://monetizeplusapp.azurewebsites.net/admin/init-db
```

## 🗑️ Delete Everything

```bash
az group delete --name MonetizePlusRG --yes --no-wait
```

## ⚙️ Customize Deployment

Edit these variables in the script:
- `APP_NAME` - Change app name (default: `monetizeplusapp`)
- `RESOURCE_GROUP` - Change resource group (default: `MonetizePlusRG`)
- `LOCATION` - Change Azure region (default: `eastus`)

## 🐛 Troubleshooting

### Deployment fails
- Check Azure CLI is installed: `az --version`
- Login to Azure: `az login`
- Check resource quotas in your subscription

### Database not initializing
Wait 60 seconds after deployment, then manually run:
```bash
curl -X POST https://monetizeplusapp.azurewebsites.net/admin/init-db
```

### Can't access the app
Check if containers are running:
```bash
az webapp log tail --name monetizeplusapp --resource-group MonetizePlusRG
```

## 📚 Documentation

- Full deployment guide: `deploy.md`
- Database initialization: `AZURE_DB_INIT.md`
- Architecture: `ARCHITECTURE.md`
- Project overview: `PROJECT_SUMMARY.md`
