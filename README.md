# actfit

A single-file Strava dashboard — connect your account, see your running & cycling stats, no server-side storage.

**Live:** https://cyresh.github.io/actfit/

## Stage 1 setup (auth shell)

### 1. Strava API app
Already registered:
- Client ID: `266170`
- Callback domain must be set to: `cyresh.github.io` (no `https://`, no path)
  → Strava settings: https://www.strava.com/settings/api

### 2. Deploy the OAuth worker
```bash
npm install -g wrangler
wrangler login

cd actfit
wrangler secret put STRAVA_CLIENT_ID
# paste: 266170

wrangler secret put STRAVA_CLIENT_SECRET
# paste your client secret from the Strava API settings page

wrangler deploy
```
This prints a URL like `https://actfit-oauth.<your-subdomain>.workers.dev`.

### 3. Point the frontend at the worker
In `index.html`, update:
```js
WORKER_URL: "https://actfit-oauth.<your-subdomain>.workers.dev",
```

### 4. Enable GitHub Pages
Repo → Settings → Pages → Deploy from branch → `main` / root.

### 5. Test
Visit `https://cyresh.github.io/actfit/`, click **Connect with Strava**, authorize, and you should land back on a connected-state card showing your profile.

## Files
- `index.html` — the whole frontend (Stage 1: auth shell only)
- `worker.js` — Cloudflare Worker, handles token exchange/refresh so the client secret never reaches the browser
- `wrangler.toml` — worker config

## Roadmap
- Stage 2: activity fetch + local cache
- Stage 3: overview dashboard (distance/elevation/time, sport filter)
- Stage 4: trend charts + heatmap
- Stage 5: personal records + route map
- Stage 6: polish (shareable card, theme toggle, mobile pass)

## Security note
If a client secret is ever pasted somewhere it shouldn't be (chat, screenshot, commit), regenerate it immediately from the Strava API settings page — old one is dead the moment you do.
