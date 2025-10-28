# URL Library to Policy Management Integration

## Overview

The URL Library and Policy Management systems are now fully integrated, allowing you to create page-specific policies directly from URLs in your library.

## Complete Flow

### Flow 1: From URL Library to Policy Editor

```
Grounding API → URL Library → Click + Icon → Policy Editor (URL pre-filled) → Save → Policy Indicator Updates
```

1. **URL Gets Added to Library**
   - When any URL is fetched via the Grounding API, it's automatically stored in the URL Library
   - The library tracks parse count, title, description, and other metadata

2. **View URLs in Library**
   - Navigate to **URL Library** tab in the dashboard
   - You'll see all parsed URLs with their metadata
   - The **Policy** column shows current policy status:
     - 🌐 **Open Access**: No licensing required
     - 🛡️ **Default Policy**: Using publisher-wide default
     - 📄 **Page-Specific**: Has a dedicated page-level policy
     - **No Policy**: Not yet configured

3. **Create Policy from URL**
   - In the **Actions** column, click the purple **+** (PlusCircle) icon
   - This navigates to the Policy Management page with the URL pre-filled
   - The modal opens automatically with the URL pattern set

4. **Configure and Save**
   - The URL pattern field will be pre-populated
   - Add a policy name and description
   - Configure licensing rules (agents, pricing, purposes, rate limits)
   - Click **Save Policy**

5. **See Updated Indicator**
   - Return to URL Library
   - The URL now shows **📄 Page-Specific** policy indicator
   - Click the **👁️ (eye) icon** to view full content and rate details

### Flow 2: Direct Policy Creation

```
Policy Management Tab → Click "Page-Specific Policy" → Enter URL → Configure → Save → Library Updates
```

1. Navigate to **Policy Management** tab
2. Click **+ Page-Specific Policy** button
3. Manually enter the URL pattern
4. Configure the policy
5. Save
6. The URL Library automatically reflects the new policy

## Features

### URL Library Actions

Each URL in the library has three action buttons:

| Icon | Color | Action | Description |
|------|-------|--------|-------------|
| 👁️ Eye | Blue | View Content | Opens modal showing parsed content, metadata, and current rate info |
| ➕ Plus Circle | Purple | Create Policy | Navigates to Policy Editor with URL pre-filled |
| 🗑️ Trash | Red | Delete URL | Removes URL from library (doesn't affect policies) |

### Policy Indicators

The Policy column shows visual indicators:

- **🌐 Open Access** (Gray) - No licensing, free access
- **🛡️ Default Policy** (Blue) - Using publisher-wide default rules
- **📄 Page-Specific** (Purple) - Has dedicated page-level policy
- **No Policy** (Gray) - Not configured yet

### Policy Types

#### Default Publisher Policy
- Applies to all URLs unless overridden
- One per publisher
- Shown in URL Library as "Default Policy"
- Created in Policy Management → "Create Default Policy"

#### Page-Specific Policies
- Override default for specific URLs
- Multiple policies allowed (one per URL pattern)
- Shown in URL Library as "Page-Specific"
- Created either:
  - From URL Library (click + icon)
  - From Policy Management tab (manual entry)

## Technical Details

### URL Parameter Passing

When you click the + icon in URL Library:
1. Navigate to `/policy?url=<encoded-url>`
2. PolicyEditorNew reads the `url` query parameter
3. Automatically opens the modal with URL pre-filled
4. After save, parameter is cleared

### Policy Matching Priority

When content is requested via Grounding API:
1. Check for **page-specific policy** matching exact URL
2. If not found, use **default publisher policy**
3. If no default exists, return error

### Data Flow

```
┌─────────────────┐
│  Grounding API  │
│  POST /grounding│
└────────┬────────┘
         │
         ├──> Fetch & Parse URL
         │
         ├──> Store in parsed_urls table
         │
         └──> Check policies table
              │
              ├──> Page-specific? (WHERE url_pattern = $url)
              │    └──> Use page-specific rules
              │
              └──> Default? (WHERE url_pattern IS NULL)
                   └──> Use default rules

┌─────────────────┐
│  URL Library UI │
│  /url-library   │
└────────┬────────┘
         │
         ├──> Display parsed_urls
         │
         ├──> Show policy indicators
         │
         └──> + icon → Navigate to /policy?url=...

┌─────────────────┐
│ Policy Editor UI│
│  /policy        │
└────────┬────────┘
         │
         ├──> Read ?url= parameter
         │
         ├──> Auto-open modal with URL
         │
         └──> Save to policies table
```

## API Endpoints Used

- `GET /parsed-urls` - List all URLs in library
- `GET /parsed-urls/:id` - Get full URL details
- `DELETE /parsed-urls/:id` - Remove URL from library
- `GET /api/policies/:publisherId` - List all policies
- `PUT /api/policies/:publisherId` - Create/update policy
- `DELETE /api/policies/:policyId` - Delete policy
- `POST /grounding` - Fetch content and apply licensing

## Examples

### Example 1: Create Policy for Specific Article

1. You parse `https://example.com/articles/premium-content`
2. URL appears in library with "No Policy"
3. Click purple + icon next to the URL
4. Policy editor opens with URL pre-filled
5. Set pricing: $0.005 per fetch
6. Configure: Allow OpenAI, ClaudeBot
7. Save
8. Return to library - now shows "📄 Page-Specific"

### Example 2: Use Default Policy

1. You parse multiple URLs from `example.com`
2. All show "No Policy"
3. Go to Policy Management
4. Create Default Policy with $0.002 pricing
5. Return to library - all URLs now show "🛡️ Default Policy"
6. Create page-specific for one URL - it shows "📄 Page-Specific"

## Testing

To test the complete flow:

1. **Add URLs to library** (via Grounding API or manual parse)
2. **Open dashboard**: http://localhost:5173
3. **Navigate to URL Library** tab
4. **Click + icon** on any URL
5. **Verify** policy editor opens with URL pre-filled
6. **Configure and save** the policy
7. **Return to URL Library**
8. **Verify** indicator changes to "Page-Specific"

## Notes

- Deleting a URL from the library does NOT delete its policy
- Deleting a policy does NOT delete URLs from the library
- Policy changes take effect immediately for new grounding requests
- Each page-specific policy must have a unique URL pattern per publisher
- Only one default policy allowed per publisher
