# Test Negotiation Accept/Reject Guide

## Test Negotiations Created

### 1. Anthropic Claude (ID: 233cdfc0-3ed3-43cd-92b6-09a279c41626)
- **License Type**: 2 (RAG Display - Max Words)
- **Price**: $0.008
- **Term**: 24 months
- **Max Words**: 500
- **Attribution Required**: Yes

### 2. Google Gemini (ID: 9fea06eb-0bb2-4289-b7f4-78b448334438)
- **License Type**: 3 (RAG Display - Attribution)
- **Price**: $0.006
- **Term**: 12 months
- **Attribution Required**: Yes

### 3. Meta Llama (ID: fde887ed-9d75-498f-b10d-5698a58aacf2)
- **License Type**: 0 (Training + Display)
- **Price**: $0.015
- **Term**: 36 months

## Testing Steps

### Via UI (Recommended)
1. Open http://localhost:5173/negotiations
2. You should see 3 negotiations in the "In Progress" tab
3. Each card will have green "Accept & Create License" and red "Reject" buttons
4. Click "Accept & Create License" on any negotiation:
   - Confirm in the dialog
   - Success message will show the created license ID
   - Negotiation moves to "Accepted" tab
   - WebSocket updates in real-time
5. Click "Reject" on any negotiation:
   - Modal opens for optional reason
   - Enter reason (optional)
   - Click "Confirm Reject"
   - Negotiation moves to "Rejected" tab

### Via API (Testing Backend)

#### Accept Anthropic Claude:
```powershell
curl.exe -X POST http://localhost:3003/api/negotiations/233cdfc0-3ed3-43cd-92b6-09a279c41626/accept `
  -H "Content-Type: application/json" `
  -d '{\"publisherId\":1}'
```

Expected response:
```json
{
  "success": true,
  "negotiationId": "233cdfc0-3ed3-43cd-92b6-09a279c41626",
  "status": "accepted",
  "license": {
    "id": 11,
    "license_id": "lic_...",
    "license_type": 2,
    "price": "0.0080",
    "currency": "USD",
    "term_months": 24,
    "max_word_count": 500,
    "attribution_required": true,
    "status": "active"
  }
}
```

#### Reject Google Gemini:
```powershell
curl.exe -X POST http://localhost:3003/api/negotiations/9fea06eb-0bb2-4289-b7f4-78b448334438/reject `
  -H "Content-Type: application/json" `
  -d '{\"publisherId\":1, \"reason\":\"Price too high\"}'
```

Expected response:
```json
{
  "success": true,
  "negotiationId": "9fea06eb-0bb2-4289-b7f4-78b448334438",
  "status": "rejected"
}
```

## Verify Results

### Check Accepted Negotiation & Created License:
```powershell
# Check negotiation status
docker exec tollbit-postgres psql -U tollbit -d tollbit -c `
  "SELECT id, client_name, status, license_id, completed_at FROM negotiations WHERE id = '233cdfc0-3ed3-43cd-92b6-09a279c41626';"

# Check created license
docker exec tollbit-postgres psql -U tollbit -d tollbit -c `
  "SELECT id, license_id, license_type, price, currency, term_months, max_word_count, attribution_required, status FROM license_options ORDER BY created_ts DESC LIMIT 1;"
```

### Check Rejected Negotiation:
```powershell
docker exec tollbit-postgres psql -U tollbit -d tollbit -c `
  "SELECT id, client_name, status, context->>'rejection_reason' as reason, completed_at FROM negotiations WHERE id = '9fea06eb-0bb2-4289-b7f4-78b448334438';"
```

### View All Negotiations:
```powershell
docker exec tollbit-postgres psql -U tollbit -d tollbit -c `
  "SELECT id, client_name, status, license_type, license_id FROM negotiations ORDER BY initiated_at DESC;"
```

### View All Created Licenses:
```powershell
docker exec tollbit-postgres psql -U tollbit -d tollbit -c `
  "SELECT id, license_id, license_type, price, currency, status FROM license_options ORDER BY created_ts DESC;"
```

## Expected Behavior

### Accept Flow:
1. ✅ License created in `license_options` table
2. ✅ Negotiation `status` changed to 'accepted'
3. ✅ Negotiation `license_id` linked to created license
4. ✅ `completed_at` timestamp set
5. ✅ `final_terms` stored from `current_terms`
6. ✅ WebSocket `negotiation:accepted` event emitted
7. ✅ UI refreshes automatically

### Reject Flow:
1. ✅ Negotiation `status` changed to 'rejected'
2. ✅ `completed_at` timestamp set
3. ✅ Rejection reason stored in `context` JSONB
4. ✅ WebSocket `negotiation:rejected` event emitted
5. ✅ UI refreshes automatically

## License Types Reference
- **0**: Training + Display
- **1**: RAG Display (Unrestricted)
- **2**: RAG Display (Max Words) - includes `max_word_count`
- **3**: RAG Display (Attribution) - requires attribution
- **4**: RAG No Display

## Cleanup (Reset Tests)
```powershell
# Delete all test data
docker exec tollbit-postgres psql -U tollbit -d tollbit -c `
  "DELETE FROM negotiations WHERE client_name IN ('Anthropic Claude', 'Google Gemini', 'Meta Llama', 'TestAI GPT-5');"
```
