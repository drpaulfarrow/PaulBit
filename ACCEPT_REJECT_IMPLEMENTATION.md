# Accept/Reject Negotiation Implementation

## Summary
Added accept/reject functionality for AI-to-AI negotiations with automatic license creation.

## Changes Made

### 1. Database Migration (015_add_license_linking.sql)
- Added `license_id` column to negotiations table with foreign key to `license_options(id)`
- Replaced `use_case` TEXT[] with `license_type` INTEGER (0-4) to align with license system
- Created indexes on `license_id` and `license_type` for performance

### 2. Backend API (negotiation-agent/src/server.js)

#### POST /api/negotiations/:id/accept
- Validates negotiation exists and status is 'negotiating'
- Extracts terms from `final_terms` or `current_terms`:
  - `price`: from terms.price or terms.preferred_price (default 0.005)
  - `license_type`: from negotiation.license_type (default 1 - RAG Unrestricted)
  - `currency`: 'USD'
  - `term_months`: from terms.term_months or 12
  - `max_word_count`: from terms.max_word_count or null
  - `attribution_required`: from terms.attribution_required or false
- Creates new `license_options` record
- Updates negotiation:
  - status = 'accepted'
  - license_id = newly created license ID
  - final_terms = extracted terms
  - completed_at = NOW()
- Emits WebSocket event: `negotiation:accepted` to publisher room
- Returns created license object

#### POST /api/negotiations/:id/reject
- Updates negotiation status to 'rejected'
- Stores rejection reason in `context` JSONB field
- Sets completed_at timestamp
- Emits WebSocket event: `negotiation:rejected` to publisher room
- Returns success status

### 3. Frontend API Client (negotiationApi.js)

#### acceptNegotiation(negotiationId, publisherId)
- Calls POST /api/negotiations/:id/accept
- Returns created license object

#### rejectNegotiation(negotiationId, publisherId, reason)
- Calls POST /api/negotiations/:id/reject
- Includes optional rejection reason

### 4. UI Components (ActiveNegotiations.jsx)

#### New State Management
- `actionLoading`: Tracks which negotiation is being processed (prevents double-clicks)
- `showRejectDialog`: Controls rejection confirmation modal
- `rejectReason`: Stores user-provided rejection reason

#### Accept Handler
- Shows confirmation dialog: "Accept this negotiation? A license will be created..."
- Calls acceptNegotiation API
- Shows success message with created license ID
- Reloads negotiations list to reflect status change
- Displays loading spinner during processing

#### Reject Handler
- Opens modal dialog for rejection confirmation
- Allows optional reason entry (textarea)
- Calls rejectNegotiation API
- Shows success message
- Reloads negotiations list
- Closes dialog and clears reason

#### UI Updates
- Action buttons only shown for negotiations with status='negotiating'
- Green "Accept & Create License" button (full width)
- Red "Reject" button (full width)
- Buttons disabled during processing (gray background)
- Loading spinner shown during accept processing
- Click handlers use e.preventDefault() and e.stopPropagation() to avoid navigation

#### Real-time Updates
- WebSocket listener updated to reload list when 'accepted' or 'rejected' events received
- Maintains round updates in real-time
- Live connection indicator in header

## Testing

### Current Database State
```sql
SELECT id, client_name, status, license_type, current_round
FROM negotiations 
ORDER BY initiated_at DESC;

-- Result:
-- id: f84706be-0bf2-4c51-9498-65b70f7d2b1b
-- client_name: TestAI GPT-5
-- status: negotiating
-- license_type: 1 (RAG Unrestricted)
-- current_round: 0
```

### Test Steps
1. Navigate to http://localhost:5173/negotiations
2. Find "TestAI GPT-5" negotiation card
3. Click "Accept & Create License" button
   - Confirm in dialog
   - Verify success message shows license ID
   - Check negotiation moves to "Accepted" tab
   - Verify license created in license_options table
4. Or click "Reject" button
   - Enter optional reason
   - Click "Confirm Reject"
   - Verify negotiation moves to "Rejected" tab

### Database Verification
```sql
-- After accepting, check created license
SELECT id, license_type, price, status, created_at 
FROM license_options 
ORDER BY created_at DESC LIMIT 1;

-- Check negotiation is linked
SELECT id, status, license_id, completed_at 
FROM negotiations 
WHERE id = 'f84706be-0bf2-4c51-9498-65b70f7d2b1b';

-- After rejecting, check reason stored
SELECT id, status, context->>'rejection_reason' as reason 
FROM negotiations 
WHERE id = 'f84706be-0bf2-4c51-9498-65b70f7d2b1b';
```

## WebSocket Events

### negotiation:accepted
```json
{
  "type": "negotiation:accepted",
  "data": {
    "negotiationId": "uuid",
    "status": "accepted",
    "licenseId": 123,
    "license": {
      "id": 123,
      "license_type": 1,
      "price": 0.005,
      "currency": "USD",
      ...
    }
  }
}
```

### negotiation:rejected
```json
{
  "type": "negotiation:rejected", 
  "data": {
    "negotiationId": "uuid",
    "status": "rejected",
    "reason": "optional reason text"
  }
}
```

## License Type System (Unified)
All systems now use integer license types 0-4:
- 0: Training + Display
- 1: RAG Display (Unrestricted)
- 2: RAG Display (Max Words)
- 3: RAG Display (Attribution)
- 4: RAG No Display

## Files Modified
1. `database/migrations/015_add_license_linking.sql` (NEW)
2. `negotiation-agent/src/server.js` (Added 2 endpoints)
3. `publisher-dashboard/src/services/negotiationApi.js` (Added 2 methods)
4. `publisher-dashboard/src/pages/ActiveNegotiations.jsx` (Major update)

## Next Steps
- [ ] Add link from accepted negotiations to view created license
- [ ] Display license_id in negotiation details
- [ ] Add negotiation history to license detail page
- [ ] Implement email notifications for accept/reject
- [ ] Add bulk accept/reject functionality
