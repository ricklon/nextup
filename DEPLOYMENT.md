# Deployment Guide for foofab.net

This guide walks through deploying NextUp to Cloudflare using your `foofab.net` domain with proper authentication.

## Prerequisites

- ✅ Cloudflare account
- ✅ Domain `foofab.net` managed by Cloudflare
- ✅ Wrangler CLI installed (included in project)
- 🔑 True Finals API credentials
- 🎥 OBS with WebSocket enabled

---

## Step 1: Authenticate Wrangler

```bash
pnpm wrangler login
```

This opens a browser window to authorize Wrangler with your Cloudflare account.

---

## Step 2: Create D1 Database

```bash
cd backend
pnpm wrangler d1 create tournament-assignments
```

**Output will look like:**
```
✅ Successfully created DB 'tournament-assignments'!

[[d1_databases]]
binding = "DB"
database_name = "tournament-assignments"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id` and update `backend/wrangler.toml`:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "tournament-assignments"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Replace with actual ID
```

---

## Step 3: Initialize Database Schema

```bash
pnpm wrangler d1 execute tournament-assignments --file=schema.sql
```

Verify it worked:
```bash
pnpm wrangler d1 execute tournament-assignments --command="SELECT * FROM assignments"
```

---

## Step 4: Deploy Cloudflare Worker

```bash
pnpm wrangler deploy
```

**Note the Worker URL from the output:**
```
Published tournament-worker (X.XX sec)
  https://tournament-worker.YOUR_ACCOUNT.workers.dev
```

Save this URL - you'll need it for the frontend configuration.

### Optional: Add Custom Domain to Worker

```bash
pnpm wrangler deployments view
# Then in Cloudflare Dashboard:
# Workers & Pages → tournament-worker → Settings → Triggers → Custom Domains
# Add: api.foofab.net
```

---

## Step 5: Deploy Frontend to Cloudflare Pages

### Option A: Via GitHub (Recommended)

1. **Set up GitHub Secrets** (see [.github/SECRETS.md](.github/SECRETS.md))

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **GitHub Actions will automatically deploy**

4. **Connect custom domain:**
   - Go to Cloudflare Dashboard → Workers & Pages → tournament-assignment-ui
   - Custom Domains → Set up custom domain
   - Add: `nextup.foofab.net`

### Option B: Via Wrangler CLI

```bash
cd frontend

# Build the frontend
pnpm build

# Deploy to Cloudflare Pages
pnpm wrangler pages deploy dist --project-name=tournament-assignment-ui
```

**Set up custom domain:**
```bash
# In Cloudflare Dashboard or via API
# Pages → tournament-assignment-ui → Custom Domains
# Add: nextup.foofab.net
```

---

## Step 6: Configure Environment Variables for Pages

In Cloudflare Dashboard → Workers & Pages → tournament-assignment-ui → Settings → Environment variables:

Add these variables:

| Variable | Value | Example |
|----------|-------|---------|
| `VITE_TF_USER_ID` | Your True Finals user ID | `user-123` |
| `VITE_TF_API_KEY` | Your True Finals API key | `tf_xxxxx` |
| `VITE_OBS_URL` | OBS WebSocket URL | `ws://localhost:4444` |
| `VITE_OBS_PASSWORD` | OBS password (optional) | `` |
| `VITE_WORKER_URL` | Your worker URL | `https://tournament-worker.YOUR_ACCOUNT.workers.dev` or `https://api.foofab.net` |
| `VITE_TOURNAMENT_ID` | Default tournament (optional) | `` |

**Redeploy** after adding variables:
```bash
pnpm wrangler pages deploy dist --project-name=tournament-assignment-ui
```

---

## Step 7: Set Up Cloudflare Access (Authentication)

Cloudflare Access is **FREE** for up to 50 users and provides email-based authentication.

### 7.1 Enable Cloudflare Access

1. Go to Cloudflare Dashboard → Zero Trust
2. If first time: Set up your team name (e.g., `foofab`)
3. This creates your team domain: `foofab.cloudflareaccess.com`

### 7.2 Configure Identity Provider

**Settings → Authentication → Login methods → Add new:**

**Option A: One-time PIN (Email)**
- Simple, no setup needed
- Users get a code via email
- Good for small tournaments

**Option B: Google OAuth**
- Professional, uses Google accounts
- Good if refs have Google emails

**Option C: GitHub OAuth**
- Good for tech-savvy teams

**For now, enable "One-time PIN"** (it's already enabled by default).

### 7.3 Create Access Application

1. **Access → Applications → Add an application → Self-hosted**

2. **Application Configuration:**
   - Application name: `NextUp - Tournament Assignment`
   - Session duration: `12 hours` (or duration of your tournament)
   - Application domain: `nextup.foofab.net`

3. **Create Access Policy:**
   - Policy name: `Tournament Refs`
   - Action: `Allow`
   - Configure rules:
     - **Option A:** Emails
       - Selector: `Emails`
       - Value: `ref1@example.com, ref2@example.com`
     - **Option B:** Email domain
       - Selector: `Email ending in`
       - Value: `@foofab.net`
     - **Option C:** Allow everyone (testing only)
       - Selector: `Everyone`

4. **Save the application**

### 7.4 Verify Access Works

1. Navigate to `https://nextup.foofab.net`
2. You'll be redirected to Cloudflare Access login
3. Enter allowed email → Receive PIN → Enter PIN → Access granted
4. Session lasts for configured duration (12 hours)

---

## Step 8: Set Up Worker Authentication (Optional but Recommended)

Since your frontend is protected by Cloudflare Access, you can also validate the Access JWT token in your worker.

### 8.1 Get Cloudflare Access Team Domain

From Zero Trust dashboard, note your team domain: `foofab.cloudflareaccess.com`

### 8.2 Add JWT Validation to Worker

Update `backend/src/index.ts`:

```typescript
// Add at the top
interface Env {
	DB: D1Database;
	CLOUDFLARE_TEAM_DOMAIN?: string; // e.g., "foofab.cloudflareaccess.com"
}

// Add this function
async function getAuthenticatedUser(request: Request, env: Env): Promise<string | null> {
	// Get the JWT token from Cloudflare Access
	const jwt = request.headers.get('Cf-Access-Jwt-Assertion');

	if (!jwt || !env.CLOUDFLARE_TEAM_DOMAIN) {
		return null;
	}

	try {
		// Verify the JWT against Cloudflare's public keys
		const certsUrl = `https://${env.CLOUDFLARE_TEAM_DOMAIN}/cdn-cgi/access/certs`;
		const response = await fetch(certsUrl);
		const { keys } = await response.json();

		// In production, properly verify JWT signature
		// For now, we'll decode the payload (consider using a JWT library)
		const payload = JSON.parse(atob(jwt.split('.')[1]));

		return payload.email; // Return authenticated user's email
	} catch (error) {
		console.error('JWT validation error:', error);
		return null;
	}
}

// In your POST /api/assignments handler:
const userEmail = await getAuthenticatedUser(request, env);
const assignedBy = userEmail || body.assignedBy || 'Unknown';

// Use assignedBy in the database insert...
```

### 8.3 Add Team Domain to Worker Environment

Update `backend/wrangler.toml`:

```toml
[vars]
CLOUDFLARE_TEAM_DOMAIN = "foofab.cloudflareaccess.com"
```

Redeploy:
```bash
cd backend
pnpm wrangler deploy
```

---

## Step 9: DNS Configuration

Your DNS should automatically be configured when you add custom domains, but verify:

### In Cloudflare Dashboard → DNS → Records:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | nextup | tournament-assignment-ui.pages.dev | ✅ Proxied |
| CNAME | api | tournament-worker.YOUR_ACCOUNT.workers.dev | ✅ Proxied |

Or use Wrangler:
```bash
# Cloudflare handles this automatically when you add custom domains
```

---

## Step 10: Verify Everything Works

### 10.1 Test Worker API

```bash
curl https://api.foofab.net/api/assignments?tournamentId=test-123
# Should return: []
```

### 10.2 Test Frontend

1. Navigate to `https://nextup.foofab.net`
2. Log in via Cloudflare Access (enter your email, get PIN)
3. Select tournament
4. Assign a match
5. Verify assignment appears in the UI

### 10.3 Test OBS Connection

1. Make sure OBS is running with WebSocket enabled
2. In the UI, verify "OBS Connected" status
3. Assign a match and verify OBS scene switches

---

## Step 11: GitHub Actions Configuration

Update your GitHub secrets with the correct values:

```bash
# Repository → Settings → Secrets and variables → Actions

CLOUDFLARE_API_TOKEN=<your_token>
CLOUDFLARE_ACCOUNT_ID=<your_account_id>
VITE_TF_USER_ID=<true_finals_user_id>
VITE_TF_API_KEY=<true_finals_api_key>
VITE_WORKER_URL=https://api.foofab.net
VITE_OBS_URL=ws://localhost:4444
VITE_OBS_PASSWORD=<if_set>
VITE_TOURNAMENT_ID=<optional>
```

Push to main to trigger deployment:
```bash
git push origin main
```

---

## Architecture with Custom Domain

```
┌─────────────────────────────────────────────────────────────┐
│ https://nextup.foofab.net                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Cloudflare Access Login                                 │ │
│ │ (Email + PIN or OAuth)                                  │ │
│ └─────────────────────┬───────────────────────────────────┘ │
│                       ↓                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Svelte Frontend (Cloudflare Pages)                      │ │
│ │ - Tournament selection                                  │ │
│ │ - Match assignment UI                                   │ │
│ │ - OBS control                                           │ │
│ └───────┬─────────────────────────────────────────────────┘ │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │
          ├──→ https://api.foofab.net/api/assignments
          │    (Cloudflare Worker + D1)
          │
          ├──→ https://truefinals.com/api/v1/...
          │    (True Finals API)
          │
          └──→ ws://localhost:4444
               (OBS WebSocket)
```

---

## Costs

- **Cloudflare Workers:** Free tier (100k requests/day)
- **Cloudflare Pages:** Free (unlimited bandwidth)
- **Cloudflare D1:** Free tier (5GB storage, 5M reads/day)
- **Cloudflare Access:** Free for up to 50 users
- **Domain (foofab.net):** Already owned ✅

**Total: $0/month** for typical tournament usage!

---

## Maintenance

### View Logs

**Worker logs:**
```bash
cd backend
pnpm wrangler tail
```

**Pages logs:**
```bash
cd frontend
pnpm wrangler pages deployment tail
```

### View Database

```bash
cd backend
pnpm wrangler d1 execute tournament-assignments --command="SELECT * FROM assignments"
```

### Update Allowed Users

1. Cloudflare Dashboard → Zero Trust → Access → Applications
2. Select "NextUp - Tournament Assignment"
3. Edit policy → Add/remove emails
4. Save

---

## Troubleshooting

### Issue: "Access Denied" on nextup.foofab.net

**Solution:** Add your email to the Access policy allowlist

### Issue: Worker returns CORS errors

**Solution:** Check that CORS headers are properly set in `backend/src/index.ts`

### Issue: OBS not connecting

**Solution:**
- Verify OBS WebSocket is enabled: Tools → WebSocket Server Settings
- Check port: Default is 4444
- If OBS is on another machine, use `ws://OBS_IP:4444`
- Note: Browser may block `ws://` from `https://` page (security)
  - Consider using local OBS or secure tunnel

### Issue: Frontend can't reach worker

**Solution:** Verify `VITE_WORKER_URL` is set correctly in Pages environment variables

---

## Next Steps

1. ✅ Deploy worker and create database
2. ✅ Deploy frontend to Pages
3. ✅ Set up custom domains (nextup.foofab.net, api.foofab.net)
4. ✅ Enable Cloudflare Access authentication
5. ✅ Add allowed referee emails to Access policy
6. 🎮 Test at a tournament!

For advanced authentication and user management, see [SECURITY.md](SECURITY.md).
