# Page-Specific Policy Creation - Updated Flow

## Key Change
**Page-specific policies can ONLY be created for URLs that exist in your URL Library.**

## Two Ways to Create Page-Specific Policies

### Method 1: From URL Library (Recommended)
```
URL Library → Find URL → Click purple + icon → Policy editor opens → Configure → Save
```

**Steps:**
1. Navigate to **URL Library** tab
2. Browse your parsed URLs
3. Click the **purple + icon** next to any URL
4. Policy editor opens with that URL **already selected**
5. Configure policy rules
6. Save

**Advantage:** URL is automatically selected, faster workflow

---

### Method 2: From Policy Management Tab
```
Policy Management → Click "Page-Specific Policy" → Select from dropdown → Configure → Save
```

**Steps:**
1. Navigate to **Policy Management** tab
2. Click **+ Page-Specific Policy** button
3. **Select URL from dropdown** (only shows URLs in your library)
4. Configure policy rules
5. Save

**Advantage:** Can see all URLs and policies in one place

---

## What's New?

### Before (Old Behavior) ❌
- Could type **any URL** manually
- No validation
- Could create policies for URLs not in library
- Disconnected from URL Library

### After (New Behavior) ✅
- **Dropdown selection only**
- Shows all URLs from your URL Library
- Cannot create policy for non-existent URL
- Integrated workflow

---

## URL Pattern Field Behavior

### When Creating New Policy:
- **Dropdown list** of available URLs
- Only shows URLs from parsed_urls table
- If library is empty: Shows message "No URLs in library"
- Shows count: "Select from X URLs in your library"

### When Editing Existing Policy:
- **Read-only field** (disabled input)
- URL pattern cannot be changed
- Message: "URL pattern cannot be changed after creation"

---

## Example Workflow

### Scenario: Create policy for specific article

1. **Parse URL** (happens via Grounding API):
   ```json
   POST /grounding
   {
     "url": "https://example.com/articles/premium",
     "clientId": "OpenAI",
     "purpose": "inference"
   }
   ```

2. **URL appears in library automatically**

3. **Go to URL Library tab**
   - See: `https://example.com/articles/premium`
   - Policy column shows: "No Policy"

4. **Click purple + icon**
   - Policy editor opens
   - URL is pre-selected in dropdown

5. **Configure policy:**
   - Name: "Premium Articles"
   - Rules: GPTBot at $0.005
   - Save

6. **Return to library:**
   - Policy column now shows: "📄 Page-Specific"

---

## Validation Rules

### Cannot create page-specific policy if:
- ❌ No URL selected from dropdown
- ❌ Policy name is empty
- ❌ No URLs exist in library (button still works, but dropdown is empty)

### Must have:
- ✅ URL selected from library dropdown
- ✅ Policy name filled in
- ✅ At least one rule (recommended)

---

## Benefits of This Approach

1. **Data Integrity**: Only URLs that actually exist can have policies
2. **User-Friendly**: Dropdown is easier than typing/pasting URLs
3. **Discovery**: Users can see what URLs are available
4. **Consistency**: One source of truth (URL Library)
5. **Validation**: Prevents typos and invalid URLs

---

## Dashboard Access

- **URL Library**: http://localhost:5173/url-library
- **Policy Management**: http://localhost:5173/policy

---

## Quick Reference

| Action | What You See |
|--------|--------------|
| New page-specific policy | Dropdown with URLs from library |
| Edit existing policy | Read-only URL field |
| No URLs in library | Empty dropdown + warning message |
| URL pre-filled (from library click) | Dropdown with URL already selected |
| Creating default policy | No URL field (applies to all pages) |

---

## Testing

To test the complete flow:

```powershell
# 1. Check what URLs are in library
curl.exe http://localhost:3000/parsed-urls

# 2. Open dashboard
start http://localhost:5173

# 3. Go to Policy Management → Click "Page-Specific Policy"
# 4. Verify dropdown shows URLs from step 1
# 5. Select a URL
# 6. Configure and save
# 7. Check URL Library - policy indicator should update
```
