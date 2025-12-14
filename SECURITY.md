# Security & Access Control

## Current State: No Authentication ⚠️

**Important:** The current implementation has **no authentication or access control**. Anyone with the URL can access the application and make assignments.

This is acceptable for:
- Internal tournament setups where the network is trusted
- Testing and development
- Small events where URL secrecy is sufficient

This is **NOT acceptable** for:
- Public-facing deployments
- Large tournaments with untrusted networks
- Situations requiring audit trails

---

## How to Access After Deployment

### Frontend URL

After deploying via GitHub Actions, your frontend will be accessible at:

**Cloudflare Pages:**
- URL format: `https://tournament-assignment-ui.pages.dev`
- Or custom domain if configured
- Find URL in: Cloudflare Dashboard → Workers & Pages → tournament-assignment-ui

**Vercel:**
- URL format: `https://tournament-assignment-ui.vercel.app`
- Find URL in: Vercel Dashboard → Your Project → Domains

**Netlify:**
- URL format: `https://tournament-assignment-ui.netlify.app`
- Find URL in: Netlify Dashboard → Site Overview → Site Information

### Backend Worker URL

- URL format: `https://tournament-worker.{your-account}.workers.dev`
- Find URL in: Cloudflare Dashboard → Workers & Pages → tournament-worker
- Or check the deployment logs in GitHub Actions

### Local OBS Connection

- OBS WebSocket must be accessible from the device running the frontend
- Default: `ws://localhost:4444` (same machine)
- For remote OBS: `ws://{OBS_MACHINE_IP}:4444`
- Configure in `.env` via `VITE_OBS_URL`

---

## Access Control Options

### Option 1: Network-Level Security (Recommended for MVP)

**Best for:** Tournament venues with controlled WiFi

#### Implementation:
1. Deploy frontend to private network or VPN-only access
2. Use Cloudflare Access (free tier available)
3. Restrict by IP ranges in Cloudflare firewall

**Cloudflare Access Setup:**
```bash
# In Cloudflare Dashboard:
# 1. Go to Zero Trust → Access → Applications
# 2. Add an application
# 3. Set domain: tournament-assignment-ui.pages.dev
# 4. Add policy: Allow emails ending with @yourdomain.com
#    OR Allow specific email addresses
```

**Cost:** Free for up to 50 users

---

### Option 2: Simple API Key Authentication

**Best for:** Quick deployment with basic security

Add API key validation to the Cloudflare Worker:

```typescript
// backend/src/index.ts
const API_KEY = env.API_KEY; // Set in wrangler.toml or secrets

// Validate on every request
const authHeader = request.headers.get('Authorization');
if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Frontend sends key:**
```typescript
fetch('/api/assignments', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});
```

**Pros:**
- Simple to implement
- No user management needed

**Cons:**
- Single shared key (no per-user tracking)
- Key can be extracted from frontend code
- No audit trail of who made changes

---

### Option 3: JWT-Based Authentication (Recommended for Production)

**Best for:** Multi-ref tournaments with audit requirements

#### Implementation:

1. **Add authentication service** (Auth0, Clerk, or Cloudflare Access)
2. **Frontend:** Login flow → Get JWT token
3. **Backend:** Validate JWT on each request

**Example with Cloudflare Access:**

```typescript
// backend/src/index.ts
async function validateCloudflareAccessJWT(request: Request, env: Env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!token) {
    return null;
  }

  // Verify JWT against Cloudflare's public keys
  const payload = await verifyJWT(token, env.CLOUDFLARE_TEAM_DOMAIN);
  return payload.email; // Return user identifier
}

// In your handlers:
const userEmail = await validateCloudflareAccessJWT(request, env);
if (!userEmail) {
  return new Response('Unauthorized', { status: 401 });
}

// Log user in assignment
await env.DB.prepare(
  'INSERT INTO assignments (..., assigned_by) VALUES (..., ?)'
).bind(..., userEmail).run();
```

**Pros:**
- Per-user authentication
- Audit trail (track who made each assignment)
- Revocable access

**Cons:**
- More complex setup
- Requires identity provider

---

### Option 4: Cloudflare Workers + D1 Session-Based Auth

**Best for:** Self-hosted auth without third-party services

Add a login system with sessions stored in D1:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ref',
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Implementation:**
- `/api/auth/login` - Verify credentials, create session
- `/api/auth/logout` - Delete session
- Middleware validates session on each request

**Pros:**
- Full control
- No third-party dependencies

**Cons:**
- You manage password security
- Need to implement password reset, etc.

---

## Recommended Approach by Use Case

### Small Tournament (1-2 refs, trusted venue)
✅ **Option 1: Network-Level Security**
- Use Cloudflare Access with email allowlist
- Free and quick to set up

### Medium Tournament (3-10 refs, public venue)
✅ **Option 3: JWT Authentication with Cloudflare Access**
- Refs login with email
- Audit trail included
- Revocable access

### Large Tournament (10+ refs, multiple venues)
✅ **Option 3: JWT + Auth0/Clerk**
- Professional identity provider
- Role-based access (admin vs ref)
- Integration with tournament registration

---

## Implementation Priority

### Phase 1: MVP (Current)
- ✅ No authentication
- ⚠️ URL secrecy only
- 📋 Manual credential sharing for True Finals API

### Phase 2: Basic Security (Recommended Next)
- 🔒 Cloudflare Access with email allowlist
- 🔑 API key for worker endpoints
- 📊 Log `assigned_by` field (manual entry)

### Phase 3: Production Ready
- 🔐 JWT-based authentication
- 👥 User management
- 📝 Full audit trail
- 🎭 Role-based permissions (admin, ref, viewer)

---

## Securing API Credentials

### True Finals API Keys

**Current approach:**
- API keys embedded in frontend build (⚠️ visible in browser)

**Better approach:**
- Proxy True Finals API calls through your Cloudflare Worker
- Worker stores credentials securely
- Frontend calls `/api/truefinals/tournaments` → Worker calls True Finals

**Implementation:**

```typescript
// backend/src/index.ts
if (path === '/api/truefinals/tournaments' && request.method === 'GET') {
  const response = await fetch('https://truefinals.com/api/v1/user/tournaments', {
    headers: {
      'x-api-user-id': env.TF_USER_ID,
      'x-api-key': env.TF_API_KEY
    }
  });
  return new Response(await response.text(), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

**Benefits:**
- API keys never exposed to frontend
- Centralized rate limiting
- Can add caching

---

## OBS Security

### Current Approach:
- Frontend connects directly to OBS WebSocket
- Password in frontend environment variables (⚠️ visible)

### Recommendations:

1. **Local Setup:** OBS on same machine as browser
   - URL: `ws://localhost:4444`
   - Less security concern (local connection)

2. **Remote OBS:** OBS on different machine
   - **Option A:** VPN or SSH tunnel
   - **Option B:** OBS WebSocket with strong password + HTTPS frontend
   - **Option C:** Reverse proxy with authentication

3. **Production Setup:**
   - Use OBS WebSocket v5 authentication
   - Rotate passwords regularly
   - Consider companion app approach (native desktop app)

---

## Next Steps to Add Authentication

If you want to add authentication now, I can help you implement any of these options:

1. **Quick Win:** Cloudflare Access (15 minutes)
2. **API Proxy:** Move True Finals API calls to worker (30 minutes)
3. **Session Auth:** D1-based login system (2-3 hours)
4. **JWT Auth:** Cloudflare Access + JWT validation (1 hour)

Which approach interests you most?
