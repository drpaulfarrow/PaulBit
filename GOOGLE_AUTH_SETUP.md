# Google OAuth Setup Guide

## ✅ Implementation Complete

Google OAuth has been successfully integrated into MAI Monetize! Follow the steps below to enable it.

---

## 🎯 What Was Implemented

### Backend (licensing-api)
- ✅ New table: `users` (stores Google user data)
- ✅ New table: `user_publishers` (maps users to publishers with roles)
- ✅ New route: `POST /api/auth/google` (verify Google ID token)
- ✅ New route: `GET /api/auth/verify` (verify JWT session)
- ✅ Dependency added: `google-auth-library`

### Frontend (publisher-dashboard)
- ✅ Google OAuth login page
- ✅ Publisher selector (if user has multiple publishers)
- ✅ Session management with JWT
- ✅ Backward compatible (falls back to password auth if Google not configured)
- ✅ Dependencies added: `@react-oauth/google`, `jwt-decode`

---

## 📋 Setup Steps (What YOU Need To Do)

### Step 1: Create Google Cloud Project (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account: `paulandrewfarrow@gmail.com`
3. Click **Select a Project** → **New Project**
4. **Project name**: `MAI-Monetize` (or any name you like)
5. Click **Create** (✨ **No billing/credit card required!**)

### Step 2: Configure OAuth Consent Screen (3 minutes)

1. In Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (allows any Google user)
3. Fill in the form:
   - **App name**: `MAI Monetize`
   - **User support email**: `paulandrewfarrow@gmail.com`
   - **Developer contact**: `paulandrewfarrow@gmail.com`
4. Click **Save and Continue**
5. **Scopes**: Skip this (click **Save and Continue**)
6. **Test users**: Optional - add your email if you want
7. Click **Back to Dashboard**

### Step 3: Create OAuth 2.0 Credentials (2 minutes)

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth 2.0 Client ID**
3. **Application type**: Select **Web application**
4. **Name**: `MAI Monetize Dashboard`
5. **Authorized JavaScript origins**: Add both:
   ```
   http://localhost
   https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net
   ```
6. **Authorized redirect URIs**: Add both:
   ```
   http://localhost/demo/
   https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/demo/
   ```
7. Click **Create**
8. **Save these credentials!** You'll see:
   ```
   Client ID: 123456789-abc123xyz.apps.googleusercontent.com
   Client Secret: GOCSPX-abc123xyz
   ```

### Step 4: Configure Local Environment

Create a `.env` file in `publisher-dashboard/`:

```bash
# publisher-dashboard/.env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

Replace `YOUR_CLIENT_ID_HERE` with the Client ID from Step 3.

### Step 5: Configure Azure Environment

Run this command with YOUR credentials:

```bash
az webapp config appsettings set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --settings \
    GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE.apps.googleusercontent.com" \
    GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE" \
    VITE_GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"
```

### Step 6: Assign Yourself to Publishers

After your first Google login, run this SQL to give yourself access:

```sql
-- Connect to your database
-- Replace 'YOUR_GOOGLE_ID' with the ID from your first login (check server logs)

-- Assign to Publisher 1
INSERT INTO user_publishers (user_id, publisher_id, role)
SELECT u.id, 1, 'admin'
FROM users u
WHERE u.email = 'paulandrewfarrow@gmail.com';

-- Assign to Publisher 2 (optional)
INSERT INTO user_publishers (user_id, publisher_id, role)
SELECT u.id, 2, 'admin'
FROM users u
WHERE u.email = 'paulandrewfarrow@gmail.com';
```

**Or use the built-in admin endpoint after deployment:**

```bash
# Get your user ID after first login
curl https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/api/auth/verify \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Then assign via API (to be implemented)
```

---

## 🚀 How It Works

### Authentication Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Google authentication popup
   ↓
3. Google returns ID token
   ↓
4. Frontend sends token to /api/auth/google
   ↓
5. Backend verifies with Google
   ↓
6. Backend creates/updates user in database
   ↓
7. Backend returns JWT session token + publishers list
   ↓
8. Frontend stores session token
   ↓
9. User selects publisher (if they have multiple)
   ↓
10. Dashboard loads
```

### Session Management

- **Duration**: 7 days
- **Storage**: localStorage (session token)
- **Verification**: Each page load verifies token with backend
- **Logout**: Clears localStorage

---

## 🔄 Backward Compatibility

The system is **backward compatible**:

- **If Google Client ID is set** → Uses Google OAuth
- **If Google Client ID is NOT set** → Falls back to legacy password auth

This means you can test locally without Google OAuth and enable it in production.

---

## 🧪 Testing

### Local Testing (Without Google OAuth)
```bash
# Don't set VITE_GOOGLE_CLIENT_ID
cd publisher-dashboard
npm run dev

# Uses legacy password: PCM2025!
```

### Local Testing (With Google OAuth)
```bash
# Set environment variable
cd publisher-dashboard
echo "VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com" > .env
npm run dev

# Sign in with Google button appears
```

### Production Testing
After deployment with Google credentials:
1. Visit `https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/demo/`
2. Click "Sign in with Google"
3. Authorize the app
4. Select publisher (if you're assigned to any)

---

## 🔐 Security Features

- ✅ Google verifies user identity
- ✅ JWT tokens expire after 7 days
- ✅ Server-side token verification
- ✅ User-to-publisher mapping in database
- ✅ Role-based access control ready (admin/editor/viewer)
- ✅ Secure session management

---

## 👥 User Management

### Add New User to Publisher

```bash
# After user signs in once, they'll be in the users table
# Then run this SQL:

INSERT INTO user_publishers (user_id, publisher_id, role)
VALUES (
  (SELECT id FROM users WHERE email = 'user@example.com'),
  1,  -- Publisher ID
  'admin'  -- Role: admin, editor, or viewer
);
```

### Remove User from Publisher

```sql
DELETE FROM user_publishers
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
AND publisher_id = 1;
```

### List Users for Publisher

```sql
SELECT u.email, u.name, up.role, up.created_at
FROM users u
JOIN user_publishers up ON u.id = up.user_id
WHERE up.publisher_id = 1;
```

---

## 🐛 Troubleshooting

### "Sign in with Google" button doesn't appear
- Check that `VITE_GOOGLE_CLIENT_ID` is set in environment
- Check browser console for errors
- Verify Client ID format ends with `.apps.googleusercontent.com`

### "Authentication failed" error
- Check server logs for details
- Verify `GOOGLE_CLIENT_ID` matches in frontend and backend
- Ensure authorized origins are configured correctly in Google Cloud

### "No publishers assigned" after login
- User exists but not assigned to any publishers
- Run the SQL from Step 6 to assign publishers
- Check `user_publishers` table

### "redirect_uri_mismatch" error
- Authorized redirect URIs must exactly match
- Add trailing slash: `/demo/` not `/demo`
- Check both http://localhost and https://your-domain

---

## 💰 Costs

**Google OAuth is 100% FREE**:
- ✅ Unlimited authentication requests
- ✅ Unlimited users
- ✅ No credit card required
- ✅ $0 cost

---

## 📚 Resources

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/gsi/web/guides/overview)
- [@react-oauth/google Docs](https://www.npmjs.com/package/@react-oauth/google)

---

## 🎯 Next Steps After Setup

1. ✅ Get Google Client ID (Steps 1-3 above)
2. ✅ Configure environment variables (Steps 4-5)
3. ✅ Deploy updated containers (I'll handle this)
4. ✅ Sign in with your Google account
5. ✅ Assign yourself to publishers (Step 6)
6. ✅ Start using the dashboard!

---

**Setup Time**: ~10 minutes
**Cost**: $0
**Difficulty**: Easy ⭐

Let me know when you have your Google Client ID and I'll deploy everything!

