# Test AI-to-AI Negotiation Flow
# This script simulates an AI company negotiating with a publisher

$baseUrl = "http://localhost:3003"

Write-Host "`n=== Tollbit Negotiation Agent Test ===" -ForegroundColor Cyan

# 1. Get publisher list
Write-Host "`n[1] Fetching publisher list..." -ForegroundColor Yellow
$publishers = curl.exe -s "$baseUrl/api/publishers" | ConvertFrom-Json
Write-Host "Found $($publishers.Count) publishers" -ForegroundColor Green
$publishers | ForEach-Object { Write-Host "  - $($_.name) ($($_.hostname))" }

# Choose first publisher
$publisher = $publishers[0]
$publisherId = $publisher.id
$publisherHostname = $publisher.hostname

# 2. Get publisher strategy info
Write-Host "`n[2] Getting publisher strategy info..." -ForegroundColor Yellow
$strategyInfo = curl.exe -s "$baseUrl/api/strategies/publisher/$publisherId" | ConvertFrom-Json
$strategy = $strategyInfo[0]
Write-Host "Publisher: $($publisher.name)" -ForegroundColor Green
Write-Host "  Style: $($strategy.negotiation_style)"
Write-Host "  Min Price: `$$([math]::Round($strategy.min_price_per_fetch_micro / 1000000, 4))"
Write-Host "  Preferred Price: `$$([math]::Round($strategy.preferred_price_per_fetch_micro / 1000000, 4))"
Write-Host "  Max Rounds: $($strategy.max_rounds)"

# 3. Propose initial terms (below preferred, should trigger negotiation)
Write-Host "`n[3] Proposing initial terms (AI Company: TestAI)..." -ForegroundColor Yellow
$initialProposal = @{
    publisher_hostname = $publisherHostname
    client_name = "TestAI"
    proposed_terms = @{
        price_per_fetch_micro = 1200  # Lower than preferred
        token_ttl_seconds = 400
        burst_rps = 5
        purposes = @("inference")
    }
    url_patterns = @("https://$publisherHostname/*")
    context = @{
        note = "We are a new AI company looking for fair terms"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Initial Proposal:" -ForegroundColor Cyan
Write-Host "  Price: `$0.0012 per fetch"
Write-Host "  TTL: 400 seconds"
Write-Host "  RPS: 5"
Write-Host "  Purpose: inference"

# This would normally go through MCP, but we'll use a direct API for testing
# In production, AI companies would call this via MCP tools
$negotiationResult = curl.exe -s -X POST "$baseUrl/api/negotiations/initiate" `
    -H "Content-Type: application/json" `
    -d $initialProposal | ConvertFrom-Json

if ($negotiationResult.status -eq "negotiating") {
    Write-Host "`nNegotiation started!" -ForegroundColor Green
    Write-Host "  Negotiation ID: $($negotiationResult.negotiationId)" -ForegroundColor Cyan
    Write-Host "  Status: $($negotiationResult.status)"
    Write-Host "  Round: $($negotiationResult.round)"
    
    Write-Host "`nPublisher's Counter-Offer:" -ForegroundColor Magenta
    $counterOffer = $negotiationResult.counterOffer
    Write-Host "  Price: `$$([math]::Round($counterOffer.price_per_fetch_micro / 1000000, 4)) per fetch"
    Write-Host "  TTL: $($counterOffer.token_ttl_seconds) seconds"
    Write-Host "  RPS: $($counterOffer.burst_rps)"
    Write-Host "  Reasoning: $($counterOffer.reasoning)"
    Write-Host "  Tone: $($counterOffer.tone)"
    
    $negotiationId = $negotiationResult.negotiationId
    
    # 4. Submit counter-offer (meet in the middle)
    Write-Host "`n[4] Submitting counter-offer from AI company..." -ForegroundColor Yellow
    $counterProposal = @{
        negotiation_id = $negotiationId
        counter_terms = @{
            price_per_fetch_micro = 1600  # Meet closer to publisher's ask
            token_ttl_seconds = 600
            burst_rps = 8
            purposes = @("inference")
        }
    } | ConvertTo-Json -Depth 10
    
    Write-Host "Counter-Offer:" -ForegroundColor Cyan
    Write-Host "  Price: `$0.0016 per fetch (increased)"
    Write-Host "  TTL: 600 seconds (increased)"
    Write-Host "  RPS: 8 (increased)"
    
    $round2Result = curl.exe -s -X POST "$baseUrl/api/negotiations/counter" `
        -H "Content-Type: application/json" `
        -d $counterProposal | ConvertFrom-Json
    
    if ($round2Result.status -eq "accepted") {
        Write-Host "`nNegotiation ACCEPTED! ?" -ForegroundColor Green
        Write-Host "  Final terms met publisher's auto-accept threshold"
        Write-Host "  Price: `$$([math]::Round($round2Result.terms.price_per_fetch_micro / 1000000, 4))"
    } elseif ($round2Result.status -eq "negotiating") {
        Write-Host "`nRound $($round2Result.round) - Still negotiating..." -ForegroundColor Yellow
        Write-Host "Publisher's new counter-offer:" -ForegroundColor Magenta
        $newCounter = $round2Result.counterOffer
        Write-Host "  Price: `$$([math]::Round($newCounter.price_per_fetch_micro / 1000000, 4))"
        Write-Host "  TTL: $($newCounter.token_ttl_seconds) seconds"
        Write-Host "  RPS: $($newCounter.burst_rps)"
        Write-Host "  Reasoning: $($newCounter.reasoning)"
    }
    
    # 5. Get full negotiation status
    Write-Host "`n[5] Getting full negotiation history..." -ForegroundColor Yellow
    $fullStatus = curl.exe -s "$baseUrl/api/negotiations/$negotiationId" | ConvertFrom-Json
    Write-Host "Negotiation Summary:" -ForegroundColor Cyan
    Write-Host "  Status: $($fullStatus.status)"
    Write-Host "  Total Rounds: $($fullStatus.current_round)"
    Write-Host "  Started: $($fullStatus.initiated_at)"
    Write-Host "  Last Activity: $($fullStatus.last_activity_at)"
    
    Write-Host "`nRound History:" -ForegroundColor Cyan
    $fullStatus.rounds | ForEach-Object {
        Write-Host "  Round $($_.round_number) - $($_.actor) $($_.action)" -ForegroundColor Gray
        if ($_.reasoning) {
            Write-Host "    Reasoning: $($_.reasoning)" -ForegroundColor Gray
        }
    }
    
    # 6. Generate license if accepted
    if ($fullStatus.status -eq "accepted") {
        Write-Host "`n[6] Generating license from negotiated terms..." -ForegroundColor Yellow
        $license = curl.exe -s -X POST "$baseUrl/api/negotiations/$negotiationId/generate-license" | ConvertFrom-Json
        Write-Host "License generated! ?" -ForegroundColor Green
        Write-Host "  Policy ID: $($license.policy_id)" -ForegroundColor Cyan
        Write-Host "  License is now active and can be used for content access"
    }
    
} elseif ($negotiationResult.status -eq "accepted") {
    Write-Host "`nNegotiation AUTO-ACCEPTED! ?" -ForegroundColor Green
    Write-Host "Your proposal met the publisher's auto-accept threshold!"
    Write-Host "  Negotiation ID: $($negotiationResult.negotiationId)"
} elseif ($negotiationResult.status -eq "rejected") {
    Write-Host "`nNegotiation REJECTED! ?" -ForegroundColor Red
    Write-Host "Reason: $($negotiationResult.reason)"
}

# 7. Get analytics
Write-Host "`n[7] Getting negotiation analytics..." -ForegroundColor Yellow
$analytics = curl.exe -s "$baseUrl/api/analytics/negotiations?publisherId=$publisherId&days=30" | ConvertFrom-Json
Write-Host "Last 30 Days:" -ForegroundColor Cyan
$analytics.statistics | ForEach-Object {
    Write-Host "  $($_.status): $($_.count) negotiations (avg $([math]::Round($_.avg_rounds, 1)) rounds)" -ForegroundColor Gray
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
