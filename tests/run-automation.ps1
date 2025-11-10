#!/usr/bin/env pwsh

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Ensuring backend test dependencies"
Push-Location "$Root/licensing-api"
if (-not (Test-Path "node_modules")) {
  npm install --no-progress --silent
}
npm test
Pop-Location

Write-Host "==> Ensuring dashboard test dependencies"
Push-Location "$Root/publisher-dashboard"
if (-not (Test-Path "node_modules")) {
  npm install --no-progress --silent
}
npm test
Pop-Location

Write-Host "==> Running integration smoke tests"
Push-Location $Root
bash tests/run-tests.sh
Pop-Location

Write-Host "==> All automated test suites completed"

