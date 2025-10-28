# Policy Tester - Interactive Visualization Tool

## Overview

The **Policy Tester** is an interactive dashboard page that lets you visualize how different bots interact with your URLs under various policy configurations. It provides real-time testing and clear visual feedback on access decisions.

## Access

**URL**: http://localhost:5173/test

**Navigation**: Dashboard → 🧪 Policy Tester (in sidebar)

---

## Features

### 1. **Visual Bot Testing**
Select any URL from your library and simulate visits from different bots:
- GPTBot (OpenAI)
- ClaudeBot (Anthropic)
- Perplexity
- GoogleBot
- BingBot
- UnknownBot (any unlisted bot)

### 2. **Purpose Testing**
Test different use cases:
- **Inference**: Real-time AI responses
- **Training**: Model training data collection
- **Research**: Research purposes

### 3. **Two Testing Modes**

#### Single Test
- Select URL, bot, and purpose
- Click **"Run Single Test"**
- See immediate result with details

#### Quick Suite
- Click **"Run Quick Suite (4 Bots)"**
- Automatically tests 4 common bots (GPTBot, ClaudeBot, Perplexity, UnknownBot)
- Shows results for all bots in sequence
- Great for comparing policy enforcement across bots

---

## Visual Results

Each test result shows:

### ✅ ACCESS GRANTED (Green)
- **Price**: Cost per fetch
- **License Type**: ON_DEMAND_LICENSE, RESTRICTED, etc.
- **License Path**: Which policy was applied (page-specific or default)
- Full response data (expandable)

### ❌ ACCESS DENIED (Red)
- **Error message**: Why access was denied
- **Status code**: HTTP status (403, 404, etc.)
- Details about policy violation

---

## Example Workflows

### Scenario 1: Test Default Policy
```
1. Go to Policy Tester
2. Select any URL from dropdown
3. Select "UnknownBot"
4. Click "Run Single Test"
5. Result shows whether default policy allows/blocks
```

### Scenario 2: Compare Bot Access
```
1. Select a specific URL
2. Click "Run Quick Suite"
3. See side-by-side results:
   ✅ GPTBot: ACCESS GRANTED ($0.002)
   ✅ ClaudeBot: ACCESS GRANTED ($0.002)
   ✅ Perplexity: ACCESS GRANTED ($0.002)
   ❌ UnknownBot: ACCESS DENIED
```

### Scenario 3: Test Page-Specific Policy
```
1. Create page-specific policy for a URL
2. Set higher price: $0.005 for that URL
3. In Policy Tester, select that URL
4. Run test with GPTBot
5. Result shows $0.005 (page-specific wins over default)
```

### Scenario 4: Test Purpose Restrictions
```
1. Create policy: Allow inference, deny training
2. Run test with purpose="inference" → ✅ Granted
3. Run test with purpose="training" → ❌ Denied
```

---

## Understanding Results

### Status Codes
- **200**: Success, content returned
- **403**: Forbidden (policy denied access)
- **404**: URL not found
- **500**: Server error

### License Types
- **ON_DEMAND_LICENSE**: Page-specific policy applied
- **RESTRICTED**: Default policy or no license available
- **OPEN_ACCESS**: No licensing required (free access)

### Policy Priority
Results show which policy was used:
1. **Page-Specific Policy** (highest priority)
2. **Default Publisher Policy** (fallback)
3. **No Policy** (error/denied)

---

## Visual Elements

### Result Cards
Each test result is displayed as an expandable card with:
- ✅ or ❌ icon indicating access decision
- Status code badge
- Timestamp
- Bot name and purpose
- URL being accessed
- Quick pricing/license info
- Expandable JSON response

### Color Coding
- **Green**: Access granted, successful license application
- **Red**: Access denied, policy violation
- **Blue**: Informational (links, details)
- **Gray**: Neutral info (timestamps, status)

---

## Testing Best Practices

### Before Testing
1. ✅ Ensure URLs exist in your library (parse via Grounding API)
2. ✅ Create at least one policy (default or page-specific)
3. ✅ Know which bots you want to test

### During Testing
1. Start with **Quick Suite** to see overall behavior
2. Then do **Single Tests** for specific scenarios
3. Use **Show Full Response** to debug issues
4. **Clear Results** between major test changes

### What to Look For
- ✅ Expected bots get access
- ❌ Unwanted bots are blocked
- 💰 Correct pricing is applied
- 🎯 Page-specific policies override defaults
- 🔍 License paths show correct policy

---

## Integration with Other Features

### Works With URL Library
- URLs in tester dropdown come from URL Library
- Test a URL → go to URL Library to see policy indicator
- Create policy from library → test it immediately

### Works With Policy Management
- Create/edit policies in Policy Management
- Test them in Policy Tester
- See real-time enforcement

### Works With Analytics
- Tests appear in Usage Logs (if logged)
- Test different scenarios to see what gets tracked
- Validate analytics data accuracy

---

## Example Test Scenarios

### 1. **New Publisher Setup**
```
Goal: Verify default policy works

Steps:
1. Create default policy: Block all except GPTBot, ClaudeBot
2. Set price: $0.002
3. Go to Policy Tester
4. Run Quick Suite
5. Expected Results:
   ✅ GPTBot: Granted at $0.002
   ✅ ClaudeBot: Granted at $0.002
   ❌ Perplexity: Denied
   ❌ UnknownBot: Denied
```

### 2. **Premium Content Testing**
```
Goal: Ensure premium content has higher pricing

Steps:
1. Select premium article URL
2. Create page-specific policy: $0.010
3. Test GPTBot
4. Expected Result: ✅ Granted at $0.010 (not default $0.002)
```

### 3. **Bot Allowlist Testing**
```
Goal: Only allow specific bots

Steps:
1. Create default policy: deny all
2. Create rules for GPTBot and ClaudeBot only
3. Run Quick Suite
4. Expected Results:
   ✅ GPTBot: Granted
   ✅ ClaudeBot: Granted
   ❌ Perplexity: Denied
   ❌ UnknownBot: Denied
```

### 4. **Purpose-Based Access**
```
Goal: Allow inference but not training

Steps:
1. Create policy with "inference" in allowed purposes
2. Test same bot with purpose="inference" → ✅ Granted
3. Test same bot with purpose="training" → ❌ Denied
```

---

## Troubleshooting

### "No URLs in library"
- **Cause**: Haven't parsed any URLs yet
- **Fix**: Use Grounding API to fetch a URL first
- URLs automatically appear in library after parsing

### All tests show "ACCESS DENIED"
- **Cause**: No policies created
- **Fix**: Go to Policy Management → Create Default Policy

### Tests timeout or error
- **Cause**: API not responding
- **Fix**: Check Docker containers are running
- Verify licensing-api is healthy

### Wrong pricing shown
- **Cause**: Multiple policies conflict
- **Fix**: Check Policy Management for overlapping policies
- Remember: Page-specific > Default

---

## Technical Details

### How It Works
1. Selects URL from library
2. Makes POST request to `/grounding` endpoint
3. Passes bot name as `clientId`
4. Passes purpose (inference/training/research)
5. API checks policies and returns decision
6. Result displayed with color-coded visual feedback

### API Endpoint Used
```javascript
POST http://localhost:3000/grounding
{
  "url": "https://example.com/article",
  "clientId": "GPTBot",
  "purpose": "inference"
}
```

### Response Structure
```json
{
  "content": { ... },
  "rate": {
    "priceMicros": 2000,
    "currency": "USD",
    "licenseType": "ON_DEMAND_LICENSE",
    "licensePath": "page-specific-policy"
  },
  "metadata": { ... }
}
```

---

## Quick Reference

| Feature | What It Does |
|---------|--------------|
| **URL Dropdown** | Select from parsed URLs in library |
| **Bot Dropdown** | Choose which bot to simulate |
| **Purpose Dropdown** | Select use case (inference/training/research) |
| **Run Single Test** | Test one configuration |
| **Run Quick Suite** | Test 4 common bots at once |
| **Clear Results** | Remove all test results from view |
| **Show Full Response** | Expand to see complete JSON response |
| **Green Card** | Access granted with pricing details |
| **Red Card** | Access denied with error message |

---

## Summary

The Policy Tester provides:
- ✅ **Visual feedback** on policy enforcement
- 🧪 **Interactive testing** without manual API calls
- 📊 **Side-by-side comparison** of bot access
- 🔍 **Detailed results** for debugging
- 🎯 **Real-time validation** of policy changes

Perfect for understanding and demonstrating how your content licensing policies work in practice!
