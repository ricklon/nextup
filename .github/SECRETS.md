# GitHub Secrets Configuration

This document lists all the GitHub secrets you need to configure for automated testing and deployment.

## Required Secrets

Navigate to your repository → Settings → Secrets and variables → Actions → New repository secret

### Cloudflare Secrets

#### `CLOUDFLARE_API_TOKEN`
- **Description:** API token for deploying to Cloudflare Workers and Pages
- **How to get it:**
  1. Log into Cloudflare Dashboard
  2. Go to "My Profile" → "API Tokens"
  3. Click "Create Token"
  4. Use the "Edit Cloudflare Workers" template
  5. Add permissions for "Cloudflare Pages" if deploying frontend to Pages
  6. Copy the token

#### `CLOUDFLARE_ACCOUNT_ID`
- **Description:** Your Cloudflare account ID
- **How to get it:**
  1. Log into Cloudflare Dashboard
  2. Select any domain
  3. Look at the URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/...`
  4. Or find it in the right sidebar under "Account ID"

### True Finals API Secrets

#### `VITE_TF_USER_ID`
- **Description:** Your True Finals API user ID
- **How to get it:** From your True Finals account settings

#### `VITE_TF_API_KEY`
- **Description:** Your True Finals API key
- **How to get it:** From your True Finals account settings

### OBS Configuration Secrets

#### `VITE_OBS_URL`
- **Description:** OBS WebSocket URL
- **Default value:** `ws://localhost:4444`
- **Note:** Update if OBS is on a different machine/port

#### `VITE_OBS_PASSWORD`
- **Description:** OBS WebSocket password (if set)
- **Default value:** Leave empty if no password is configured
- **How to get it:** From OBS → Tools → WebSocket Server Settings

### Worker URL Secret

#### `VITE_WORKER_URL`
- **Description:** Your deployed Cloudflare Worker URL
- **Example:** `https://tournament-worker.your-account.workers.dev`
- **How to get it:**
  1. After first worker deployment, Wrangler will output the URL
  2. Or find it in Cloudflare Dashboard → Workers & Pages → your worker

#### `VITE_TOURNAMENT_ID` (Optional)
- **Description:** Default tournament ID to skip selection
- **Default value:** Leave empty to show tournament selector

---

## Alternative Deployment Platforms

If you're deploying the frontend to Vercel or Netlify instead of Cloudflare Pages, you'll need these additional secrets:

### Vercel (Optional)

#### `VERCEL_TOKEN`
- **How to get it:** Vercel Dashboard → Settings → Tokens

#### `VERCEL_ORG_ID`
- **How to get it:** Vercel project settings

#### `VERCEL_PROJECT_ID`
- **How to get it:** Vercel project settings

### Netlify (Optional)

#### `NETLIFY_AUTH_TOKEN`
- **How to get it:** Netlify Dashboard → User Settings → Applications → Personal access tokens

#### `NETLIFY_SITE_ID`
- **How to get it:** Netlify site settings → General → Site details → API ID

---

## Environments

The workflows use a GitHub environment called `production`. To set this up:

1. Go to repository Settings → Environments
2. Click "New environment"
3. Name it `production`
4. Optionally add protection rules (e.g., require approval before deployment)

---

## Local Development

For local development, copy `.env.template` to `.env` and fill in your values:

```bash
cp .env.template .env
# Edit .env with your local credentials
```

The `.env` file is gitignored and will never be committed to the repository.

---

## Security Notes

- **Never commit secrets to git**
- All `.env` and `.env.*` files are gitignored
- GitHub secrets are encrypted and only accessible to workflows
- Rotate API tokens periodically
- Use environment-specific tokens when possible (dev vs. production)
