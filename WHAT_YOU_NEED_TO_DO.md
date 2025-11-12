# 🎯 What You Need To Do - Google OAuth Setup

## ✅ What's Already Done (by AI)

All code has been implemented and deployed:
- ✅ Database migration for users and permissions
- ✅ Backend Google OAuth verification endpoint
- ✅ Frontend Google Sign-In button
- ✅ Publisher selection screen
- ✅ Session management
- ✅ Docker images rebuilt and pushed
- ✅ Deployed to Azure

**Your app is live but will use legacy password auth until you complete the steps below.**

---

## 📋 What YOU Need To Do (10 minutes)

### Step 1: Create Google Cloud Project (5 minutes) ⭐

1. **Go to**: [https://console.cloud.google.com](https://console.cloud.google.com)
2. **Sign in** with: `paulandrewfarrow@gmail.com`
3. Click **"Select a project"** (top bar)
4. Click **"NEW PROJECT"**
5. **Project name**: `MAI-Monetize` (or any name)
6. Click **"CREATE"**

✨ **No credit card needed!** ✨

---

### Step 2: Enable OAuth Consent Screen (3 minutes)

1. In left menu: **APIs & Services** → **OAuth consent screen**
2. Select **"External"** → Click **"CREATE"**
3. Fill in the form:
   - **App name**: `MAI Monetize`
   - **User support email**: `paulandrewfarrow@gmail.com`
   - **Developer contact email**: `paulandrewfarrow@gmail.com`
4. Click **"SAVE AND CONTINUE"**
5. **Scopes page**: Just click **"SAVE AND CONTINUE"** (skip)
6. **Test users page**: Click **"SAVE AND CONTINUE"** (skip)
7. Click **"BACK TO DASHBOARD"**

---

### Step 3: Create OAuth Credentials (2 minutes) ⭐⭐

1. In left menu: **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth 2.0 Client ID"**
4. **Application type**: Select **"Web application"**
5. **Name**: `MAI Monetize Dashboard`

6. **Authorized JavaScript origins** - Click "+ ADD URI" twice and add:
   ```
   http://localhost
   ```
   ```
   https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net
   ```

7. **Authorized redirect URIs** - Click "+ ADD URI" twice and add:
   ```
   http://localhost/demo/
   ```
   ```
   https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/demo/
   ```

8. Click **"CREATE"**

9. **📋 COPY THESE CREDENTIALS!** You'll see a popup:
   ```
   Your Client ID
   123456789-abc123xyz.apps.googleusercontent.com
   
   Your Client Secret
   GOCSPX-abc123xyz
   ```

**⚠️ SAVE THESE SOMEWHERE SAFE!** You'll need them in the next step.

---

### Step 4: Configure Azure (1 minute) ⭐⭐⭐

Open your terminal and run this command (replace with YOUR credentials from Step 3):

```bash
az webapp config appsettings set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --settings \
    GOOGLE_CLIENT_ID="PASTE_YOUR_CLIENT_ID_HERE" \
    GOOGLE_CLIENT_SECRET="PASTE_YOUR_CLIENT_SECRET_HERE" \
    VITE_GOOGLE_CLIENT_ID="PASTE_YOUR_CLIENT_ID_HERE"
```

Example (with fake credentials):
```bash
az webapp config appsettings set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --settings \
    GOOGLE_CLIENT_ID="123456789-abc123xyz.apps.googleusercontent.com" \
    GOOGLE_CLIENT_SECRET="GOCSPX-abc123xyz456" \
    VITE_GOOGLE_CLIENT_ID="123456789-abc123xyz.apps.googleusercontent.com"
```

Then restart:
```bash
az webapp restart --name monetizeplusapp --resource-group MonetizePlusRG
```

---

### Step 5: Test Google Login (1 minute)

1. Wait 30 seconds after restart
2. Go to: **https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/demo/**
3. You should see **"Sign in with Google"** button (not password field!)
4. Click it and sign in with your Google account
5. You'll see: **"No publishers assigned to your account"**

That's expected! Move to Step 6.

---

### Step 6: Assign Yourself to Publishers (2 minutes)

After your first Google login, assign yourself access:

#### Option A: Via SQL (Fastest)

Connect to your Azure database and run:

```sql
-- Assign paulandrewfarrow@gmail.com to Publisher 1
INSERT INTO user_publishers (user_id, publisher_id, role)
SELECT u.id, 1, 'admin'
FROM users u
WHERE u.email = 'paulandrewfarrow@gmail.com'
ON CONFLICT DO NOTHING;

-- Assign to Publisher 2 (optional)
INSERT INTO user_publishers (user_id, publisher_id, role)
SELECT u.id, 2, 'admin'
FROM users u
WHERE u.email = 'paulandrewfarrow@gmail.com'
ON CONFLICT DO NOTHING;
```

#### Option B: Via psql Command Line

```bash
# Get database password from your notes
DB_PASSWORD="svD4gyjaa3wCMOtf%2FmoKuRtbI9NqDeV2"

# Connect and run assignment
PGPASSWORD="svD4gyjaa3wCMOtf/moKuRtbI9NqDeV2" psql \
  -h monetizeplus-db.postgres.database.azure.com \
  -U monetizeplus \
  -d monetizeplus \
  -c "INSERT INTO user_publishers (user_id, publisher_id, role) SELECT u.id, 1, 'admin' FROM users u WHERE u.email = 'paulandrewfarrow@gmail.com' ON CONFLICT DO NOTHING;"
```

---

### Step 7: Enjoy! 🎉

1. Refresh the dashboard page
2. You should now see your publishers to select
3. Click one and access the full dashboard!

---

## 🔄 Fallback: Use Legacy Auth (If Google Setup is Delayed)

If you're not ready to set up Google OAuth yet, the app still works with the old method:

**DON'T set `VITE_GOOGLE_CLIENT_ID`** and it will fall back to:
- Password: `PCM2025!`
- Publisher selection by ID

---

## 📊 Summary Table

| Step | Time | Cost | Difficulty |
|------|------|------|------------|
| 1. Create Google Cloud Project | 2 min | $0 | Easy ⭐ |
| 2. OAuth Consent Screen | 3 min | $0 | Easy ⭐ |
| 3. Create OAuth Credentials | 2 min | $0 | Easy ⭐ |
| 4. Configure Azure | 1 min | $0 | Easy ⭐ |
| 5. Test Login | 1 min | $0 | Easy ⭐ |
| 6. Assign Publishers | 1 min | $0 | Medium ⭐⭐ |
| **TOTAL** | **10 min** | **$0** | **Easy** |

---

## 🆘 Need Help?

### Common Issues

**Q: I see "redirect_uri_mismatch" error**
A: Make sure you added the exact URLs with trailing slashes:
   - `http://localhost/demo/`
   - `https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/demo/`

**Q: Button says "Sign in with Google" but nothing happens**
A: Check browser console. Usually means Client ID is invalid or not set.

**Q: I signed in but have no publishers**
A: You need to run the SQL from Step 6 to assign yourself.

**Q: I want to use password auth instead**
A: Just don't set `GOOGLE_CLIENT_ID` environment variables. It will fall back automatically.

---

## 📱 Contact

If you get stuck:
1. Check browser console for errors
2. Check Azure logs: `az webapp log tail --name monetizeplusapp --resource-group MonetizePlusRG`
3. Review `GOOGLE_AUTH_SETUP.md` for detailed technical docs

---

**🎯 Next: Complete Steps 1-6 above to enable Google OAuth!**

Current status: ✅ Code deployed, ⏳ Waiting for Google credentials

