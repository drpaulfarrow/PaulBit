# Trigger Azure to redeploy with new images
# Get this URL from Azure Portal > monetizeplusapp > Deployment Center > Webhook URL

$webhookUrl = Read-Host "Paste your Azure webhook URL here"

if ($webhookUrl) {
    Write-Host "Triggering redeployment..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $webhookUrl -Method Post
    Write-Host "Redeployment triggered! Wait 2-3 minutes for Azure to pull new images." -ForegroundColor Green
} else {
    Write-Host "No webhook URL provided" -ForegroundColor Red
}
