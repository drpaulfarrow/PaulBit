# ==============================================
# MonetizePlus Educational - Safe Docker Hub Auto Push (Plain)
# Author: Paul Farrow
# ==============================================

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$dockerUser = "paulandrewfarrow"

Write-Host "Checking Docker login status..."
try {
    $loginInfo = docker info 2>$null | Out-String
    if ($loginInfo -notmatch "Username:\s+$dockerUser") {
        Write-Host "Not logged in as $dockerUser. Run 'docker login' first."
        exit 1
    }
} catch {
    Write-Host "Docker not available or not running."
    exit 1
}

Write-Host "`nBuilding all MonetizePlus images..."
try {
    docker-compose build | Out-Host
} catch {
    Write-Host "Build failed. Please fix errors before pushing."
    exit 1
}

Write-Host "`nScanning for local MonetizePlus images..."
try {
    # Clean output of carriage returns and whitespace
    $images = docker images --format "{{.Repository}}" |
        ForEach-Object { ($_ -replace "`r","").Trim() } |
        Where-Object { $_ -ne "" -and $_ -like "monetizeplus-*" }
} catch {
    Write-Host "Failed to list Docker images."
    exit 1
}

if (-not $images -or $images.Count -eq 0) {
    Write-Host "No local MonetizePlus images found."
    exit 1
}

Write-Host "`nFound the following images:"
$images | ForEach-Object { Write-Host "  $_" }

foreach ($img in $images) {
    if ($img -notmatch '^[a-z0-9\-]+$') {
        Write-Host "Skipping suspicious image name: $img"
        continue
    }

    $hubTag = "$dockerUser/$img:latest"
    Write-Host "`nTagging $img → $hubTag"

    try {
        docker tag "$img`:latest" "$hubTag"
    } catch {
        Write-Host "Failed to tag $img. Skipping..."
        continue
    }

    Write-Host "Pushing $hubTag..."
    try {
        docker push "$hubTag" | Out-Host
        Write-Host "Successfully pushed $hubTag"
    } catch {
        Write-Host "Push failed for $img. Check network or login."
        continue
    }
}

Write-Host "`nAll MonetizePlus images processed!"
Write-Host "Check them on Docker Hub: https://hub.docker.com/repositories/$dockerUser"
